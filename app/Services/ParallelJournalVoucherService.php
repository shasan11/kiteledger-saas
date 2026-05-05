<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class ParallelJournalVoucherService
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected LedgerValidationService $validationService,
        protected AccountingAccountResolverService $accountResolver,
    ) {
    }

    public function createForApprovedSource(Model $source): ?JournalVoucher
    {
        if (!$source->approved) {
            return null;
        }

        // Idempotency: skip if source already linked to a JV
        if (isset($source->journal_voucher_id) && $source->journal_voucher_id) {
            return null;
        }

        $sourceType = class_basename($source);

        if ($this->alreadyExists($sourceType, $source->id)) {
            return null;
        }

        return DB::transaction(function () use ($source, $sourceType) {
            return match ($sourceType) {
                'Invoice' => $this->createForInvoice($source),
                'CustomerPayment' => $this->createForCustomerPayment($source),
                'PurchaseBill' => $this->createForPurchaseBill($source),
                'SupplierPayment' => $this->createForSupplierPayment($source),
                'Expense' => $this->createForExpense($source),
                'CashTransfer' => $this->createForCashTransfer($source),
                'SalesReturn' => $this->createForSalesReturn($source),
                'DebitNote' => $this->createForDebitNote($source),
                'InventoryAdjustment' => $this->createForInventoryAdjustment($source),
                'LoanTopUp' => $this->createForLoanTopUp($source),
                'LoanCharge' => $this->createForLoanCharge($source),
                default => null,
            };
        });
    }

    public function createForInvoice($invoice): JournalVoucher
    {
        $lines = [];
        $totalDebit = 0;

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($invoice->contact_id && $invoice->contact?->account_id) {
            $arAccount = $invoice->contact->account->chartOfAccount ?? $arAccount;
        }

        foreach ($invoice->invoiceLines as $line) {
            $totalDebit += $line->line_total;
        }

        $lines[] = [
            'chart_of_account_id' => $arAccount->id,
            'debit' => $totalDebit,
            'credit' => 0,
            'description' => "Invoice {$invoice->invoice_no}",
        ];

        foreach ($invoice->invoiceLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            if ($line->product_id && $line->product?->sales_account_id) {
                $salesAccount = ChartOfAccount::find($line->product->sales_account_id);
            }

            $lines[] = [
                'chart_of_account_id' => $salesAccount->id,
                'debit' => 0,
                'credit' => $line->line_total - ($line->tax_amount ?? 0),
                'description' => $line->product?->name ?? 'Sales',
            ];
        }

        if ($totalTax = $invoice->invoiceLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $lines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => 0,
                'credit' => $totalTax,
                'description' => 'Tax Payable',
            ];
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $invoice,
            $lines,
            $invoice->invoice_date,
            'Invoice',
            $invoice->id,
            $invoice->invoice_no,
            $invoice->branch_id,
            $invoice->currency_id,
        );
    }

    public function createForCustomerPayment($payment): JournalVoucher
    {
        $lines = [];

        $bankAccount = $payment->account_id
            ? $this->resolveChartOfAccountFromAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $lines[] = [
            'chart_of_account_id' => $bankAccount->id,
            'debit' => $payment->amount,
            'credit' => 0,
            'description' => "Payment received from {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'chart_of_account_id' => $bankChargesAccount->id,
                'debit' => $payment->bank_charges,
                'credit' => 0,
                'description' => 'Bank Charges',
            ];
        }

        if ($payment->tds_charges > 0) {
            $tdsReceivableAccount = $this->accountResolver->getTdsReceivableAccount();
            $lines[] = [
                'chart_of_account_id' => $tdsReceivableAccount->id,
                'debit' => $payment->tds_charges,
                'credit' => 0,
                'description' => 'TDS Receivable',
            ];
        }

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($payment->contact_id && $payment->contact?->account_id) {
            $arAccount = $payment->contact->account->chartOfAccount ?? $arAccount;
        }

        $totalCredit = $payment->amount + ($payment->bank_charges ?? 0) + ($payment->tds_charges ?? 0);
        $lines[] = [
            'chart_of_account_id' => $arAccount->id,
            'debit' => 0,
            'credit' => $totalCredit,
            'description' => "AR reduction from {$payment->contact?->name}",
        ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $payment,
            $lines,
            $payment->payment_date ?? now(),
            'CustomerPayment',
            $payment->id,
            $payment->payment_no,
            $payment->branch_id,
            $payment->currency_id,
        );
    }

    public function createForPurchaseBill($bill): JournalVoucher
    {
        $lines = [];
        $totalDebit = 0;

        foreach ($bill->purchaseBillLines as $line) {
            $totalDebit += $line->line_total;
        }

        foreach ($bill->purchaseBillLines as $line) {
            $account = $this->accountResolver->getPurchaseExpenseAccount();
            if ($line->product_id && $line->product?->purchase_account_id) {
                $account = ChartOfAccount::find($line->product->purchase_account_id);
            }

            $lines[] = [
                'chart_of_account_id' => $account->id,
                'debit' => $line->line_total - ($line->tax_amount ?? 0),
                'credit' => 0,
                'description' => $line->product?->name ?? 'Purchase',
            ];
        }

        if ($totalTax = $bill->purchaseBillLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxReceivableAccount();
            $lines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => $totalTax,
                'credit' => 0,
                'description' => 'Tax Receivable',
            ];
        }

        $apAccount = $this->accountResolver->getAccountsPayableAccount();
        if ($bill->contact_id && $bill->contact?->account_id) {
            $apAccount = $bill->contact->account->chartOfAccount ?? $apAccount;
        }

        $lines[] = [
            'chart_of_account_id' => $apAccount->id,
            'debit' => 0,
            'credit' => $totalDebit,
            'description' => "AP increase to {$bill->contact?->name}",
        ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $bill,
            $lines,
            $bill->bill_date,
            'PurchaseBill',
            $bill->id,
            $bill->bill_no,
            $bill->branch_id,
            $bill->currency_id,
        );
    }

    public function createForSupplierPayment($payment): JournalVoucher
    {
        $lines = [];

        $apAccount = $this->accountResolver->getAccountsPayableAccount();
        if ($payment->contact_id && $payment->contact?->account_id) {
            $apAccount = $payment->contact->account->chartOfAccount ?? $apAccount;
        }

        $lines[] = [
            'chart_of_account_id' => $apAccount->id,
            'debit' => $payment->amount,
            'credit' => 0,
            'description' => "Payment to {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'chart_of_account_id' => $bankChargesAccount->id,
                'debit' => $payment->bank_charges,
                'credit' => 0,
                'description' => 'Bank Charges',
            ];
        }

        $bankAccount = $payment->account_id
            ? $this->resolveChartOfAccountFromAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $totalCredit = $payment->amount + ($payment->bank_charges ?? 0);
        $lines[] = [
            'chart_of_account_id' => $bankAccount->id,
            'debit' => 0,
            'credit' => $totalCredit,
            'description' => 'Bank Debit',
        ];

        if (!empty($payment->tds_charges) && $payment->tds_charges > 0) {
            $tdsPayableAccount = $this->accountResolver->getTdsPayableAccount();
            $lines[] = [
                'chart_of_account_id' => $tdsPayableAccount->id,
                'debit' => 0,
                'credit' => $payment->tds_charges,
                'description' => 'TDS Payable',
            ];
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $payment,
            $lines,
            $payment->payment_date ?? now(),
            'SupplierPayment',
            $payment->id,
            $payment->payment_no,
            $payment->branch_id,
            $payment->currency_id,
        );
    }

    public function createForExpense($expense): JournalVoucher
    {
        $lines = [];
        $totalDebit = 0;

        foreach ($expense->expenseLines as $line) {
            $totalDebit += $line->line_total;
            $account = ChartOfAccount::find($line->chart_of_account_id);

            $lines[] = [
                'chart_of_account_id' => $account->id,
                'debit' => $line->line_total,
                'credit' => 0,
                'description' => $line->description ?? 'Expense',
            ];
        }

        // Expenses have no paid_from_account_id column — credit AP if supplier, else cash
        if ($expense->contact_id) {
            $creditAccount = $this->accountResolver->getAccountsPayableAccount();
            if ($expense->contact?->account_id) {
                $creditAccount = $expense->contact->account->chartOfAccount ?? $creditAccount;
            }
        } else {
            $creditAccount = $this->accountResolver->getCashAccount();
        }

        $lines[] = [
            'chart_of_account_id' => $creditAccount->id,
            'debit' => 0,
            'credit' => $totalDebit,
            'description' => 'Payment',
        ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $expense,
            $lines,
            $expense->expense_date ?? now(),
            'Expense',
            $expense->id,
            $expense->expense_no,
            $expense->branch_id,
            $expense->currency_id,
        );
    }

    public function createForCashTransfer($transfer): JournalVoucher
    {
        $lines = [];

        // from_account_id is on the header (cash_transfers), to_account_id is on each line (cash_transfer_lines)
        // Both are FKs to accounts table — resolve ChartOfAccount via the account relationship
        $fromCoa = $this->resolveChartOfAccountFromAccount($transfer->from_account_id);

        foreach ($transfer->cashTransferLines as $line) {
            $toCoa = $this->resolveChartOfAccountFromAccount($line->to_account_id);

            $lines[] = [
                'chart_of_account_id' => $toCoa->id,
                'debit' => $line->amount,
                'credit' => 0,
                'description' => 'Transfer In',
            ];

            $lines[] = [
                'chart_of_account_id' => $fromCoa->id,
                'debit' => 0,
                'credit' => $line->amount,
                'description' => 'Transfer Out',
            ];
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $transfer,
            $lines,
            $transfer->transfer_date ?? now(),
            'CashTransfer',
            $transfer->id,
            $transfer->transfer_no,
            $transfer->branch_id,
            $transfer->currency_id,
        );
    }

    public function createForSalesReturn($return): JournalVoucher
    {
        $lines = [];
        $totalCredit = 0;

        foreach ($return->salesReturnLines as $line) {
            $totalCredit += $line->line_total;
        }

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($return->contact_id && $return->contact?->account_id) {
            $arAccount = $return->contact->account->chartOfAccount ?? $arAccount;
        }

        $lines[] = [
            'chart_of_account_id' => $arAccount->id,
            'debit' => 0,
            'credit' => $totalCredit,
            'description' => "Sales Return {$return->sales_return_no}",
        ];

        foreach ($return->salesReturnLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            $lines[] = [
                'chart_of_account_id' => $salesAccount->id,
                'debit' => $line->line_total - ($line->tax_amount ?? 0),
                'credit' => 0,
                'description' => 'Sales Return',
            ];
        }

        if ($totalTax = $return->salesReturnLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $lines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => 0,
                'credit' => $totalTax,
                'description' => 'Tax Reversal',
            ];
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $return,
            $lines,
            $return->sales_return_date ?? now(),
            'SalesReturn',
            $return->id,
            $return->sales_return_no,
            $return->branch_id,
            $return->currency_id,
        );
    }

    public function createForDebitNote($debitNote): JournalVoucher
    {
        $lines = [];
        $totalCredit = 0;

        foreach ($debitNote->debitNoteLines as $line) {
            $totalCredit += $line->line_total;
        }

        $apAccount = $this->accountResolver->getAccountsPayableAccount();
        if ($debitNote->contact_id && $debitNote->contact?->account_id) {
            $apAccount = $debitNote->contact->account->chartOfAccount ?? $apAccount;
        }

        $lines[] = [
            'chart_of_account_id' => $apAccount->id,
            'debit' => $totalCredit,
            'credit' => 0,
            'description' => "Debit Note {$debitNote->debit_note_no}",
        ];

        foreach ($debitNote->debitNoteLines as $line) {
            $purchaseAccount = $this->accountResolver->getPurchaseExpenseAccount();
            $lines[] = [
                'chart_of_account_id' => $purchaseAccount->id,
                'debit' => 0,
                'credit' => $line->line_total - ($line->tax_amount ?? 0),
                'description' => 'Purchase Reversal',
            ];
        }

        if ($totalTax = $debitNote->debitNoteLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxReceivableAccount();
            $lines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => 0,
                'credit' => $totalTax,
                'description' => 'Tax Reversal',
            ];
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $debitNote,
            $lines,
            $debitNote->debit_note_date ?? now(),
            'DebitNote',
            $debitNote->id,
            $debitNote->debit_note_no,
            $debitNote->branch_id,
            $debitNote->currency_id,
        );
    }

    public function createForInventoryAdjustment($adjustment): JournalVoucher
    {
        $lines = [];

        foreach ($adjustment->inventoryAdjustmentLines as $line) {
            if ($line->adjustment_type === 'increase') {
                $inventoryAccount = $this->accountResolver->getInventoryAccount();
                $gainAccount = $this->accountResolver->getInventoryAdjustmentGainAccount();

                $lines[] = [
                    'chart_of_account_id' => $inventoryAccount->id,
                    'debit' => $line->adjustment_value,
                    'credit' => 0,
                    'description' => 'Inventory Increase',
                ];

                $lines[] = [
                    'chart_of_account_id' => $gainAccount->id,
                    'debit' => 0,
                    'credit' => $line->adjustment_value,
                    'description' => 'Gain on Adjustment',
                ];
            } else {
                $inventoryAccount = $this->accountResolver->getInventoryAccount();
                $lossAccount = $this->accountResolver->getInventoryAdjustmentLossAccount();

                $lines[] = [
                    'chart_of_account_id' => $lossAccount->id,
                    'debit' => $line->adjustment_value,
                    'credit' => 0,
                    'description' => 'Loss on Adjustment',
                ];

                $lines[] = [
                    'chart_of_account_id' => $inventoryAccount->id,
                    'debit' => 0,
                    'credit' => $line->adjustment_value,
                    'description' => 'Inventory Decrease',
                ];
            }
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $adjustment,
            $lines,
            $adjustment->adjustment_date ?? now(),
            'InventoryAdjustment',
            $adjustment->id,
            $adjustment->adjustment_no,
            $adjustment->branch_id,
            $adjustment->currency_id,
        );
    }

    public function createForLoanTopUp($topUp): JournalVoucher
    {
        // loan_received_in_account_id is FK to accounts table, not chart_of_accounts
        $receivedCoa = $this->resolveChartOfAccountFromAccount($topUp->loan_received_in_account_id);

        // loanAccount->related_account_id is also FK to accounts
        $loanCoa = $topUp->loanAccount?->related_account_id
            ? $this->resolveChartOfAccountFromAccount($topUp->loanAccount->related_account_id)
            : $this->accountResolver->getLoanPayableAccount();

        $lines = [
            [
                'chart_of_account_id' => $receivedCoa->id,
                'debit' => $topUp->amount,
                'credit' => 0,
                'description' => 'Loan Received',
            ],
            [
                'chart_of_account_id' => $loanCoa->id,
                'debit' => 0,
                'credit' => $topUp->amount,
                'description' => 'Loan Increase',
            ],
        ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $topUp,
            $lines,
            $topUp->topup_date,
            'LoanTopUp',
            $topUp->id,
            $topUp->topup_no,
            null,
            null,
        );
    }

    public function createForLoanCharge($charge): JournalVoucher
    {
        $chargeAccount = $this->accountResolver->getLoanInterestExpenseAccount();
        if (str_contains(strtolower($charge->charge_name), 'processing')) {
            $chargeAccount = $this->accountResolver->getProcessingFeeExpenseAccount();
        }

        // charges_paid_from_account_id is FK to accounts table, not chart_of_accounts
        $paidCoa = $this->resolveChartOfAccountFromAccount($charge->charges_paid_from_account_id);

        $lines = [
            [
                'chart_of_account_id' => $chargeAccount->id,
                'debit' => $charge->amount,
                'credit' => 0,
                'description' => $charge->charge_name,
            ],
            [
                'chart_of_account_id' => $paidCoa->id,
                'debit' => 0,
                'credit' => $charge->amount,
                'description' => 'Charge Payment',
            ],
        ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $charge,
            $lines,
            $charge->charge_date,
            'LoanCharge',
            $charge->id,
            $charge->charge_no,
            null,
            null,
        );
    }

    public function reverseForSource(Model $source, ?string $reason = null): ?JournalVoucher
    {
        $sourceType = class_basename($source);

        $original = JournalVoucher::where('source_type', $sourceType)
            ->where('source_id', $source->id)
            ->first();

        if (!$original) {
            return null;
        }

        return DB::transaction(function () use ($original, $reason) {
            $lines = [];

            foreach ($original->journalVoucherLines as $line) {
                $lines[] = [
                    'chart_of_account_id' => $line->chart_of_account_id,
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'description' => $line->description,
                ];
            }

            $reversal = $this->createJournal(
                null,
                $lines,
                now()->toDateString(),
                'JournalVoucher',
                null,
                null,
                $original->branch_id,
                $original->currency_id,
            );

            $reversal->update([
                'source_type' => 'JournalVoucher',
                'source_id' => $original->id,
                'source_no' => $original->voucher_no,
                'source_module' => 'Reversal',
                'reversed_journal_voucher_id' => $original->id,
                'reversal_reason' => $reason,
                'reversed_at' => now(),
            ]);

            return $reversal;
        });
    }

    protected function alreadyExists(string $sourceType, string $sourceId): bool
    {
        return JournalVoucher::where('source_type', $sourceType)
            ->where('source_id', $sourceId)
            ->exists();
    }

    /**
     * Resolves a ChartOfAccount via its linked Account record.
     * Used when the FK points to the accounts table, not chart_of_accounts.
     */
    protected function resolveChartOfAccountFromAccount(string $accountId): ChartOfAccount
    {
        $account = Account::findOrFail($accountId);
        $coa = ChartOfAccount::where('account_id', $account->id)->first();

        if (!$coa) {
            throw new \RuntimeException("No ChartOfAccount linked to Account [{$account->id}] ({$account->name})");
        }

        return $coa;
    }

    protected function createJournal(
        ?Model $sourceModel,
        array $lines,
        $date,
        string $sourceType,
        ?string $sourceId,
        ?string $sourceNo,
        ?string $branchId,
        ?string $currencyId,
    ): JournalVoucher {
        $voucher = new JournalVoucher([
            'voucher_date' => $date,
            'source_type' => $sourceType,
            'source_id' => $sourceId,
            'source_no' => $sourceNo,
            'source_module' => $sourceType,
            'is_auto_generated' => true,
            'branch_id' => $branchId,
            'currency_id' => $currencyId ?? Currency::where('is_base', true)->first()?->id,
            'status' => 'posted',
            'active' => true,
            'approved' => true,
            'approved_at' => now(),
        ]);

        $voucher->voucher_no = $this->numberingService->generate('journal_voucher');

        $totalDebit = collect($lines)->sum('debit');
        $voucher->total = $totalDebit;

        $voucher->saveQuietly();

        foreach ($lines as $line) {
            JournalVoucherLine::create([
                'journal_voucher_id' => $voucher->id,
                'chart_of_account_id' => $line['chart_of_account_id'],
                'debit' => $line['debit'],
                'credit' => $line['credit'],
                'description' => $line['description'] ?? null,
            ]);
        }

        // Link source model back to this JV
        if ($sourceModel !== null && $sourceId && isset($sourceModel->journal_voucher_id)) {
            $sourceModel->forceFill(['journal_voucher_id' => $voucher->id])->saveQuietly();
        }

        return $voucher->refresh();
    }
}
