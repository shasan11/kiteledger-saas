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

class AccountingModuleSeeder extends Seeder
{
    public function run(): void
    {
        DB::transaction(function () {
            $userId = User::query()->value('id');
            $now = now();

            $branch = Branch::where('code', 'HO')->first() ?? Branch::first();
            $branchId = $branch?->id;

            $currency = Currency::where('is_base', true)->first();
            $currencyId = $currency?->id;

            $coa = fn (string $code) => ChartOfAccount::where('code', $code)->first();

            /*
            |--------------------------------------------------------------------------
            | COA lookups (seeded by MasterChartOfAccountSeeder)
            |--------------------------------------------------------------------------
            */

            $cashInHandGroupCOA   = $coa('1110');
            $bankGroupCOA         = $coa('1120');
            $arCOA                = $coa('1130');
            $apCOA                = $coa('2110');
            $ownerCapitalCOA      = $coa('3100');
            $retainedEarningsCOA  = $coa('3200');
            $salesIncomeCOA       = $coa('4100');
            $serviceIncomeCOA     = $coa('4200');
            $exchangeRateGainCOA  = $coa('4310');
            $discountReceivedCOA  = $coa('4400');
            $purchaseExpenseCOA   = $coa('5100');
            $directExpenseCOA     = $coa('5200');
            $indirectExpenseCOA   = $coa('5300');
            $exchangeRateLossCOA  = $coa('5310');
            $salaryExpenseCOA     = $coa('5400');
            $bankChargesCOA       = $coa('5500');
            $discountAllowedCOA   = $coa('5700');

            /*
            |--------------------------------------------------------------------------
            | Bank / Cash account records (seeded by MasterBankAccountSeeder)
            |--------------------------------------------------------------------------
            */

            $bankAccount = Account::where('code', 'BANK-001')->first();
            $cashAccount = Account::where('code', 'CASH-001')->first();

            // Create leaf-level COA entries for the specific bank/cash accounts
            $bankCOA = null;
            if ($bankAccount && $bankGroupCOA) {
                $bankCOA = ChartOfAccount::updateOrCreate(
                    ['code' => 'BANK-001'],
                    [
                        'account_id'         => $bankAccount->id,
                        'branch_id'          => $branchId,
                        'type'               => 'asset',
                        'name'               => 'Default Bank Account',
                        'parent_id'          => $bankGroupCOA->id,
                        'description'        => 'Main operating bank account',
                        'active'             => true,
                        'is_system_generated' => true,
                        'user_add_id'        => $userId,
                    ]
                );
            }

            $cashCOA = null;
            if ($cashAccount && $cashInHandGroupCOA) {
                $cashCOA = ChartOfAccount::updateOrCreate(
                    ['code' => 'CASH-001'],
                    [
                        'account_id'         => $cashAccount->id,
                        'branch_id'          => $branchId,
                        'type'               => 'asset',
                        'name'               => 'Cash in Hand',
                        'parent_id'          => $cashInHandGroupCOA->id,
                        'description'        => 'Office petty cash / cash in hand',
                        'active'             => true,
                        'is_system_generated' => true,
                        'user_add_id'        => $userId,
                    ]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-001 : Opening Balance Entry
            | Capital injected by owner — bank + cash opening balances
            |--------------------------------------------------------------------------
            */

            if ($bankCOA && $cashCOA && $ownerCapitalCOA) {
                $jv1 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-001'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'OPEN-BAL-001',
                        'narration'       => "Opening balance — owner's capital contribution",
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 550000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv1->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'Opening bank balance'],
                    ['debit' => 500000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv1->id, 'chart_of_account_id' => $cashCOA->id, 'description' => 'Opening cash balance'],
                    ['debit' => 50000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv1->id, 'chart_of_account_id' => $ownerCapitalCOA->id, 'description' => "Owner's capital"],
                    ['debit' => 0, 'credit' => 550000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-002 : Sales on Credit
            |--------------------------------------------------------------------------
            */

            if ($arCOA && $salesIncomeCOA) {
                $jv2 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-002'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'INV-0001',
                        'narration'       => 'Sales on credit — goods delivered to customer',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 100000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv2->id, 'chart_of_account_id' => $arCOA->id, 'description' => 'Receivable from customer'],
                    ['debit' => 100000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv2->id, 'chart_of_account_id' => $salesIncomeCOA->id, 'description' => 'Sales revenue recognised'],
                    ['debit' => 0, 'credit' => 100000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-003 : Customer Payment Received
            |--------------------------------------------------------------------------
            */

            if ($bankCOA && $arCOA) {
                $jv3 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-003'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'REC-0001',
                        'narration'       => 'Customer payment received against INV-0001',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 100000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv3->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'Payment deposited in bank'],
                    ['debit' => 100000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv3->id, 'chart_of_account_id' => $arCOA->id, 'description' => 'Receivable cleared'],
                    ['debit' => 0, 'credit' => 100000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-004 : Purchase on Credit
            |--------------------------------------------------------------------------
            */

            if ($purchaseExpenseCOA && $apCOA) {
                $jv4 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-004'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'BILL-0001',
                        'narration'       => 'Purchase of goods on credit from supplier',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 80000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv4->id, 'chart_of_account_id' => $purchaseExpenseCOA->id, 'description' => 'Purchase expense recorded'],
                    ['debit' => 80000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv4->id, 'chart_of_account_id' => $apCOA->id, 'description' => 'Payable to supplier'],
                    ['debit' => 0, 'credit' => 80000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-005 : Supplier Payment (with early-payment discount received)
            |--------------------------------------------------------------------------
            */

            if ($apCOA && $bankCOA && $discountReceivedCOA) {
                $jv5 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-005'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'PAY-0001',
                        'narration'       => 'Payment to supplier — BILL-0001 settled with 2% early-payment discount',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 80000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv5->id, 'chart_of_account_id' => $apCOA->id, 'description' => 'Payable cleared (BILL-0001)'],
                    ['debit' => 80000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv5->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'Payment made from bank (net of discount)'],
                    ['debit' => 0, 'credit' => 78400]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv5->id, 'chart_of_account_id' => $discountReceivedCOA->id, 'description' => '2% early-payment discount from supplier'],
                    ['debit' => 0, 'credit' => 1600]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-006 : Bank Charges
            |--------------------------------------------------------------------------
            */

            if ($bankChargesCOA && $bankCOA) {
                $jv6 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-006'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'BKCHG-0001',
                        'narration'       => 'Monthly bank service charges deducted by bank',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 500,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv6->id, 'chart_of_account_id' => $bankChargesCOA->id, 'description' => 'Bank service charges'],
                    ['debit' => 500, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv6->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'Deducted from bank account'],
                    ['debit' => 0, 'credit' => 500]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-007 : Foreign Currency Sales — Exchange Rate Gain
            |
            | USD 1,000 invoice raised at NPR 132 (NPR 132,000 receivable).
            | Customer pays when rate is NPR 133 → bank receives NPR 133,000.
            | Realised Exchange Rate Gain = NPR 1,000 → credited to 4310.
            |--------------------------------------------------------------------------
            */

            if ($arCOA && $salesIncomeCOA && $bankCOA && $exchangeRateGainCOA) {
                // Step A: Invoice raised
                $jv7 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-007'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'FX-INV-0001',
                        'narration'       => 'USD 1,000 export invoice raised at NPR 132 per USD',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 132,
                        'total'           => 132000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv7->id, 'chart_of_account_id' => $arCOA->id, 'description' => 'USD 1,000 receivable at rate NPR 132'],
                    ['debit' => 132000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv7->id, 'chart_of_account_id' => $salesIncomeCOA->id, 'description' => 'Export sales income at rate NPR 132'],
                    ['debit' => 0, 'credit' => 132000]
                );

                // Step B: Payment received at higher rate — realised gain booked to 4310
                $jv8 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-008'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'FX-PMT-0001',
                        'narration'       => 'USD 1,000 payment received at NPR 133 — realised exchange rate gain NPR 1,000 (4310)',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 133,
                        'total'           => 133000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv8->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'USD 1,000 received at rate NPR 133'],
                    ['debit' => 133000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv8->id, 'chart_of_account_id' => $arCOA->id, 'description' => 'Receivable cleared at original rate NPR 132'],
                    ['debit' => 0, 'credit' => 132000]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv8->id, 'chart_of_account_id' => $exchangeRateGainCOA->id, 'description' => 'Realised forex gain — rate moved NPR 132 → 133'],
                    ['debit' => 0, 'credit' => 1000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-009 : Foreign Currency Purchase — Exchange Rate Loss
            |
            | USD 500 purchase invoice booked at NPR 132 (NPR 66,000 payable).
            | Supplier paid when rate is NPR 134 → bank pays NPR 67,000.
            | Realised Exchange Rate Loss = NPR 1,000 → debited to 5310.
            |--------------------------------------------------------------------------
            */

            if ($apCOA && $bankCOA && $purchaseExpenseCOA && $exchangeRateLossCOA) {
                // Step A: Purchase invoice at rate 132
                $jv9 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-009'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'FX-BILL-0001',
                        'narration'       => 'USD 500 import purchase booked at NPR 132 per USD',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 132,
                        'total'           => 66000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv9->id, 'chart_of_account_id' => $purchaseExpenseCOA->id, 'description' => 'USD 500 purchase at rate NPR 132'],
                    ['debit' => 66000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv9->id, 'chart_of_account_id' => $apCOA->id, 'description' => 'Payable to supplier at rate NPR 132'],
                    ['debit' => 0, 'credit' => 66000]
                );

                // Step B: Payment at higher rate — realised loss booked to 5310
                $jv10 = JournalVoucher::updateOrCreate(
                    ['voucher_no' => 'JV-ACC-010'],
                    [
                        'branch_id'       => $branchId,
                        'voucher_date'    => $now->toDateString(),
                        'currency_id'     => $currencyId,
                        'reference'       => 'FX-PAY-0001',
                        'narration'       => 'USD 500 supplier paid at NPR 134 — realised exchange rate loss NPR 1,000 (5310)',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 134,
                        'total'           => 67000,
                        'user_add_id'     => $userId,
                    ]
                );

                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv10->id, 'chart_of_account_id' => $apCOA->id, 'description' => 'Payable cleared at original rate NPR 132'],
                    ['debit' => 66000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv10->id, 'chart_of_account_id' => $exchangeRateLossCOA->id, 'description' => 'Realised forex loss — rate moved NPR 132 → 134'],
                    ['debit' => 1000, 'credit' => 0]
                );
                JournalVoucherLine::updateOrCreate(
                    ['journal_voucher_id' => $jv10->id, 'chart_of_account_id' => $bankCOA->id, 'description' => 'USD 500 paid from bank at rate NPR 134'],
                    ['debit' => 0, 'credit' => 67000]
                );
            }

            /*
            |--------------------------------------------------------------------------
            | JV-ACC-011 : Salary Expense Accrual
            |--------------------------------------------------------------------------
            */

            if ($salaryExpenseCOA) {
                $salaryPayableCOA = $coa('2140');

                if ($salaryPayableCOA) {
                    $jv11 = JournalVoucher::updateOrCreate(
                        ['voucher_no' => 'JV-ACC-011'],
                        [
                            'branch_id'       => $branchId,
                            'voucher_date'    => $now->toDateString(),
                            'currency_id'     => $currencyId,
                            'reference'       => 'SAL-ACC-001',
                            'narration'       => 'Monthly salary expense accrual',
                            'status'          => 'posted',
                            'active'          => true,
                            'approved'        => true,
                            'approved_at'     => $now,
                            'approved_by_id'  => $userId,
                            'void'            => false,
                            'exchange_rate'   => 1,
                            'total'           => 150000,
                            'user_add_id'     => $userId,
                        ]
                    );

                    JournalVoucherLine::updateOrCreate(
                        ['journal_voucher_id' => $jv11->id, 'chart_of_account_id' => $salaryExpenseCOA->id, 'description' => 'Monthly salary expense'],
                        ['debit' => 150000, 'credit' => 0]
                    );
                    JournalVoucherLine::updateOrCreate(
                        ['journal_voucher_id' => $jv11->id, 'chart_of_account_id' => $salaryPayableCOA->id, 'description' => 'Salary payable to employees'],
                        ['debit' => 0, 'credit' => 150000]
                    );
                }
            }

            /*
            |--------------------------------------------------------------------------
            | CT-ACC-001 : Cash Transfer — Bank to Petty Cash (monthly top-up)
            |--------------------------------------------------------------------------
            */

            if ($bankAccount && $cashAccount) {
                $ct = CashTransfer::updateOrCreate(
                    ['transfer_no' => 'CT-ACC-001'],
                    [
                        'branch_id'       => $branchId,
                        'transfer_date'   => $now->toDateString(),
                        'from_account_id' => $bankAccount->id,
                        'reference'       => 'Petty cash top-up',
                        'currency_id'     => $currencyId,
                        'notes'           => 'Monthly petty cash replenishment from operating bank',
                        'status'          => 'posted',
                        'active'          => true,
                        'approved'        => true,
                        'approved_at'     => $now,
                        'approved_by_id'  => $userId,
                        'void'            => false,
                        'exchange_rate'   => 1,
                        'total'           => 20000,
                        'total_amount'    => 20000,
                        'user_add_id'     => $userId,
                    ]
                );

                CashTransferLine::updateOrCreate(
                    ['cash_transfer_id' => $ct->id, 'to_account_id' => $cashAccount->id],
                    [
                        'exchange_rate_to_default' => 1,
                        'amount'                   => 20000,
                        'description'              => 'Monthly petty cash top-up',
                    ]
                );

                $ctTotal = CashTransferLine::where('cash_transfer_id', $ct->id)->sum('amount');
                $ct->update(['total_amount' => $ctTotal, 'total' => $ctTotal]);
            }

            $this->command?->info('Accounting module seed data inserted successfully.');
        });
    }
}
