<?php

namespace App\Services;

use App\Exceptions\Accounting\MissingLedgerAccountException;
use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;

class AccountingAccountResolverService
{
    protected array $accountMapping = [
        'accounts_receivable' => ['codes' => ['1130', '1100'], 'names' => ['Accounts Receivable', 'AR', 'Debtors']],
        'accounts_payable' => ['codes' => ['2110', '2100'], 'names' => ['Accounts Payable', 'AP', 'Creditors']],
        'sales_income' => ['codes' => ['4100'], 'names' => ['Sales Income', 'Sales Revenue', 'Revenue']],
        'service_income' => ['codes' => ['4200', '4100'], 'names' => ['Service Income', 'Sales Income']],
        'purchase_expense' => ['codes' => ['5100'], 'names' => ['Purchase Expense']],
        // Under perpetual costing this is where stock value lands when it is
        // sold. Falls back to 5100 when a dedicated COGS account is absent, so
        // charts seeded before 5110 existed keep working.
        'cost_of_goods_sold' => ['codes' => ['5110', '5100'], 'names' => ['Cost of Goods Sold', 'COGS', 'Purchase Expense']],
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
        // Each of these used to resolve to the single 5100/4100 account, which
        // made the P&L unreadable — COGS, bank charges, FX and interest were one
        // number. The chart already carried dedicated accounts; the codes below
        // now point at them, with a fallback chain so charts seeded before those
        // accounts existed still resolve instead of throwing.
        'bank_charges_expense' => ['codes' => ['5500', '5300', '5100'], 'names' => ['Bank Charges Expense', 'Bank Charges']],
        'foreign_exchange_gain' => ['codes' => ['4310', '4300', '4100'], 'names' => ['Exchange Rate Gain', 'Foreign Exchange Gain', 'FX Gain']],
        'foreign_exchange_loss' => ['codes' => ['5310', '5300', '5100'], 'names' => ['Exchange Rate Loss', 'Foreign Exchange Loss', 'FX Loss']],
        'loan_interest_expense' => ['codes' => ['5320', '5300', '5100'], 'names' => ['Interest Expense', 'Loan Interest Expense']],
        'processing_fee_expense' => ['codes' => ['5500', '5300', '5100'], 'names' => ['Processing Fee Expense', 'Processing Fee', 'Bank Charges']],
        'cash' => ['codes' => ['1110'], 'names' => ['Cash in Hand', 'Cash']],
        'bank' => ['codes' => ['1120'], 'names' => ['Bank Accounts', 'Bank']],
        'inventory_adjustment_gain' => ['codes' => ['4320', '4300', '4100'], 'names' => ['Inventory Adjustment Gain']],
        'inventory_adjustment_loss' => ['codes' => ['5330', '5300', '5100'], 'names' => ['Inventory Adjustment Loss']],
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

    public function getCostOfGoodsSoldAccount(): ChartOfAccount
    {
        return $this->resolveAccount('cost_of_goods_sold');
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

    /**
     * Bumping RESOLUTION_VERSION retires every cached account id on deploy, so
     * a change to the mapping or the lookup order takes effect without anyone
     * having to remember to run `php artisan cache:clear`.
     */
    private const RESOLUTION_VERSION = 2;

    protected function cacheKey(string $accountType): string
    {
        return 'accounting_account_v'.self::RESOLUTION_VERSION."_{$accountType}_id";
    }

    protected function resolveAccount(string $accountType): ChartOfAccount
    {
        $id = Cache::remember($this->cacheKey($accountType), 3600, function () use ($accountType) {
            $mapping = $this->accountMapping[$accountType] ?? null;

            if (! $mapping) {
                throw new InvalidArgumentException("Unknown account type: {$accountType}");
            }

            $codes = $mapping['codes'] ?? [];
            $names = $mapping['names'] ?? [];

            // Codes and names are ordered by preference, so they must be probed
            // one at a time. whereIn() discards that order and returns whatever
            // the storage engine yields first — which is how 'accounts_receivable'
            // (['1130', '1100']) resolved to the 1100 Current Assets header
            // instead of 1130 Accounts Receivable.
            foreach ($codes as $code) {
                $account = ChartOfAccount::where('code', $code)->first();
                if ($account) {
                    return $account->id;
                }
            }

            foreach ($names as $name) {
                $account = ChartOfAccount::where('name', $name)->first();
                if ($account) {
                    return $account->id;
                }
            }

            throw new MissingLedgerAccountException($accountType);
        });

        $account = ChartOfAccount::find($id);

        if (! $account) {
            Cache::forget($this->cacheKey($accountType));
            throw new MissingLedgerAccountException($accountType);
        }

        return $account;
    }
}
