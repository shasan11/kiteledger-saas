<?php

namespace App\Services;

use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;

class AccountingAccountResolverService
{
    protected array $accountMapping = [
        'accounts_receivable' => ['codes' => ['1130', '1100'], 'names' => ['Accounts Receivable', 'AR', 'Debtors']],
        'accounts_payable' => ['codes' => ['2110', '2100'], 'names' => ['Accounts Payable', 'AP', 'Creditors']],
        'sales_income' => ['codes' => ['4100'], 'names' => ['Sales Income', 'Sales Revenue', 'Revenue']],
        'service_income' => ['codes' => ['4100'], 'names' => ['Service Income']],
        'purchase_expense' => ['codes' => ['5100'], 'names' => ['Purchase Expense', 'Cost of Goods Sold', 'COGS']],
        'inventory' => ['codes' => ['1140'], 'names' => ['Inventory', 'Stock']],
        'tax_receivable' => ['codes' => ['1150'], 'names' => ['Tax Receivable', 'VAT Receivable']],
        'vat_receivable' => ['codes' => ['1150'], 'names' => ['VAT Receivable']],
        'gst_receivable' => ['codes' => ['1150'], 'names' => ['GST Receivable']],
        'tds_receivable' => ['codes' => ['1150'], 'names' => ['TDS Receivable']],
        'tax_payable' => ['codes' => ['2120'], 'names' => ['Tax Payable', 'VAT Payable']],
        'vat_payable' => ['codes' => ['2120'], 'names' => ['VAT Payable']],
        'gst_payable' => ['codes' => ['2120'], 'names' => ['GST Payable']],
        'tds_payable' => ['codes' => ['2120'], 'names' => ['TDS Payable']],
        'loan_payable' => ['codes' => ['2130'], 'names' => ['Loan Payable', 'Loans']],
        'bank_charges_expense' => ['codes' => ['5100'], 'names' => ['Bank Charges Expense', 'Bank Charges']],
        'foreign_exchange_gain' => ['codes' => ['4100'], 'names' => ['Foreign Exchange Gain', 'FX Gain']],
        'foreign_exchange_loss' => ['codes' => ['5100'], 'names' => ['Foreign Exchange Loss', 'FX Loss']],
        'loan_interest_expense' => ['codes' => ['5100'], 'names' => ['Loan Interest Expense', 'Interest Expense']],
        'processing_fee_expense' => ['codes' => ['5100'], 'names' => ['Processing Fee Expense', 'Processing Fee']],
        'cash' => ['codes' => ['1110'], 'names' => ['Cash in Hand', 'Cash']],
        'bank' => ['codes' => ['1120'], 'names' => ['Bank Accounts', 'Bank']],
        'inventory_adjustment_gain' => ['codes' => ['4100'], 'names' => ['Inventory Adjustment Gain']],
        'inventory_adjustment_loss' => ['codes' => ['5100'], 'names' => ['Inventory Adjustment Loss']],
    ];

    public function getAccountsReceivableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('accounts_receivable');
    }

    public function getAccountsPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('accounts_payable');
    }

    public function getSalesIncomeAccount(): ChartOfAccount
    {
        return $this->resolveAccount('sales_income');
    }

    public function getServiceIncomeAccount(): ChartOfAccount
    {
        return $this->resolveAccount('service_income');
    }

    public function getPurchaseExpenseAccount(): ChartOfAccount
    {
        return $this->resolveAccount('purchase_expense');
    }

    public function getInventoryAccount(): ChartOfAccount
    {
        return $this->resolveAccount('inventory');
    }

    public function getTaxReceivableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('tax_receivable');
    }

    public function getVatReceivableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('vat_receivable');
    }

    public function getGstReceivableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('gst_receivable');
    }

    public function getTdsReceivableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('tds_receivable');
    }

    public function getTaxPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('tax_payable');
    }

    public function getVatPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('vat_payable');
    }

    public function getGstPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('gst_payable');
    }

    public function getTdsPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('tds_payable');
    }

    public function getLoanPayableAccount(): ChartOfAccount
    {
        return $this->resolveAccount('loan_payable');
    }

    public function getBankChargesExpenseAccount(): ChartOfAccount
    {
        return $this->resolveAccount('bank_charges_expense');
    }

    public function getForeignExchangeGainAccount(): ChartOfAccount
    {
        return $this->resolveAccount('foreign_exchange_gain');
    }

    public function getForeignExchangeLossAccount(): ChartOfAccount
    {
        return $this->resolveAccount('foreign_exchange_loss');
    }

    public function getLoanInterestExpenseAccount(): ChartOfAccount
    {
        return $this->resolveAccount('loan_interest_expense');
    }

    public function getProcessingFeeExpenseAccount(): ChartOfAccount
    {
        return $this->resolveAccount('processing_fee_expense');
    }

    public function getCashAccount(): ChartOfAccount
    {
        return $this->resolveAccount('cash');
    }

    public function getDefaultBankAccount(): ChartOfAccount
    {
        return $this->resolveAccount('bank');
    }

    public function getInventoryAdjustmentGainAccount(): ChartOfAccount
    {
        return $this->resolveAccount('inventory_adjustment_gain');
    }

    public function getInventoryAdjustmentLossAccount(): ChartOfAccount
    {
        return $this->resolveAccount('inventory_adjustment_loss');
    }

    protected function resolveAccount(string $accountType): ChartOfAccount
    {
        $id = Cache::remember("accounting_account_{$accountType}_id", 3600, function () use ($accountType) {
            $mapping = $this->accountMapping[$accountType] ?? null;

            if (! $mapping) {
                throw new InvalidArgumentException("Unknown account type: {$accountType}");
            }

            $codes = $mapping['codes'] ?? [];
            $names = $mapping['names'] ?? [];

            if ($codes) {
                $account = ChartOfAccount::whereIn('code', $codes)->first();
                if ($account) {
                    return $account->id;
                }
            }

            if ($names) {
                $account = ChartOfAccount::whereIn('name', $names)->first();
                if ($account) {
                    return $account->id;
                }
            }

            throw new InvalidArgumentException("Required account '{$accountType}' not found. Please seed your chart of accounts.");
        });

        $account = ChartOfAccount::find($id);

        if (! $account) {
            Cache::forget("accounting_account_{$accountType}_id");
            throw new InvalidArgumentException("Required account '{$accountType}' not found. Please seed your chart of accounts.");
        }

        return $account;
    }
}
