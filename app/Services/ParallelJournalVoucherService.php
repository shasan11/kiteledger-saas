<?php

namespace App\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Domain\Accounting\Services\JournalVoucherService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class ParallelJournalVoucherService
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected LedgerValidationService $validationService,
        protected AccountingAccountResolverService $accountResolver,
        protected JournalVoucherService $journalVoucherService,
    ) {
    }

    public function createForApprovedSource(Model $source): ?JournalVoucher
    {
        if (!(bool) ($source->approved ?? false) || (bool) ($source->void ?? false)) {
            return null;
        }

        $sourceType = class_basename($source);

        return DB::transaction(function () use ($source, $sourceType) {
            return match ($sourceType) {
                'Invoice' => $this->createForInvoice($source),
                'CustomerPayment' => $this->createForCustomerPayment($source),
                'PurchaseBill' => $this->createForPurchaseBill($source),
                'SupplierPayment' => $this->createForSupplierPayment($source),
                'Expense' => $this->createForExpense($source),
                'CashTransfer' => $this->createForCashTransfer($source),
                'ChequeRegister' => $this->createForChequeRegister($source),
                'SalesReturn' => $this->createForSalesReturn($source),
                'DebitNote' => $this->createForDebitNote($source),
                'InventoryAdjustment' => $this->createForInventoryAdjustment($source),
                'ProductionOrder' => $this->createForProductionOrder($source),
                'ProductionJournal' => $this->createForProductionJournal($source),
                'LoanTopUp' => $this->createForLoanTopUp($source),
                'LoanCharge' => $this->createForLoanCharge($source),
                default => null,
            };
        });
    }

    public function createForInvoice($invoice): JournalVoucher
    {
        $rate = $this->resolveJournalExchangeRate($invoice, $invoice->currency_id);
        $creditLines = [];

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($invoice->contact_id && $invoice->contact?->account_id) {
            $arAccount = $this->resolveChartAccount($invoice->contact->account_id, $arAccount);
        }

        foreach ($invoice->invoiceLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            if ($line->product_id && $line->product?->sales_account_id) {
                $salesAccount = ChartOfAccount::find($line->product->sales_account_id);
            }

            $creditLines[] = [
                'chart_of_account_id' => $salesAccount->id,
                'debit' => 0,
                'credit' => round($this->convertToBase($line->line_total - ($line->tax_amount ?? 0), $rate), 2),
                'description' => $line->product?->name ?? 'Sales',
            ];
        }

        if ($totalTax = $invoice->invoiceLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $creditLines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => 0,
                'credit' => round($this->convertToBase($totalTax, $rate), 2),
                'description' => 'Tax Payable',
            ];
        }

        $totalCredit = round(array_sum(array_column($creditLines, 'credit')), 2);

        $lines = array_merge(
            [
                [
                    'chart_of_account_id' => $arAccount->id,
                    'debit' => $totalCredit,
                    'credit' => 0,
                    'description' => "Invoice {$invoice->invoice_no}",
                ],
            ],
            $creditLines
        );

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
        $rate = $this->resolveJournalExchangeRate($payment, $payment->currency_id);
        $lines = [];

        $bankAccount = $payment->account_id
            ? $this->resolveChartAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $lines[] = [
            'chart_of_account_id' => $bankAccount->id,
            'debit' => round($this->convertToBase($payment->amount, $rate), 2),
            'credit' => 0,
            'description' => "Payment received from {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $payment->bank_charges_account_id
                ? $this->resolveChartAccount($payment->bank_charges_account_id)
                : $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'chart_of_account_id' => $bankChargesAccount->id,
                'debit' => round($this->convertToBase($payment->bank_charges, $rate), 2),
                'credit' => 0,
                'description' => 'Bank Charges',
            ];
        }

        if ($payment->tds_charges > 0) {
            $tdsReceivableAccount = $payment->tds_charges_account_id
                ? $this->resolveChartAccount($payment->tds_charges_account_id)
                : $this->accountResolver->getTdsReceivableAccount();
            $lines[] = [
                'chart_of_account_id' => $tdsReceivableAccount->id,
                'debit' => round($this->convertToBase($payment->tds_charges, $rate), 2),
                'credit' => 0,
                'description' => 'TDS Receivable',
            ];
        }

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($payment->contact_id && $payment->contact?->account_id) {
            $arAccount = $this->resolveChartAccount($payment->contact->account_id, $arAccount);
        }

        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);

        $lines[] = [
            'chart_of_account_id' => $arAccount->id,
            'debit' => 0,
            'credit' => $totalDebit,
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
                $account = $this->resolveChartAccount($line->product->purchase_account_id, $account);
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
            $apAccount = $this->resolveChartAccount($bill->contact->account_id, $apAccount);
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
            $apAccount = $this->resolveChartAccount($payment->contact->account_id, $apAccount);
        }

        $tdsCharges = (float) ($payment->tds_charges ?? 0);

        $lines[] = [
            'chart_of_account_id' => $apAccount->id,
            'debit' => (float) $payment->amount + $tdsCharges,
            'credit' => 0,
            'description' => "Payment to {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $payment->bank_charges_account_id
                ? $this->resolveChartAccount($payment->bank_charges_account_id)
                : $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'chart_of_account_id' => $bankChargesAccount->id,
                'debit' => (float) $payment->bank_charges,
                'credit' => 0,
                'description' => 'Bank Charges',
            ];
        }

        $bankAccount = $payment->account_id
            ? $this->resolveChartAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $totalCredit = (float) $payment->amount + (float) ($payment->bank_charges ?? 0);
        $lines[] = [
            'chart_of_account_id' => $bankAccount->id,
            'debit' => 0,
            'credit' => $totalCredit,
            'description' => 'Bank Debit',
        ];

        if ($tdsCharges > 0) {
            $tdsPayableAccount = $payment->tds_charges_account_id
                ? $this->resolveChartAccount($payment->tds_charges_account_id)
                : $this->accountResolver->getTdsPayableAccount();
            $lines[] = [
                'chart_of_account_id' => $tdsPayableAccount->id,
                'debit' => 0,
                'credit' => $tdsCharges,
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
                $creditAccount = $this->resolveChartAccount($expense->contact->account_id, $creditAccount);
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
        $fromCoa = $this->resolveChartAccount($transfer->from_account_id);

        foreach ($transfer->cashTransferLines as $line) {
            $toCoa = $this->resolveChartAccount($line->to_account_id);

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

    public function createForChequeRegister($cheque): JournalVoucher
    {
        $bankAccount = $this->resolveChartAccount($cheque->account_id);
        $relatedAccountId = $cheque->direction === 'received'
            ? ($cheque->receiver_related_account_id ?: $cheque->related_account_id)
            : $cheque->related_account_id;
        $relatedAccount = $this->resolveChartAccount($relatedAccountId);

        $amount = (float) $cheque->amount;

        $lines = $cheque->direction === 'received'
            ? [
                [
                    'chart_of_account_id' => $bankAccount->id,
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => "Cheque received {$cheque->cheque_no}",
                ],
                [
                    'chart_of_account_id' => $relatedAccount->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => "Cheque received from {$cheque->payee_name}",
                ],
            ]
            : [
                [
                    'chart_of_account_id' => $relatedAccount->id,
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => "Cheque issued to {$cheque->payee_name}",
                ],
                [
                    'chart_of_account_id' => $bankAccount->id,
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => "Cheque issued {$cheque->cheque_no}",
                ],
            ];

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $cheque,
            $lines,
            $cheque->cleared_date ?? $cheque->issued_date ?? $cheque->received_date ?? $cheque->cheque_date ?? now(),
            'ChequeRegister',
            $cheque->id,
            $cheque->cheque_no,
            $cheque->branch_id,
            null,
        );
    }

    public function createForSalesReturn($return): JournalVoucher
    {
        $rate = $this->resolveJournalExchangeRate($return, $return->currency_id);
        $debitLines = [];

        foreach ($return->salesReturnLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            $debitLines[] = [
                'chart_of_account_id' => $salesAccount->id,
                'debit' => round($this->convertToBase($line->line_total - ($line->tax_amount ?? 0), $rate), 2),
                'credit' => 0,
                'description' => 'Sales Return',
            ];
        }

        if ($totalTax = $return->salesReturnLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $debitLines[] = [
                'chart_of_account_id' => $taxAccount->id,
                'debit' => round($this->convertToBase($totalTax, $rate), 2),
                'credit' => 0,
                'description' => 'Tax Reversal',
            ];
        }

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($return->contact_id && $return->contact?->account_id) {
            $arAccount = $this->resolveChartAccount($return->contact->account_id, $arAccount);
        }

        $totalDebit = round(array_sum(array_column($debitLines, 'debit')), 2);

        $lines = array_merge(
            [
                [
                    'chart_of_account_id' => $arAccount->id,
                    'debit' => 0,
                    'credit' => $totalDebit,
                    'description' => "Sales Return {$return->sales_return_no}",
                ],
            ],
            $debitLines
        );

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
            $apAccount = $this->resolveChartAccount($debitNote->contact->account_id, $apAccount);
        }

        $lines[] = [
            'chart_of_account_id' => $apAccount->id,
            'debit' => $totalCredit,
            'credit' => 0,
            'description' => "Debit Note {$debitNote->debit_note_no}",
        ];

        foreach ($debitNote->debitNoteLines as $line) {
            $purchaseAccount = $this->accountResolver->getPurchaseExpenseAccount();
            $productAccountId = $line->product?->purchase_return_account_id
                ?: $line->product?->purchase_account_id;

            if ($productAccountId) {
                $purchaseAccount = $this->resolveChartAccount($productAccountId, $purchaseAccount);
            }

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

    public function createForProductionJournal($journal): JournalVoucher
    {
        $lines = [];
        $inventoryAccount = $this->accountResolver->getInventoryAccount();

        if ((float) $journal->finished_goods_cost > 0) {
            $finishedAccount = $journal->finishedProduct?->purchase_account_id
                ? ChartOfAccount::find($journal->finishedProduct->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $finishedAccount?->id ?? $inventoryAccount->id,
                'debit' => (float) $journal->finished_goods_cost,
                'credit' => 0,
                'description' => 'Finished goods produced',
            ];
        }

        foreach ($journal->byProducts as $line) {
            if ((float) $line->allocated_cost <= 0) {
                continue;
            }

            $byProductAccount = $line->product?->purchase_account_id
                ? ChartOfAccount::find($line->product->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $byProductAccount?->id ?? $inventoryAccount->id,
                'debit' => (float) $line->allocated_cost,
                'credit' => 0,
                'description' => 'By-product produced',
            ];
        }

        foreach ($journal->rawMaterials as $line) {
            if ((float) $line->amount <= 0) {
                continue;
            }

            $rawAccount = $line->product?->purchase_account_id
                ? ChartOfAccount::find($line->product->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $rawAccount?->id ?? $inventoryAccount->id,
                'debit' => 0,
                'credit' => (float) $line->amount,
                'description' => 'Raw material consumed',
            ];
        }

        if ((float) $journal->production_expense_amount > 0) {
            $expenseAccount = $this->accountResolver->getPurchaseExpenseAccount();

            foreach ($journal->productionExpenses as $expense) {
                if ((float) $expense->amount <= 0) {
                    continue;
                }

                $account = $expense->costTerm?->chart_of_account_id
                    ? ChartOfAccount::find($expense->costTerm->chart_of_account_id)
                    : $expenseAccount;

                $lines[] = [
                    'chart_of_account_id' => $account?->id ?? $expenseAccount->id,
                    'debit' => 0,
                    'credit' => (float) $expense->amount,
                    'description' => $expense->costTerm?->name ?? 'Production expense absorbed',
                ];
            }
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $journal,
            $lines,
            $journal->date ?? now(),
            'ProductionJournal',
            $journal->id,
            $journal->code,
            $journal->branch_id,
            null,
        );
    }

    public function createForProductionOrder($order): ?JournalVoucher
    {
        $lines = [];
        $inventoryAccount = $this->accountResolver->getInventoryAccount();

        if ((float) $order->total_finished_goods_cost > 0) {
            $finishedAccount = $order->finishedProduct?->purchase_account_id
                ? ChartOfAccount::find($order->finishedProduct->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $finishedAccount?->id ?? $inventoryAccount->id,
                'debit' => (float) $order->total_finished_goods_cost,
                'credit' => 0,
                'description' => 'Finished goods produced',
            ];
        }

        foreach ($order->byproducts as $line) {
            if ((float) $line->allocated_cost <= 0) {
                continue;
            }

            $account = $line->product?->purchase_account_id
                ? ChartOfAccount::find($line->product->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $account?->id ?? $inventoryAccount->id,
                'debit' => (float) $line->allocated_cost,
                'credit' => 0,
                'description' => 'By-product produced',
            ];
        }

        foreach ($order->rawMaterials as $line) {
            if ((float) $line->total_cost <= 0) {
                continue;
            }

            $account = $line->product?->purchase_account_id
                ? ChartOfAccount::find($line->product->purchase_account_id)
                : $inventoryAccount;

            $lines[] = [
                'chart_of_account_id' => $account?->id ?? $inventoryAccount->id,
                'debit' => 0,
                'credit' => (float) $line->total_cost,
                'description' => 'Raw material consumed',
            ];
        }

        foreach ($order->expenses as $expense) {
            if ((float) $expense->amount <= 0) {
                continue;
            }

            $account = $expense->expense_account_id
                ? ChartOfAccount::find($expense->expense_account_id)
                : $this->accountResolver->getPurchaseExpenseAccount();

            $lines[] = [
                'chart_of_account_id' => $account->id,
                'debit' => 0,
                'credit' => (float) $expense->amount,
                'description' => $expense->name ?: 'Production expense absorbed',
            ];
        }

        if (empty($lines)) {
            return null;
        }

        $this->validationService->validateBalanced($lines);

        return $this->createJournal(
            $order,
            $lines,
            $order->date ?? now(),
            'ProductionOrder',
            $order->id,
            $order->code,
            $order->branch_id,
            null,
        );
    }

    public function createForLoanTopUp($topUp): JournalVoucher
    {
        // loan_received_in_account_id is FK to accounts table, not chart_of_accounts
        $receivedCoa = $this->resolveChartAccount($topUp->loan_received_in_account_id);

        // loanAccount->related_account_id is also FK to accounts
        $loanCoa = $topUp->loanAccount?->related_account_id
            ? $this->resolveChartAccount($topUp->loanAccount->related_account_id)
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
        $paidCoa = $this->resolveChartAccount($charge->charges_paid_from_account_id);

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
        $original = $this->findExistingJournal($source, class_basename($source));

        if (!$original) {
            return null;
        }

        if ((bool) ($original->void ?? false)) {
            return $original->fresh(['journalVoucherLines']);
        }

        return $this->journalVoucherService->void(
            $original,
            $reason ?: 'Source transaction voided',
            request()->user()?->getAuthIdentifier()
        );
    }

    protected function resolveChartAccount(?string $accountOrChartId, ?ChartOfAccount $fallback = null): ChartOfAccount
    {
        if (!$accountOrChartId) {
            return $fallback ?: $this->accountResolver->getDefaultBankAccount();
        }

        $chartAccount = ChartOfAccount::find($accountOrChartId);
        if ($chartAccount) {
            return $this->ensureChartAccountIsActive($chartAccount);
        }

        return $this->resolveChartOfAccountFromAccount($accountOrChartId, $fallback);
    }

    protected function resolveChartOfAccountFromAccount(string $accountId, ?ChartOfAccount $fallback = null): ChartOfAccount
    {
        $account = Account::findOrFail($accountId);
        $coa = ChartOfAccount::where('account_id', $account->id)->first();

        if ($coa) {
            return $this->ensureChartAccountIsActive($coa);
        }

        return $this->createLinkedChartAccountForAccount($account, $fallback);
    }

    protected function ensureChartAccountIsActive(ChartOfAccount $chartAccount): ChartOfAccount
    {
        if (! (bool) $chartAccount->active) {
            $chartAccount->forceFill(['active' => true])->saveQuietly();
        }

        return $chartAccount;
    }

    protected function createLinkedChartAccountForAccount(Account $account, ?ChartOfAccount $fallback = null): ChartOfAccount
    {
        $type = $this->chartTypeForAccount($account, $fallback);
        $parent = $this->parentChartAccountForAccount($account, $type, $fallback);
        $code = $account->code && ! ChartOfAccount::where('code', $account->code)->exists()
            ? $account->code
            : null;

        return ChartOfAccount::withoutEvents(function () use ($account, $type, $parent, $code) {
            return ChartOfAccount::create([
                'account_id' => $account->id,
                'branch_id' => null,
                'type' => $type,
                'code' => $code,
                'name' => $account->name,
                'parent_id' => $parent?->id,
                'description' => "Auto-linked chart account for {$account->nature} account.",
                'active' => true,
                'is_system_generated' => (bool) $account->is_system_generated,
                'user_add_id' => auth()->id(),
            ]);
        });
    }

    protected function chartTypeForAccount(Account $account, ?ChartOfAccount $fallback = null): string
    {
        return match ($account->nature) {
            'bank', 'cash' => 'asset',
            'employee' => $fallback?->type ?: 'liability',
            'actor' => $fallback?->type ?: 'asset',
            default => $fallback?->type ?: 'asset',
        };
    }

    protected function parentChartAccountForAccount(Account $account, string $type, ?ChartOfAccount $fallback = null): ?ChartOfAccount
    {
        if ($fallback && $fallback->type === $type) {
            return $fallback;
        }

        return match ($account->nature) {
            'bank' => $this->accountResolver->getDefaultBankAccount(),
            'cash' => $this->accountResolver->getCashAccount(),
            default => null,
        };
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
        return DB::transaction(function () use ($sourceModel, $lines, $date, $sourceType, $sourceId, $sourceNo, $branchId, $currencyId) {
            $this->validationService->validateJournalVoucherLines($lines);

            $voucher = $sourceModel && $sourceId
                ? $this->findExistingJournal($sourceModel, $sourceType)
                : null;

            $oldEffect = $voucher
                ? $this->journalVoucherService->snapshotEffect($voucher->fresh(['journalVoucherLines']))
                : [];

            $payload = $this->journalPayload(
                sourceType: $sourceType,
                sourceId: $sourceId,
                sourceNo: $sourceNo,
                date: $date,
                branchId: $branchId,
                currencyId: $currencyId,
                exchangeRate: $this->resolveJournalExchangeRate($sourceModel, $currencyId),
                total: collect($lines)->sum('debit')
            );

            JournalVoucher::withoutEvents(function () use (&$voucher, $payload) {
                if ($voucher) {
                    $voucher->forceFill($payload)->saveQuietly();
                    return;
                }

                $voucher = JournalVoucher::query()->create(array_merge($payload, [
                    'voucher_no' => $this->numberingService->generate('journal_voucher'),
                ]));
            });

            JournalVoucherLine::withoutEvents(function () use ($voucher, $lines) {
                JournalVoucherLine::query()
                    ->where('journal_voucher_id', $voucher->id)
                    ->delete();

                foreach ($lines as $line) {
                    JournalVoucherLine::query()->create(
                        $this->journalLinePayload(
                            voucherId: $voucher->id,
                            chartOfAccountId: $line['chart_of_account_id'],
                            debit: (float) ($line['debit'] ?? 0),
                            credit: (float) ($line['credit'] ?? 0),
                            description: $line['description'] ?? null
                        )
                    );
                }
            });

            $this->syncSourceBackReference($sourceModel, $voucher);

            $voucher = $voucher->fresh(['journalVoucherLines']);
            $this->journalVoucherService->syncFinancials($voucher, $oldEffect);

            return $voucher->fresh(['journalVoucherLines']);
        });
    }

    protected function findExistingJournal(Model $source, string $sourceType): ?JournalVoucher
    {
        $sourceTable = $source->getTable();

        foreach (['subsequent_journal_voucher_id', 'journal_voucher_id'] as $column) {
            if (Schema::hasColumn($sourceTable, $column) && !empty($source->{$column})) {
                $voucher = JournalVoucher::query()->find($source->{$column});

                if ($voucher) {
                    return $voucher;
                }
            }
        }

        return JournalVoucher::query()
            ->where('source_id', $source->getKey())
            ->whereIn('source_type', array_unique([
                $this->sourceType($sourceType),
                $sourceType,
                class_basename($source),
            ]))
            ->first();
    }

    protected function journalPayload(
        string $sourceType,
        ?string $sourceId,
        ?string $sourceNo,
        mixed $date,
        ?string $branchId,
        ?string $currencyId,
        float $exchangeRate,
        float|int $total
    ): array {
        $currencyId = $currencyId ?? Currency::where('is_base', true)->first()?->id;

        $payload = [
            'voucher_date' => $date,
            'source_type' => $this->sourceType($sourceType),
            'source_id' => $sourceId,
            'source_no' => $sourceNo,
            'source_module' => Str::headline($this->sourceType($sourceType)),
            'is_auto_generated' => true,
            'branch_id' => $branchId,
            'currency_id' => $currencyId,
            'exchange_rate' => $exchangeRate,
            'status' => 'posted',
            'active' => true,
            'approved' => true,
            'approved_at' => now(),
            'void' => false,
            'voided_at' => null,
            'voided_by_id' => null,
            'voided_reason' => null,
            'total' => $total,
        ];

        if (Schema::hasColumn('journal_vouchers', 'is_system_generated')) {
            $payload['is_system_generated'] = true;
        }

        return $payload;
    }

    protected function resolveJournalExchangeRate(?Model $sourceModel, ?string $currencyId): float
    {
        $sourceRate = (float) ($sourceModel?->exchange_rate ?? 0);
        if ($sourceRate > 0) {
            return $sourceRate;
        }

        $currency = $currencyId
            ? Currency::query()->find($currencyId)
            : Currency::query()->where('is_base', true)->first();

        if ($currency?->is_base) {
            return 1;
        }

        $currencyRate = (float) ($currency?->exchange_rate ?? 0);

        return $currencyRate > 0 ? $currencyRate : 1;
    }

    protected function journalLinePayload(
        string $voucherId,
        string $chartOfAccountId,
        float $debit,
        float $credit,
        ?string $description
    ): array {
        $payload = [
            'journal_voucher_id' => $voucherId,
            'chart_of_account_id' => $chartOfAccountId,
            'debit' => $debit,
            'credit' => $credit,
            'description' => $description,
        ];

        if (Schema::hasColumn('journal_voucher_lines', 'account_id')) {
            $payload['account_id'] = ChartOfAccount::query()
                ->whereKey($chartOfAccountId)
                ->value('account_id');
        }

        return $payload;
    }

    protected function syncSourceBackReference(?Model $source, JournalVoucher $voucher): void
    {
        if (!$source) {
            return;
        }

        $table = $source->getTable();

        foreach (['subsequent_journal_voucher_id', 'journal_voucher_id'] as $column) {
            if (Schema::hasColumn($table, $column)) {
                $source->forceFill([$column => $voucher->id])->saveQuietly();
                return;
            }
        }
    }

    protected function sourceType(string $sourceType): string
    {
        return Str::snake($sourceType);
    }

    protected function resolveJournalCurrencyId(?Model $sourceModel, ?string $currencyId): ?string
    {
        return $currencyId
            ?? $sourceModel?->currency_id
            ?? Currency::where('is_base', true)->first()?->id;
    }

    protected function normalizeMoney(float|int|string|null $amount): float
    {
        return (float) ($amount ?? 0);
    }

    protected function convertToBase(float|int|string|null $amount, float $exchangeRate): float
    {
        return $this->normalizeMoney($amount) * $exchangeRate;
    }

    /**
     * Adjusts the largest line on the deficient side by the rounding difference
     * so that total debit equals total credit.
     */
    protected function balanceRoundingDifference(array $lines): array
    {
        $totalDebit = round(array_sum(array_column($lines, 'debit')), 2);
        $totalCredit = round(array_sum(array_column($lines, 'credit')), 2);
        $diff = round($totalDebit - $totalCredit, 2);

        if ($diff === 0.0) {
            return $lines;
        }

        if ($diff > 0) {
            $maxIdx = null;
            $maxVal = -1.0;
            foreach ($lines as $i => $line) {
                if ((float) $line['credit'] > $maxVal) {
                    $maxVal = (float) $line['credit'];
                    $maxIdx = $i;
                }
            }
            if ($maxIdx !== null) {
                $lines[$maxIdx]['credit'] = round((float) $lines[$maxIdx]['credit'] + $diff, 2);
            }
        } else {
            $diff = abs($diff);
            $maxIdx = null;
            $maxVal = -1.0;
            foreach ($lines as $i => $line) {
                if ((float) $line['debit'] > $maxVal) {
                    $maxVal = (float) $line['debit'];
                    $maxIdx = $i;
                }
            }
            if ($maxIdx !== null) {
                $lines[$maxIdx]['debit'] = round((float) $lines[$maxIdx]['debit'] + $diff, 2);
            }
        }

        return $lines;
    }
}
