<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use Illuminate\Database\Seeder;

class MasterChartOfAccountSeeder extends Seeder
{
    public function run(): void
    {
        $headOffice = Branch::where('code', 'HO')->first();
        $branchId = $headOffice?->id;
        $currencyId = Currency::where('is_base', true)->value('id');

        $accounts = [
            ['code' => '1000', 'name' => 'Assets', 'type' => 'asset', 'parent_code' => null],
            ['code' => '1100', 'name' => 'Current Assets', 'type' => 'asset', 'parent_code' => '1000'],
            ['code' => '1110', 'name' => 'Cash in Hand', 'type' => 'asset', 'parent_code' => '1100'],
            ['code' => '1120', 'name' => 'Bank Accounts', 'type' => 'asset', 'parent_code' => '1100'],
            ['code' => '1130', 'name' => 'Accounts Receivable', 'type' => 'asset', 'parent_code' => '1100'],
            ['code' => '1140', 'name' => 'Inventory', 'type' => 'asset', 'parent_code' => '1100'],
            ['code' => '1150', 'name' => 'Tax Receivable', 'type' => 'asset', 'parent_code' => '1100'],
            ['code' => '1200', 'name' => 'Fixed Assets', 'type' => 'asset', 'parent_code' => '1000'],
            ['code' => '1300', 'name' => 'Other Assets', 'type' => 'asset', 'parent_code' => '1000'],

            ['code' => '2000', 'name' => 'Liabilities', 'type' => 'liability', 'parent_code' => null],
            ['code' => '2100', 'name' => 'Current Liabilities', 'type' => 'liability', 'parent_code' => '2000'],
            ['code' => '2110', 'name' => 'Accounts Payable', 'type' => 'liability', 'parent_code' => '2100'],
            ['code' => '2120', 'name' => 'Tax Payable', 'type' => 'liability', 'parent_code' => '2100'],
            ['code' => '2130', 'name' => 'Loan Payable', 'type' => 'liability', 'parent_code' => '2100'],
            ['code' => '2140', 'name' => 'Salary Payable', 'type' => 'liability', 'parent_code' => '2100'],
            ['code' => '2150', 'name' => 'Other Liabilities', 'type' => 'liability', 'parent_code' => '2100'],

            ['code' => '3000', 'name' => 'Equity', 'type' => 'equity', 'parent_code' => null],
            ['code' => '3100', 'name' => 'Owner Capital', 'type' => 'equity', 'parent_code' => '3000'],
            ['code' => '3200', 'name' => 'Retained Earnings', 'type' => 'equity', 'parent_code' => '3000'],
            ['code' => '3300', 'name' => 'Reserve and Surplus', 'type' => 'equity', 'parent_code' => '3000'],

            ['code' => '4000', 'name' => 'Income', 'type' => 'income', 'parent_code' => null],
            ['code' => '4100', 'name' => 'Sales Income', 'type' => 'income', 'parent_code' => '4000'],
            ['code' => '4200', 'name' => 'Service Income', 'type' => 'income', 'parent_code' => '4000'],
            ['code' => '4300', 'name' => 'Other Income', 'type' => 'income', 'parent_code' => '4000'],
            ['code' => '4310', 'name' => 'Exchange Rate Gain', 'type' => 'income', 'parent_code' => '4300'],
            ['code' => '4400', 'name' => 'Discount Received', 'type' => 'income', 'parent_code' => '4300'],

            ['code' => '5000', 'name' => 'Expenses', 'type' => 'expense', 'parent_code' => null],
            ['code' => '5100', 'name' => 'Purchase Expense', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5200', 'name' => 'Direct Expense', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5300', 'name' => 'Indirect Expense', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5310', 'name' => 'Exchange Rate Loss', 'type' => 'expense', 'parent_code' => '5300'],
            ['code' => '5400', 'name' => 'Salary Expense', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5500', 'name' => 'Bank Charges', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5600', 'name' => 'Depreciation Expense', 'type' => 'expense', 'parent_code' => '5000'],
            ['code' => '5700', 'name' => 'Discount Allowed', 'type' => 'expense', 'parent_code' => '5000'],
        ];

        foreach ($accounts as $account) {
            $parentAccountId = $account['parent_code']
                ? Account::where('code', $account['parent_code'])->value('id')
                : null;
            $parentChartAccountId = $account['parent_code']
                ? ChartOfAccount::where('code', $account['parent_code'])->value('id')
                : null;

            $ledgerAccount = Account::updateOrCreate(
                ['code' => $account['code']],
                [
                    'name' => $account['name'],
                    'nature' => 'coa',
                    'parent_id' => $parentAccountId,
                    'currency_id' => $currencyId,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );

            ChartOfAccount::updateOrCreate(
                ['code' => $account['code']],
                [
                    'account_id' => $ledgerAccount->id,
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'parent_id' => $parentChartAccountId,
                    'branch_id' => $branchId,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
