<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashTransfer;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\User;
use Illuminate\Database\Seeder;

class AccountingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $userId = User::query()->value('id');

        $branch = Branch::query()->firstOrCreate(
            ['code' => 'MAIN'],
            [
                'name' => 'Main Branch',
                'is_head_office' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $currency = Currency::query()->firstOrCreate(
            ['code' => 'USD'],
            [
                'name' => 'US Dollar',
                'symbol' => '$',
                'decimal_places' => 2,
                'is_base' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $assetParent = Account::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '1000'],
            [
                'name' => 'Assets',
                'nature' => 'asset',
                'is_system_generated' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $cashAccount = Account::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '1100'],
            [
                'name' => 'Cash on Hand',
                'nature' => 'asset',
                'parent_id' => $assetParent->id,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $bankControlAccount = Account::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '1200'],
            [
                'name' => 'Bank Accounts Control',
                'nature' => 'asset',
                'parent_id' => $assetParent->id,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $expenseParent = Account::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '5000'],
            [
                'name' => 'Expenses',
                'nature' => 'expense',
                'is_system_generated' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $adminExpenseAccount = Account::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '5100'],
            [
                'name' => 'Administrative Expense',
                'nature' => 'expense',
                'parent_id' => $expenseParent->id,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $mainBank = BankAccount::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => 'BA-001'],
            [
                'type' => 'bank',
                'display_name' => 'Main Operating Bank',
                'currency_id' => $currency->id,
                'bank_name' => 'Kite Ledger Bank',
                'account_name' => 'Main Operations',
                'account_number' => '001122334455',
                'account_type' => 'checking',
                'swift_code' => 'KITEUS00',
                'account_id' => $bankControlAccount->id,
                'opening_balance' => 100000,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $pettyCash = BankAccount::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => 'CA-001'],
            [
                'type' => 'cash',
                'display_name' => 'Petty Cash',
                'currency_id' => $currency->id,
                'description' => 'Office petty cash drawer',
                'account_id' => $cashAccount->id,
                'opening_balance' => 1000,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $bankCOA = ChartOfAccount::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '1200'],
            [
                'account_id' => $bankControlAccount->id,
                'name' => 'Bank Accounts Control',
                'description' => 'Control account for bank balances',
                'currency_id' => $currency->id,
                'is_system_generated' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $cashCOA = ChartOfAccount::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '1100'],
            [
                'account_id' => $cashAccount->id,
                'name' => 'Cash on Hand',
                'description' => 'Cash account for day-to-day transactions',
                'currency_id' => $currency->id,
                'is_system_generated' => true,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $expenseCOA = ChartOfAccount::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'code' => '5100'],
            [
                'account_id' => $adminExpenseAccount->id,
                'name' => 'Administrative Expense',
                'description' => 'General office and admin expenses',
                'currency_id' => $currency->id,
                'active' => true,
                'user_add_id' => $userId,
            ]
        );

        $cashTransfer = CashTransfer::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'transfer_no' => 'CT-0001'],
            [
                'transfer_date' => now()->toDateString(),
                'from_bank_account_id' => $mainBank->id,
                'reference' => 'Seed opening transfer',
                'currency_id' => $currency->id,
                'total_amount' => 500,
                'notes' => 'Transfer from bank to petty cash',
                'status' => 'posted',
                'user_add_id' => $userId,
                'active' => true,
                'approved' => true,
                'exchange_rate' => 1,
                'voided' => false,
            ]
        );

        $cashTransfer->items()->updateOrCreate(
            ['to_bank_account_id' => $pettyCash->id],
            [
                'exchange_rate_to_default' => 1,
                'amount' => 500,
                'description' => 'Fund petty cash',
            ]
        );

        $cashTransfer->update([
            'total_amount' => $cashTransfer->items()->sum('amount'),
        ]);

        $journalVoucher = JournalVoucher::query()->updateOrCreate(
            ['branch_id' => $branch->id, 'voucher_no' => 'JV-0001'],
            [
                'voucher_date' => now()->toDateString(),
                'currency_id' => $currency->id,
                'exchange_rate' => 1,
                'reference' => 'Seed opening JV',
                'narration' => 'Record admin expense paid by cash',
                'status' => 'posted',
                'user_add_id' => $userId,
                'active' => true,
                'approved' => true,
                'voided' => false,
            ]
        );

        $journalVoucher->items()->updateOrCreate(
            ['chart_of_account_id' => $expenseCOA->id, 'description' => 'Admin expense posting'],
            [
                'debit' => 150,
                'credit' => 0,
            ]
        );

        $journalVoucher->items()->updateOrCreate(
            ['chart_of_account_id' => $cashCOA->id, 'description' => 'Cash reduction for expense'],
            [
                'debit' => 0,
                'credit' => 150,
            ]
        );

        $this->command?->info('Accounting seed data inserted/updated successfully.');
    }
}
