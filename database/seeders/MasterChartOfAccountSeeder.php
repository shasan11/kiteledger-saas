<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\Branch;
use Illuminate\Database\Seeder;

class MasterChartOfAccountSeeder extends Seeder
{
    public function run(): void
    {
        $headOffice = Branch::where('code', 'HO')->first();
        $branchId = $headOffice?->id;

        $accounts = [
            ['code' => '1000', 'name' => 'Assets', 'type' => 'parent', 'parent_code' => null],
            ['code' => '1100', 'name' => 'Current Assets', 'type' => 'parent', 'parent_code' => '1000'],
            ['code' => '1110', 'name' => 'Cash in Hand', 'type' => 'account', 'parent_code' => '1100'],
            ['code' => '1120', 'name' => 'Bank Accounts', 'type' => 'account', 'parent_code' => '1100'],
            ['code' => '1130', 'name' => 'Accounts Receivable', 'type' => 'account', 'parent_code' => '1100'],
            ['code' => '1140', 'name' => 'Inventory', 'type' => 'account', 'parent_code' => '1100'],
            ['code' => '1150', 'name' => 'Tax Receivable', 'type' => 'account', 'parent_code' => '1100'],
            ['code' => '1200', 'name' => 'Fixed Assets', 'type' => 'parent', 'parent_code' => '1000'],
            ['code' => '1300', 'name' => 'Other Assets', 'type' => 'parent', 'parent_code' => '1000'],

            ['code' => '2000', 'name' => 'Liabilities', 'type' => 'parent', 'parent_code' => null],
            ['code' => '2100', 'name' => 'Current Liabilities', 'type' => 'parent', 'parent_code' => '2000'],
            ['code' => '2110', 'name' => 'Accounts Payable', 'type' => 'account', 'parent_code' => '2100'],
            ['code' => '2120', 'name' => 'Tax Payable', 'type' => 'account', 'parent_code' => '2100'],
            ['code' => '2130', 'name' => 'Loan Payable', 'type' => 'account', 'parent_code' => '2100'],
            ['code' => '2140', 'name' => 'Salary Payable', 'type' => 'account', 'parent_code' => '2100'],
            ['code' => '2150', 'name' => 'Other Liabilities', 'type' => 'account', 'parent_code' => '2100'],

            ['code' => '3000', 'name' => 'Equity', 'type' => 'parent', 'parent_code' => null],
            ['code' => '3100', 'name' => 'Owner Capital', 'type' => 'account', 'parent_code' => '3000'],
            ['code' => '3200', 'name' => 'Retained Earnings', 'type' => 'account', 'parent_code' => '3000'],
            ['code' => '3300', 'name' => 'Reserve and Surplus', 'type' => 'account', 'parent_code' => '3000'],

            ['code' => '4000', 'name' => 'Income', 'type' => 'parent', 'parent_code' => null],
            ['code' => '4100', 'name' => 'Sales Income', 'type' => 'account', 'parent_code' => '4000'],
            ['code' => '4200', 'name' => 'Service Income', 'type' => 'account', 'parent_code' => '4000'],
            ['code' => '4300', 'name' => 'Other Income', 'type' => 'account', 'parent_code' => '4000'],

            ['code' => '5000', 'name' => 'Expenses', 'type' => 'parent', 'parent_code' => null],
            ['code' => '5100', 'name' => 'Purchase Expense', 'type' => 'account', 'parent_code' => '5000'],
            ['code' => '5200', 'name' => 'Direct Expense', 'type' => 'account', 'parent_code' => '5000'],
            ['code' => '5300', 'name' => 'Indirect Expense', 'type' => 'account', 'parent_code' => '5000'],
            ['code' => '5400', 'name' => 'Salary Expense', 'type' => 'account', 'parent_code' => '5000'],
            ['code' => '5500', 'name' => 'Bank Charges', 'type' => 'account', 'parent_code' => '5000'],
        ];

        foreach ($accounts as $account) {
            ChartOfAccount::updateOrCreate(
                ['code' => $account['code']],
                [
                    'name' => $account['name'],
                    'type' => $account['type'],
                    'parent_code' => $account['parent_code'],
                    'branch_id' => $branchId,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );
        }
    }
}
