<?php

namespace App\Services;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
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
    ) {}

    public function createForApprovedSource(Model $source): ?JournalVoucher
    {
        if (! (bool) ($source->approved ?? false) || (bool) ($source->void ?? false)) {
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
        $invoice->loadMissing(['contact', 'invoiceLines.product', 'invoiceLines.taxRate']);

        $rate = $this->resolveJournalExchangeRate($invoice, $invoice->currency_id);
        $creditLines = [];

        $arAccount = $this->accountResolver->getAccountsReceivableAccount();
        if ($invoice->contact_id && $invoice->contact?->account_id) {
            $arAccount = $this->resolveChartAccount($invoice->contact->account_id, $arAccount);
        }

        foreach ($invoice->invoiceLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            if ($line->product_id && $line->product?->sales_account_id) {
                $salesAccount = $this->resolveChartAccount($line->product->sales_account_id, $salesAccount);
            }

            $creditLines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => round($this->convertToBase($line->line_total - ($line->tax_amount ?? 0), $rate), 2),
                'description' => $line->product?->name ?? 'Sales',
            ];
        }

        if ($totalTax = $invoice->invoiceLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $creditLines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => round($this->convertToBase($totalTax, $rate), 2),
                'description' => 'Tax Payable',
            ];
        }

        $totalCredit = round(array_sum(array_column($creditLines, 'credit')), 2);

        $lines = array_merge(
            [
                [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
        $payment->loadMissing(['contact', 'account', 'customerPaymentLines.invoice']);

        $rate = $this->resolveJournalExchangeRate($payment, $payment->currency_id);
        $lines = [];

        $bankAccount = $payment->account_id
            ? $this->resolveChartAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => round($this->convertToBase($payment->amount, $rate), 2),
            'credit' => 0,
            'description' => "Payment received from {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $payment->bank_charges_account_id
                ? $this->resolveChartAccount($payment->bank_charges_account_id)
                : $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
        $arCredit = $this->customerPaymentReceivableBaseAmount($payment, $rate);

        if ($arCredit <= 0) {
            $arCredit = $totalDebit;
        }

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => 0,
            'credit' => $arCredit,
            'foreign_debit' => 0,
            'foreign_credit' => $this->customerPaymentForeignSettledAmount($payment),
            'description' => "AR reduction from {$payment->contact?->name}",
        ];

        $fxDifference = round($totalDebit - $arCredit, 2);

        if ($fxDifference > 0) {
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => $fxDifference,
                'foreign_debit' => 0,
                'foreign_credit' => 0,
                'description' => 'Foreign Exchange Gain',
            ];
        } elseif ($fxDifference < 0) {
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => abs($fxDifference),
                'credit' => 0,
                'foreign_debit' => 0,
                'foreign_credit' => 0,
                'description' => 'Foreign Exchange Loss',
            ];
        }

        $lines = $this->balanceRoundingDifference($lines);
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
        $bill->loadMissing(['contact', 'purchaseBillLines.product', 'purchaseBillLines.taxRate']);

        $rate = $this->resolveJournalExchangeRate($bill, $bill->currency_id);
        $lines = [];
        $totalDebit = 0;

        foreach ($bill->purchaseBillLines as $line) {
            $totalDebit += round($this->convertToBase($line->line_total, $rate), 2);
        }

        foreach ($bill->purchaseBillLines as $line) {
            $account = $this->accountResolver->getPurchaseExpenseAccount();
            if ($line->product_id && $line->product?->purchase_account_id) {
                $account = $this->resolveChartAccount($line->product->purchase_account_id, $account);
            }

            $foreignDebit = (float) $line->line_total - (float) ($line->tax_amount ?? 0);
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => round($this->convertToBase($foreignDebit, $rate), 2),
                'credit' => 0,
                'foreign_debit' => $foreignDebit,
                'foreign_credit' => 0,
                'description' => $line->product?->name ?? 'Purchase',
            ];
        }

        if ($totalTax = $bill->purchaseBillLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxReceivableAccount();
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => round($this->convertToBase($totalTax, $rate), 2),
                'credit' => 0,
                'foreign_debit' => (float) $totalTax,
                'foreign_credit' => 0,
                'description' => 'Tax Receivable',
            ];
        }

        $apAccount = $this->contactPayableChartAccount($bill->contact, $this->accountResolver->getAccountsPayableAccount());

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => 0,
            'credit' => $totalDebit,
            'foreign_debit' => 0,
            'foreign_credit' => (float) $bill->purchaseBillLines->sum('line_total'),
            'description' => "AP increase to {$bill->contact?->name}",
        ];

        $lines = $this->balanceRoundingDifference($lines);
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
        $payment->loadMissing(['contact', 'account', 'supplierPaymentLines.purchaseBill']);

        $rate = $this->resolveJournalExchangeRate($payment, $payment->currency_id);
        $lines = [];

        $apAccount = $this->contactPayableChartAccount($payment->contact, $this->accountResolver->getAccountsPayableAccount());

        $tdsCharges = (float) ($payment->tds_charges ?? 0);
        $foreignApDebit = (float) $payment->amount + $tdsCharges;

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => round($this->convertToBase($foreignApDebit, $rate), 2),
            'credit' => 0,
            'foreign_debit' => $foreignApDebit,
            'foreign_credit' => 0,
            'description' => "Payment to {$payment->contact?->name}",
        ];

        if ($payment->bank_charges > 0) {
            $bankChargesAccount = $payment->bank_charges_account_id
                ? $this->resolveChartAccount($payment->bank_charges_account_id)
                : $this->accountResolver->getBankChargesExpenseAccount();
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => round($this->convertToBase($payment->bank_charges, $rate), 2),
                'credit' => 0,
                'foreign_debit' => (float) $payment->bank_charges,
                'foreign_credit' => 0,
                'description' => 'Bank Charges',
            ];
        }

        $bankAccount = $payment->account_id
            ? $this->resolveChartAccount($payment->account_id)
            : $this->accountResolver->getDefaultBankAccount();

        $foreignBankCredit = (float) $payment->amount + (float) ($payment->bank_charges ?? 0);
        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => 0,
            'credit' => round($this->convertToBase($foreignBankCredit, $rate), 2),
            'foreign_debit' => 0,
            'foreign_credit' => $foreignBankCredit,
            'description' => 'Bank Debit',
        ];

        if ($tdsCharges > 0) {
            $tdsPayableAccount = $payment->tds_charges_account_id
                ? $this->resolveChartAccount($payment->tds_charges_account_id)
                : $this->accountResolver->getTdsPayableAccount();
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => round($this->convertToBase($tdsCharges, $rate), 2),
                'foreign_debit' => 0,
                'foreign_credit' => $tdsCharges,
                'description' => 'TDS Payable',
            ];
        }

        $lines = $this->balanceRoundingDifference($lines);
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
        $expense->loadMissing(['contact', 'expenseLines']);

        $rate = $this->resolveJournalExchangeRate($expense, $expense->currency_id);
        $lines = [];
        $totalDebit = 0;

        foreach ($expense->expenseLines as $line) {
            $baseAmount = round($this->convertToBase($line->line_total, $rate), 2);
            $totalDebit += $baseAmount;
            $account = ChartOfAccount::find($line->chart_of_account_id);

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => $baseAmount,
                'credit' => 0,
                'foreign_debit' => (float) $line->line_total,
                'foreign_credit' => 0,
                'description' => $line->description ?? 'Expense',
            ];
        }

        // Expenses have no paid_from_account_id column; credit AP if supplier, else cash.
        if ($expense->contact_id) {
            $creditAccount = $this->contactPayableChartAccount($expense->contact, $this->accountResolver->getAccountsPayableAccount());
        } else {
            $creditAccount = $this->accountResolver->getCashAccount();
        }

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => 0,
            'credit' => $totalDebit,
            'foreign_debit' => 0,
            'foreign_credit' => (float) $expense->expenseLines->sum('line_total'),
            'description' => 'Payment',
        ];

        $lines = $this->balanceRoundingDifference($lines);
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
        $transfer->loadMissing('cashTransferLines');

        $lines = [];
        $totalBaseAmount = 0.0;

        // from_account_id is on the header (cash_transfers), to_account_id is on each line (cash_transfer_lines)
        // Both are FKs to accounts table; resolve ChartOfAccount via the account relationship.
        $fromCoa = $this->resolveChartAccount($transfer->from_account_id);

        foreach ($transfer->cashTransferLines as $line) {
            $toCoa = $this->resolveChartAccount($line->to_account_id);
            $lineRate = (float) ($line->exchange_rate_to_default ?: $transfer->exchange_rate ?: 1);
            $baseAmount = round($this->convertToBase($line->amount, $lineRate), 2);
            $totalBaseAmount += $baseAmount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => $baseAmount,
                'credit' => 0,
                'foreign_debit' => (float) $line->amount,
                'foreign_credit' => 0,
                'exchange_rate' => $lineRate,
                'description' => 'Transfer In',
            ];
        }

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => 0,
            'credit' => round($totalBaseAmount, 2),
            'foreign_debit' => 0,
            'foreign_credit' => (float) $transfer->cashTransferLines->sum('amount'),
            'description' => 'Transfer Out',
        ];

        $lines = $this->balanceRoundingDifference($lines);
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
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => "Cheque received {$cheque->cheque_no}",
                ],
                [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => 0,
                    'credit' => $amount,
                    'description' => "Cheque received from {$cheque->payee_name}",
                ],
            ]
            : [
                [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => $amount,
                    'credit' => 0,
                    'description' => "Cheque issued to {$cheque->payee_name}",
                ],
                [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
        $return->loadMissing(['contact', 'salesReturnLines.product', 'salesReturnLines.taxRate']);

        $rate = $this->resolveJournalExchangeRate($return, $return->currency_id);
        $debitLines = [];

        foreach ($return->salesReturnLines as $line) {
            $salesAccount = $this->accountResolver->getSalesIncomeAccount();
            if ($line->product_id && $line->product?->sales_return_account_id) {
                $salesAccount = $this->resolveChartAccount($line->product->sales_return_account_id, $salesAccount);
            }

            $foreignDebit = (float) $line->line_total - (float) ($line->tax_amount ?? 0);
            $debitLines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => round($this->convertToBase($foreignDebit, $rate), 2),
                'credit' => 0,
                'foreign_debit' => $foreignDebit,
                'foreign_credit' => 0,
                'description' => 'Sales Return',
            ];
        }

        if ($totalTax = $return->salesReturnLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxPayableAccount();
            $debitLines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => round($this->convertToBase($totalTax, $rate), 2),
                'credit' => 0,
                'foreign_debit' => (float) $totalTax,
                'foreign_credit' => 0,
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
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => 0,
                    'credit' => $totalDebit,
                    'foreign_debit' => 0,
                    'foreign_credit' => (float) $return->salesReturnLines->sum('line_total'),
                    'description' => "Sales Return {$return->sales_return_no}",
                ],
            ],
            $debitLines
        );

        $lines = $this->balanceRoundingDifference($lines);
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
        $debitNote->loadMissing(['contact', 'debitNoteLines.product', 'debitNoteLines.taxRate']);

        $rate = $this->resolveJournalExchangeRate($debitNote, $debitNote->currency_id);
        $lines = [];
        $totalCredit = 0;

        foreach ($debitNote->debitNoteLines as $line) {
            $totalCredit += round($this->convertToBase($line->line_total, $rate), 2);
        }

        $apAccount = $this->contactPayableChartAccount($debitNote->contact, $this->accountResolver->getAccountsPayableAccount());

        $lines[] = [
            'account_id' => $this->resolvePostingAccountId($salesAccount->id),
            'debit' => $totalCredit,
            'credit' => 0,
            'foreign_debit' => (float) $debitNote->debitNoteLines->sum('line_total'),
            'foreign_credit' => 0,
            'description' => "Debit Note {$debitNote->debit_note_no}",
        ];

        foreach ($debitNote->debitNoteLines as $line) {
            $purchaseAccount = $this->accountResolver->getPurchaseExpenseAccount();
            $productAccountId = $line->product?->purchase_return_account_id
                ?: $line->product?->purchase_account_id;

            if ($productAccountId) {
                $purchaseAccount = $this->resolveChartAccount($productAccountId, $purchaseAccount);
            }

            $foreignCredit = (float) $line->line_total - (float) ($line->tax_amount ?? 0);
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => round($this->convertToBase($foreignCredit, $rate), 2),
                'foreign_debit' => 0,
                'foreign_credit' => $foreignCredit,
                'description' => 'Purchase Reversal',
            ];
        }

        if ($totalTax = $debitNote->debitNoteLines->sum('tax_amount')) {
            $taxAccount = $this->accountResolver->getTaxReceivableAccount();
            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => 0,
                'credit' => round($this->convertToBase($totalTax, $rate), 2),
                'foreign_debit' => 0,
                'foreign_credit' => (float) $totalTax,
                'description' => 'Tax Reversal',
            ];
        }

        $lines = $this->balanceRoundingDifference($lines);
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
        $adjustment->loadMissing('inventoryAdjustmentLines');

        $rate = $this->resolveJournalExchangeRate($adjustment, $adjustment->currency_id);
        $lines = [];

        foreach ($adjustment->inventoryAdjustmentLines as $line) {
            $foreignAmount = (float) $line->adjustment_value;
            $baseAmount = round($this->convertToBase($foreignAmount, $rate), 2);

            if ($line->adjustment_type === 'increase') {
                $inventoryAccount = $this->accountResolver->getInventoryAccount();
                $gainAccount = $this->accountResolver->getInventoryAdjustmentGainAccount();

                $lines[] = [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => $baseAmount,
                    'credit' => 0,
                    'foreign_debit' => $foreignAmount,
                    'foreign_credit' => 0,
                    'description' => 'Inventory Increase',
                ];

                $lines[] = [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => 0,
                    'credit' => $baseAmount,
                    'foreign_debit' => 0,
                    'foreign_credit' => $foreignAmount,
                    'description' => 'Gain on Adjustment',
                ];
            } else {
                $inventoryAccount = $this->accountResolver->getInventoryAccount();
                $lossAccount = $this->accountResolver->getInventoryAdjustmentLossAccount();

                $lines[] = [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => $baseAmount,
                    'credit' => 0,
                    'foreign_debit' => $foreignAmount,
                    'foreign_credit' => 0,
                    'description' => 'Loss on Adjustment',
                ];

                $lines[] = [
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                    'debit' => 0,
                    'credit' => $baseAmount,
                    'foreign_debit' => 0,
                    'foreign_credit' => $foreignAmount,
                    'description' => 'Inventory Decrease',
                ];
            }
        }

        $lines = $this->balanceRoundingDifference($lines);
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
                ? $this->resolveChartAccount($journal->finishedProduct->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                ? $this->resolveChartAccount($line->product->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                ? $this->resolveChartAccount($line->product->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                    'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                ? $this->resolveChartAccount($order->finishedProduct->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                ? $this->resolveChartAccount($line->product->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                ? $this->resolveChartAccount($line->product->purchase_account_id, $inventoryAccount)
                : $inventoryAccount;

            $lines[] = [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => $topUp->amount,
                'credit' => 0,
                'description' => 'Loan Received',
            ],
            [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
                'debit' => $charge->amount,
                'credit' => 0,
                'description' => $charge->charge_name,
            ],
            [
                'account_id' => $this->resolvePostingAccountId($salesAccount->id),
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

        if (! $original) {
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
        if (! $accountOrChartId) {
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
            $exchangeRate = $this->resolveJournalExchangeRate($sourceModel, $currencyId);
            $currencyId = $this->resolveJournalCurrencyId($sourceModel, $currencyId);

            $lines = collect($lines)
                ->map(fn (array $line) => $this->enrichJournalLine($line, $currencyId, $exchangeRate))
                ->filter(fn (array $line) => round((float) ($line['debit'] ?? 0), 2) > 0 || round((float) ($line['credit'] ?? 0), 2) > 0)
                ->values()
                ->all();

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
                exchangeRate: $exchangeRate,
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
                            accountId: $line['account_id'] ?? null,
                            debit: (float) ($line['debit'] ?? 0),
                            credit: (float) ($line['credit'] ?? 0),
                            description: $line['description'] ?? null,
                            foreignDebit: (float) ($line['foreign_debit'] ?? 0),
                            foreignCredit: (float) ($line['foreign_credit'] ?? 0),
                            currencyId: $line['currency_id'] ?? $currencyId,
                            exchangeRate: $line['exchange_rate'] ?? $exchangeRate
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
            if (Schema::hasColumn($sourceTable, $column) && ! empty($source->{$column})) {
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
        ?string $accountId,
        float $debit,
        float $credit,
        ?string $description,
        float $foreignDebit = 0,
        float $foreignCredit = 0,
        ?string $currencyId = null,
        float|int|string|null $exchangeRate = 1
    ): array {
        $payload = [
            'journal_voucher_id' => $voucherId,
            'account_id' => $this->resolvePostingAccountId($accountId),
            'debit' => $debit,
            'credit' => $credit,
            'description' => $description,
        ];

        if (Schema::hasColumn('journal_voucher_lines', 'foreign_debit')) {
            $payload['foreign_debit'] = $foreignDebit;
        }

        if (Schema::hasColumn('journal_voucher_lines', 'foreign_credit')) {
            $payload['foreign_credit'] = $foreignCredit;
        }

        if (Schema::hasColumn('journal_voucher_lines', 'currency_id')) {
            $payload['currency_id'] = $currencyId;
        }

        if (Schema::hasColumn('journal_voucher_lines', 'exchange_rate')) {
            $payload['exchange_rate'] = $exchangeRate ?: 1;
        }

        return $payload;
    }

    protected function resolvePostingAccountId(?string $accountOrChartId): string
    {
        if ($accountOrChartId && Account::query()->whereKey($accountOrChartId)->exists()) {
            return $accountOrChartId;
        }

        if ($accountOrChartId) {
            $accountId = ChartOfAccount::query()->whereKey($accountOrChartId)->value('account_id');

            if ($accountId) {
                return $accountId;
            }
        }

        throw new \InvalidArgumentException('Journal line posting account is required.');
    }

    protected function syncSourceBackReference(?Model $source, JournalVoucher $voucher): void
    {
        if (! $source) {
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

    protected function enrichJournalLine(array $line, ?string $currencyId, float $exchangeRate): array
    {
        $rate = (float) ($line['exchange_rate'] ?? $exchangeRate ?: 1);
        $rate = $rate > 0 ? $rate : 1;

        $debit = (float) ($line['debit'] ?? 0);
        $credit = (float) ($line['credit'] ?? 0);

        $line['foreign_debit'] = array_key_exists('foreign_debit', $line)
            ? (float) $line['foreign_debit']
            : ($debit > 0 ? round($debit / $rate, 2) : 0);

        $line['foreign_credit'] = array_key_exists('foreign_credit', $line)
            ? (float) $line['foreign_credit']
            : ($credit > 0 ? round($credit / $rate, 2) : 0);

        $line['currency_id'] = $line['currency_id'] ?? $currencyId;
        $line['exchange_rate'] = $rate;

        return $line;
    }

    protected function contactPayableChartAccount($contact, ChartOfAccount $fallback): ChartOfAccount
    {
        $accountId = $contact?->payable_account_id ?: $contact?->account_id;

        return $accountId
            ? $this->resolveChartAccount($accountId, $fallback)
            : $fallback;
    }

    protected function customerPaymentReceivableBaseAmount($payment, float $paymentRate): float
    {
        $payment->loadMissing('customerPaymentLines.invoice');

        if ($payment->customerPaymentLines->isEmpty()) {
            return 0;
        }

        return round($payment->customerPaymentLines->sum(function ($line) use ($paymentRate) {
            $rate = (float) ($line->invoice?->exchange_rate ?: $paymentRate ?: 1);

            return $this->convertToBase($line->allocated_amount, $rate);
        }), 2);
    }

    protected function customerPaymentForeignSettledAmount($payment): float
    {
        $payment->loadMissing('customerPaymentLines');

        $allocated = (float) $payment->customerPaymentLines->sum('allocated_amount');

        return $allocated > 0
            ? $allocated
            : (float) $payment->amount + (float) ($payment->bank_charges ?? 0) + (float) ($payment->tds_charges ?? 0);
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




