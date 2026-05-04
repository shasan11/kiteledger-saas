<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\BankAccount;
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
use RuntimeException;

class AccountingSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $userId = User::query()->value('id');
            $now = now();

            $branch = Branch::query()->first();

            if (!$branch) {
                throw new RuntimeException('No branch found. Please run BranchSeeder before AccountingSeeder.');
            }

            $branchId = $branch->id;

            /*
            |--------------------------------------------------------------------------
            | Base Currency
            |--------------------------------------------------------------------------
            */

            $currency = Currency::query()
                ->where('is_base', true)
                ->first();

            if (!$currency) {
                $currency = Currency::query()->updateOrCreate(
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
            }

            /*
            |--------------------------------------------------------------------------
            | Account Master
            |--------------------------------------------------------------------------
            */

            $assetAccount = Account::query()->updateOrCreate(
                ['code' => '1000'],
                [
                    'name' => 'Assets',
                    'nature' => 'coa',
                    'parent_id' => null,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $cashControlAccount = Account::query()->updateOrCreate(
                ['code' => '1100'],
                [
                    'name' => 'Cash Accounts',
                    'nature' => 'coa',
                    'parent_id' => $assetAccount->id,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $bankControlAccount = Account::query()->updateOrCreate(
                ['code' => '1200'],
                [
                    'name' => 'Bank Accounts',
                    'nature' => 'coa',
                    'parent_id' => $assetAccount->id,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $expenseAccount = Account::query()->updateOrCreate(
                ['code' => '5000'],
                [
                    'name' => 'Expenses',
                    'nature' => 'coa',
                    'parent_id' => null,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 0,
                    'cr_amount' => 0,
                    'balance' => 0,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $mainBank = Account::query()->updateOrCreate(
                ['code' => 'BA-001'],
                [
                    'name' => 'Main Operating Bank',
                    'nature' => 'bank',
                    'parent_id' => $bankControlAccount->id,
                    'currency_id' => $currency->id,
                    'swift_code' => 'KITEUS00',
                    'dr_amount' => 100000,
                    'cr_amount' => 500,
                    'balance' => 99500,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $pettyCash = Account::query()->updateOrCreate(
                ['code' => 'CA-001'],
                [
                    'name' => 'Petty Cash',
                    'nature' => 'cash',
                    'parent_id' => $cashControlAccount->id,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 1500,
                    'cr_amount' => 150,
                    'balance' => 1350,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $adminExpenseAccount = Account::query()->updateOrCreate(
                ['code' => '5100'],
                [
                    'name' => 'Administrative Expense',
                    'nature' => 'coa',
                    'parent_id' => $expenseAccount->id,
                    'currency_id' => $currency->id,
                    'swift_code' => null,
                    'dr_amount' => 150,
                    'cr_amount' => 0,
                    'balance' => 150,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            /*
            |--------------------------------------------------------------------------
            | Bank / Cash Account Details
            |--------------------------------------------------------------------------
            */

            BankAccount::query()->updateOrCreate(
                ['code' => 'BA-001'],
                [
                    'branch_id' => $branchId,
                    'type' => 'bank',
                    'display_name' => 'Main Operating Bank',
                    'currency_id' => $currency->id,
                    'description' => 'Main company operating bank account',
                    'bank_name' => 'Kite Ledger Bank',
                    'account_name' => 'Main Operations',
                    'account_number' => '001122334455',
                    'account_type' => 'checking',
                    'swift_code' => 'KITEUS00',
                    'account_id' => $mainBank->id,
                    'opening_balance' => 100000,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            BankAccount::query()->updateOrCreate(
                ['code' => 'CA-001'],
                [
                    'branch_id' => $branchId,
                    'type' => 'cash',
                    'display_name' => 'Petty Cash',
                    'currency_id' => $currency->id,
                    'description' => 'Office petty cash account',
                    'bank_name' => null,
                    'account_name' => null,
                    'account_number' => null,
                    'account_type' => null,
                    'swift_code' => null,
                    'account_id' => $pettyCash->id,
                    'opening_balance' => 1000,
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
                    'branch_id' => $branchId,
                    'account_id' => $assetAccount->id,
                    'type' => 'asset',
                    'name' => 'Assets',
                    'parent_id' => null,
                    'description' => 'Asset control ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $cashControlCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '1100'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $cashControlAccount->id,
                    'type' => 'asset',
                    'name' => 'Cash Accounts',
                    'parent_id' => $assetCOA->id,
                    'description' => 'Cash control ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $bankControlCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '1200'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $bankControlAccount->id,
                    'type' => 'asset',
                    'name' => 'Bank Accounts',
                    'parent_id' => $assetCOA->id,
                    'description' => 'Bank control ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $mainBankCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => 'BA-001'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $mainBank->id,
                    'type' => 'asset',
                    'name' => 'Main Operating Bank',
                    'parent_id' => $bankControlCOA->id,
                    'description' => 'Main operating bank ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $pettyCashCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => 'CA-001'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $pettyCash->id,
                    'type' => 'asset',
                    'name' => 'Petty Cash',
                    'parent_id' => $cashControlCOA->id,
                    'description' => 'Petty cash ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $expenseCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '5000'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $expenseAccount->id,
                    'type' => 'expense',
                    'name' => 'Expenses',
                    'parent_id' => null,
                    'description' => 'Expense control ledger',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $adminExpenseCOA = ChartOfAccount::query()->updateOrCreate(
                ['code' => '5100'],
                [
                    'branch_id' => $branchId,
                    'account_id' => $adminExpenseAccount->id,
                    'type' => 'expense',
                    'name' => 'Administrative Expense',
                    'parent_id' => $expenseCOA->id,
                    'description' => 'Administrative expense ledger',
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
                ['transfer_no' => 'CT-0001'],
                [
                    'branch_id' => $branchId,
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
                ['voucher_no' => 'JV-0001'],
                [
                    'branch_id' => $branchId,
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

            /*
            |--------------------------------------------------------------------------
            | Final Account Balances
            |--------------------------------------------------------------------------
            */

            $mainBank->update([
                'dr_amount' => 100000,
                'cr_amount' => 500,
                'balance' => 99500,
            ]);

            $pettyCash->update([
                'dr_amount' => 1500,
                'cr_amount' => 150,
                'balance' => 1350,
            ]);

            $adminExpenseAccount->update([
                'dr_amount' => 150,
                'cr_amount' => 0,
                'balance' => 150,
            ]);

            $this->command?->info('Accounting seed data inserted/updated successfully.');
        });
    }
}