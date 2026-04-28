<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\Branch;
use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

class AccountingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $userId = User::query()->value('id');
            $now = now();

            $branch = Branch::query()->firstOrCreate(
                ['code' => 'MAIN'],
                [
                    'name' => 'Main Branch',
                    'is_head_office' => true,
                    'active' => true,
                    'is_system_generated' => true,
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
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Account Groups
            |--------------------------------------------------------------------------
            */

            $assetAccount = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => '1000'],
                [
                    'name' => 'Assets',
                    'nature' => 'coa',
                    'parent_id' => null,
                    'currency_id' => $currency->id,
                    'description' => 'Asset control group',
                    'opening_balance' => 0,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $cashControlAccount = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => '1100'],
                [
                    'name' => 'Cash Accounts',
                    'nature' => 'coa',
                    'parent_id' => $assetAccount->id,
                    'currency_id' => $currency->id,
                    'description' => 'Cash control group',
                    'opening_balance' => 0,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $bankControlAccount = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => '1200'],
                [
                    'name' => 'Bank Accounts',
                    'nature' => 'coa',
                    'parent_id' => $assetAccount->id,
                    'currency_id' => $currency->id,
                    'description' => 'Bank control group',
                    'opening_balance' => 0,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $expenseAccount = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => '5000'],
                [
                    'name' => 'Expenses',
                    'nature' => 'coa',
                    'parent_id' => null,
                    'currency_id' => $currency->id,
                    'description' => 'Expense control group',
                    'opening_balance' => 0,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Real Cash / Bank Accounts
            |--------------------------------------------------------------------------
            */

            $mainBank = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => 'BA-001'],
                [
                    'name' => 'Main Operating Bank',
                    'nature' => 'bank',
                    'parent_id' => $bankControlAccount->id,
                    'currency_id' => $currency->id,
                    'description' => 'Main company operating bank account',
                    'bank_name' => 'Kite Ledger Bank',
                    'account_name' => 'Main Operations',
                    'account_number' => '001122334455',
                    'account_type' => 'checking',
                    'swift_code' => 'KITEUS00',
                    'opening_balance' => 100000,
                    'dr_amount' => 100000,
                    'cr_amount' => 0,
                    'balance' => 100000,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $pettyCash = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => 'CA-001'],
                [
                    'name' => 'Petty Cash',
                    'nature' => 'cash',
                    'parent_id' => $cashControlAccount->id,
                    'currency_id' => $currency->id,
                    'description' => 'Office petty cash account',
                    'bank_name' => null,
                    'account_name' => null,
                    'account_number' => null,
                    'account_type' => null,
                    'swift_code' => null,
                    'opening_balance' => 1000,
                    'dr_amount' => 1000,
                    'cr_amount' => 0,
                    'balance' => 1000,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $adminExpenseAccount = Account::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'code' => '5100'],
                [
                    'name' => 'Administrative Expense',
                    'nature' => 'coa',
                    'parent_id' => $expenseAccount->id,
                    'currency_id' => $currency->id,
                    'description' => 'General office and administrative expenses',
                    'opening_balance' => 0,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Chart Of Accounts
            |--------------------------------------------------------------------------
            */

            $assetCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '1000'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $assetAccount->id,
                    'name' => 'Assets',
                    'parent_id' => null,
                    'description' => 'Asset control ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $cashControlCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '1100'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $cashControlAccount->id,
                    'name' => 'Cash Accounts',
                    'parent_id' => $assetCOA->id,
                    'description' => 'Cash control ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $bankControlCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '1200'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $bankControlAccount->id,
                    'name' => 'Bank Accounts',
                    'parent_id' => $assetCOA->id,
                    'description' => 'Bank control ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $mainBankCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => 'BA-001'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $mainBank->id,
                    'name' => 'Main Operating Bank',
                    'parent_id' => $bankControlCOA->id,
                    'description' => 'Main operating bank ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $pettyCashCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => 'CA-001'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $pettyCash->id,
                    'name' => 'Petty Cash',
                    'parent_id' => $cashControlCOA->id,
                    'description' => 'Petty cash ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $expenseCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '5000'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $expenseAccount->id,
                    'name' => 'Expenses',
                    'parent_id' => null,
                    'description' => 'Expense control ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $adminExpenseCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '5100'],
                [
                    'branch_id' => $branch->id,
                    'account_id' => $adminExpenseAccount->id,
                    'name' => 'Administrative Expense',
                    'parent_id' => $expenseCOA->id,
                    'description' => 'Administrative expense ledger',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Cash Transfer
            |--------------------------------------------------------------------------
            */

            $cashTransfer = CashTransfer::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'transfer_no' => 'CT-0001'],
                [
                    'transfer_date' => $now->toDateString(),
                    'from_account_id' => $mainBank->id,
                    'reference' => 'Seed opening transfer',
                    'currency_id' => $currency->id,
                    'total_amount' => 500,
                    'notes' => 'Transfer from main bank to petty cash',
                    'status' => 'posted',
                    'active' => true,
                    'approved' => true,
                    'approved_at' => $now,
                    'approved_by_id' => $userId,
                    'void' => false,
                    'voided_by_id' => null,
                    'voided_reason' => null,
                    'voided_at' => null,
                    'exchange_rate' => 1,
                    'total' => 500,
                    'user_add_id' => $userId,
                ]
            );

            CashTransferLine::query()->updateOrCreate(
                [
                    'cash_transfer_id' => $cashTransfer->id,
                    'to_account_id' => $pettyCash->id,
                ],
                [
                    'exchange_rate_to_default' => 1,
                    'amount' => 500,
                    'description' => 'Fund petty cash',
                ]
            );

            $cashTransferTotal = CashTransferLine::query()
                ->where('cash_transfer_id', $cashTransfer->id)
                ->sum('amount');

            $cashTransfer->update([
                'total_amount' => $cashTransferTotal,
                'total' => $cashTransferTotal,
            ]);

            /*
            |--------------------------------------------------------------------------
            | Journal Voucher
            |--------------------------------------------------------------------------
            */

            $journalVoucher = JournalVoucher::query()->updateOrCreate(
                ['branch_id' => $branch->id, 'voucher_no' => 'JV-0001'],
                [
                    'voucher_date' => $now->toDateString(),
                    'currency_id' => $currency->id,
                    'reference' => 'Seed opening JV',
                    'narration' => 'Record administrative expense paid by petty cash',
                    'status' => 'posted',
                    'active' => true,
                    'approved' => true,
                    'approved_at' => $now,
                    'approved_by_id' => $userId,
                    'void' => false,
                    'voided_by_id' => null,
                    'voided_reason' => null,
                    'voided_at' => null,
                    'exchange_rate' => 1,
                    'total' => 150,
                    'user_add_id' => $userId,
                ]
            );

            JournalVoucherLine::query()->updateOrCreate(
                [
                    'journal_voucher_id' => $journalVoucher->id,
                    'chart_of_account_id' => $adminExpenseCOA->id,
                    'description' => 'Administrative expense posting',
                ],
                [
                    'debit' => 150,
                    'credit' => 0,
                ]
            );

            JournalVoucherLine::query()->updateOrCreate(
                [
                    'journal_voucher_id' => $journalVoucher->id,
                    'chart_of_account_id' => $pettyCashCOA->id,
                    'description' => 'Petty cash reduction for expense',
                ],
                [
                    'debit' => 0,
                    'credit' => 150,
                ]
            );

            $journalTotal = JournalVoucherLine::query()
                ->where('journal_voucher_id', $journalVoucher->id)
                ->sum('debit');

            $journalVoucher->update([
                'total' => $journalTotal,
            ]);

            $this->command?->info('Accounting seed data inserted/updated successfully.');
        });
    }
}