<?php

namespace Database\Seeders;

use App\Models\AccountingConfiguration;
use App\Models\ChartOfAccount;
use Illuminate\Database\Seeder;

class AccountingConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        $find = fn (array $terms) => ChartOfAccount::query()
            ->where(function ($query) use ($terms) {
                foreach ($terms as $term) {
                    $query->orWhere('name', 'like', "%{$term}%")->orWhere('code', 'like', "%{$term}%");
                }
            })
            ->value('id');

        AccountingConfiguration::query()->firstOrCreate(
            ['active' => true],
            [
                'default_cash_account_id' => $find(['Cash']),
                'default_bank_account_id' => $find(['Bank']),
                'accounts_receivable_id' => $find(['Receivable', 'Debtor']),
                'accounts_payable_id' => $find(['Payable', 'Creditor']),
                'sales_account_id' => $find(['Sales']),
                'purchase_account_id' => $find(['Purchase']),
                'tax_payable_account_id' => $find(['VAT', 'Tax Payable']),
                'tax_receivable_account_id' => $find(['Tax Receivable', 'Input VAT']),
                'payroll_expense_account_id' => $find(['Salary', 'Payroll']),
                'salary_payable_account_id' => $find(['Salary Payable']),
                'inventory_account_id' => $find(['Inventory', 'Stock']),
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
