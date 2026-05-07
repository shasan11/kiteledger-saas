<?php

namespace Database\Seeders;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use App\Models\ChartOfAccount;
use App\Models\ChequeRegister;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\LoanAccount;
use App\Models\LoanCharge;
use App\Models\LoanTopUp;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;

class AccountingTransactionVolumeSeeder extends Seeder
{
    private const COA_COUNT = 30;
    private const BANK_ACCOUNT_COUNT = 23;
    private const JOURNAL_VOUCHER_COUNT = 1000;
    private const CASH_TRANSFER_COUNT = 1000;
    private const CHEQUE_REGISTER_COUNT = 1000;
    private const LOAN_ACCOUNT_COUNT = 100;
    private const LOAN_TOP_UP_COUNT = 1000;
    private const LOAN_CHARGE_COUNT = 1000;

    public function run(): void
    {
        DB::transaction(function () {
            $branch = $this->branch();
            $currency = $this->currency();
            $userId = User::query()->value('id');

            $coaAccounts = $this->seedChartOfAccounts($branch, $currency, $userId);
            $bankAccounts = $this->seedBankAccounts($branch, $currency, $userId);
            $bankLedgerAccountIds = $bankAccounts->pluck('account_id')->filter()->values();

            $this->seedJournalVouchers($branch, $currency, $userId, $coaAccounts);
            $this->seedCashTransfers($branch, $currency, $userId, $bankLedgerAccountIds);
            $loanAccounts = $this->seedLoanAccounts($currency, $userId, $bankLedgerAccountIds, $coaAccounts);
            $this->seedLoanTopUps($userId, $loanAccounts, $bankLedgerAccountIds);
            $this->seedLoanCharges($userId, $loanAccounts, $bankLedgerAccountIds);
            $this->seedChequeRegisters($branch, $userId, $bankLedgerAccountIds, $coaAccounts);
        });
    }

    private function branch(): ?Branch
    {
        return Branch::query()->where('code', 'HO')->first() ?: Branch::query()->first();
    }

    private function currency(): Currency
    {
        return Currency::query()->where('is_base', true)->first()
            ?: Currency::query()->first()
            ?: Currency::query()->create([
                'code' => 'NPR',
                'name' => 'Nepalese Rupee',
                'symbol' => 'Rs.',
                'decimal_places' => 2,
                'is_base' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);
    }

    private function seedChartOfAccounts(?Branch $branch, Currency $currency, ?int $userId)
    {
        $groups = [
            ['code' => 'TV-1000', 'name' => 'Volume Assets', 'type' => 'asset'],
            ['code' => 'TV-2000', 'name' => 'Volume Liabilities', 'type' => 'liability'],
            ['code' => 'TV-3000', 'name' => 'Volume Equity', 'type' => 'equity'],
            ['code' => 'TV-4000', 'name' => 'Volume Income', 'type' => 'income'],
            ['code' => 'TV-5000', 'name' => 'Volume Expenses', 'type' => 'expense'],
        ];

        $parents = collect();

        foreach ($groups as $group) {
            $ledger = Account::query()->updateOrCreate(
                ['code' => $group['code']],
                [
                    'name' => $group['name'],
                    'nature' => 'coa',
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            );

            $parents->push(ChartOfAccount::query()->updateOrCreate(
                ['code' => $group['code']],
                [
                    'account_id' => $ledger->id,
                    'branch_id' => $branch?->id,
                    'type' => $group['type'],
                    'name' => $group['name'],
                    'parent_id' => null,
                    'description' => 'Seeder parent account for transaction volume testing.',
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => $userId,
                ]
            ));
        }

        $types = ['asset', 'liability', 'equity', 'income', 'expense'];
        $rows = collect();

        for ($i = 1; $i <= self::COA_COUNT; $i++) {
            $type = $types[($i - 1) % count($types)];
            $parent = $parents->firstWhere('type', $type);
            $code = 'TV-' . str_pad((string) ($i + 1000), 4, '0', STR_PAD_LEFT);
            $name = "Volume {$type} Account {$i}";

            $ledger = Account::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $name,
                    'nature' => 'coa',
                    'parent_id' => $parent?->account_id,
                    'currency_id' => $currency->id,
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            );

            $rows->push(ChartOfAccount::query()->updateOrCreate(
                ['code' => $code],
                [
                    'account_id' => $ledger->id,
                    'branch_id' => $branch?->id,
                    'type' => $type,
                    'name' => $name,
                    'parent_id' => $parent?->id,
                    'description' => 'Seeder account used by transaction volume demo data.',
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            ));
        }

        return $rows;
    }

    private function seedBankAccounts(?Branch $branch, Currency $currency, ?int $userId)
    {
        $rows = collect();

        for ($i = 1; $i <= self::BANK_ACCOUNT_COUNT; $i++) {
            $isCash = $i % 7 === 0;
            $code = ($isCash ? 'TV-CASH-' : 'TV-BANK-') . str_pad((string) $i, 3, '0', STR_PAD_LEFT);
            $displayName = $isCash ? "Volume Cash Counter {$i}" : "Volume Bank Account {$i}";

            $ledger = Account::query()->updateOrCreate(
                ['code' => $code],
                [
                    'name' => $displayName,
                    'nature' => $isCash ? 'cash' : 'bank',
                    'currency_id' => $currency->id,
                    'balance' => fake()->randomFloat(2, 25000, 2500000),
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            );

            $rows->push(BankAccount::query()->updateOrCreate(
                ['code' => $code],
                [
                    'branch_id' => $branch?->id,
                    'type' => $isCash ? 'cash' : 'bank',
                    'display_name' => $displayName,
                    'currency_id' => $currency->id,
                    'description' => 'Seeder bank/cash account used by transaction volume data.',
                    'bank_name' => $isCash ? null : fake()->randomElement(['Nabil Bank', 'Global IME Bank', 'NIC Asia Bank', 'Everest Bank']),
                    'account_name' => $isCash ? null : 'KiteLedger Demo Pvt. Ltd.',
                    'account_number' => $isCash ? null : fake()->numerify('98##########'),
                    'account_type' => $isCash ? null : fake()->randomElement(['saving', 'current', 'checking']),
                    'swift_code' => $isCash ? null : strtoupper(fake()->bothify('????NP??')),
                    'account_id' => $ledger->id,
                    'opening_balance' => fake()->randomFloat(2, 10000, 1000000),
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            ));
        }

        return $rows;
    }

    private function seedJournalVouchers(?Branch $branch, Currency $currency, ?int $userId, $coaAccounts): void
    {
        $coaIds = $coaAccounts->pluck('id')->values();

        for ($i = 1; $i <= self::JOURNAL_VOUCHER_COUNT; $i++) {
            $amount = fake()->randomFloat(2, 500, 150000);
            $date = $this->randomDate();
            $approved = $i % 5 !== 0;

            $voucher = JournalVoucher::query()->updateOrCreate(
                ['voucher_no' => 'TV-JV-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT)],
                [
                    'branch_id' => $branch?->id,
                    'voucher_date' => $date,
                    'currency_id' => $currency->id,
                    'reference' => 'TV-JV-REF-' . $i,
                    'narration' => 'Seeder journal voucher transaction ' . $i,
                    'status' => $approved ? 'posted' : 'draft',
                    'active' => true,
                    'approved' => $approved,
                    'approved_at' => $approved ? Carbon::parse($date)->endOfDay() : null,
                    'approved_by_id' => $approved ? $userId : null,
                    'void' => false,
                    'exchange_rate' => 1,
                    'total' => $amount,
                    'user_add_id' => $userId,
                ]
            );

            JournalVoucherLine::query()->where('journal_voucher_id', $voucher->id)->delete();

            JournalVoucherLine::query()->create([
                'journal_voucher_id' => $voucher->id,
                'chart_of_account_id' => $coaIds[$i % $coaIds->count()],
                'description' => 'Debit line for volume JV ' . $i,
                'debit' => $amount,
                'credit' => 0,
            ]);

            JournalVoucherLine::query()->create([
                'journal_voucher_id' => $voucher->id,
                'chart_of_account_id' => $coaIds[($i + 7) % $coaIds->count()],
                'description' => 'Credit line for volume JV ' . $i,
                'debit' => 0,
                'credit' => $amount,
            ]);
        }
    }

    private function seedCashTransfers(?Branch $branch, Currency $currency, ?int $userId, $bankLedgerAccountIds): void
    {
        for ($i = 1; $i <= self::CASH_TRANSFER_COUNT; $i++) {
            $fromId = $bankLedgerAccountIds[$i % $bankLedgerAccountIds->count()];
            $toId = $bankLedgerAccountIds[($i + 5) % $bankLedgerAccountIds->count()];

            if ($fromId === $toId) {
                $toId = $bankLedgerAccountIds[($i + 6) % $bankLedgerAccountIds->count()];
            }

            $amount = fake()->randomFloat(2, 1000, 250000);
            $date = $this->randomDate();
            $approved = $i % 6 !== 0;

            $transfer = CashTransfer::query()->updateOrCreate(
                ['transfer_no' => 'TV-CT-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT)],
                [
                    'branch_id' => $branch?->id,
                    'transfer_date' => $date,
                    'from_account_id' => $fromId,
                    'reference' => 'TV-CT-REF-' . $i,
                    'currency_id' => $currency->id,
                    'total_amount' => $amount,
                    'notes' => 'Seeder cash transfer ' . $i,
                    'status' => $approved ? 'posted' : 'draft',
                    'active' => true,
                    'approved' => $approved,
                    'approved_at' => $approved ? Carbon::parse($date)->endOfDay() : null,
                    'approved_by_id' => $approved ? $userId : null,
                    'void' => false,
                    'exchange_rate' => 1,
                    'total' => $amount,
                    'user_add_id' => $userId,
                ]
            );

            CashTransferLine::query()->where('cash_transfer_id', $transfer->id)->delete();
            CashTransferLine::query()->create([
                'cash_transfer_id' => $transfer->id,
                'to_account_id' => $toId,
                'exchange_rate_to_default' => 1,
                'amount' => $amount,
                'description' => 'Transfer to bank/cash account linked ledger only.',
            ]);
        }
    }

    private function seedLoanAccounts(Currency $currency, ?int $userId, $bankLedgerAccountIds, $coaAccounts)
    {
        $liabilityCoa = $coaAccounts->where('type', 'liability')->values();
        $fallbackLiabilityAccountId = $liabilityCoa->first()?->account_id ?: $coaAccounts->first()?->account_id;
        $rows = collect();

        for ($i = 1; $i <= self::LOAN_ACCOUNT_COUNT; $i++) {
            $openingBalance = fake()->randomFloat(2, 100000, 5000000);

            $rows->push(LoanAccount::query()->updateOrCreate(
                ['loan_number' => 'TV-LOAN-' . str_pad((string) $i, 4, '0', STR_PAD_LEFT)],
                [
                    'name' => 'Volume Loan Account ' . $i,
                    'bank_name' => fake()->randomElement(['Nabil Bank', 'Global IME Bank', 'NIC Asia Bank', 'Everest Bank']),
                    'description' => 'Seeder loan account for transaction volume testing.',
                    'opening_balance' => $openingBalance,
                    'current_balance' => $openingBalance + fake()->randomFloat(2, 10000, 400000),
                    'balance_as_of' => $this->randomDate(),
                    'loan_received_in_account_id' => $bankLedgerAccountIds[$i % $bankLedgerAccountIds->count()],
                    'related_account_id' => $fallbackLiabilityAccountId,
                    'interest_rate_per_annum' => fake()->randomFloat(2, 8, 16),
                    'duration_in_month' => fake()->randomElement([12, 24, 36, 48, 60]),
                    'processing_fee' => fake()->randomFloat(2, 2500, 50000),
                    'processing_fee_paid_from_account_id' => $bankLedgerAccountIds[($i + 3) % $bankLedgerAccountIds->count()],
                    'status' => 'active',
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            ));
        }

        return $rows;
    }

    private function seedLoanTopUps(?int $userId, $loanAccounts, $bankLedgerAccountIds): void
    {
        for ($i = 1; $i <= self::LOAN_TOP_UP_COUNT; $i++) {
            $approved = $i % 4 !== 0;
            $date = $this->randomDate();

            LoanTopUp::query()->updateOrCreate(
                ['reference' => 'TV-LTU-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT)],
                [
                    'loan_account_id' => $loanAccounts[$i % $loanAccounts->count()]->id,
                    'topup_no' => 'TV-LTU-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                    'topup_date' => $date,
                    'loan_received_in_account_id' => $bankLedgerAccountIds[($i + 2) % $bankLedgerAccountIds->count()],
                    'amount' => fake()->randomFloat(2, 5000, 500000),
                    'notes' => 'Seeder loan top-up transaction ' . $i,
                    'approved' => $approved,
                    'approved_at' => $approved ? Carbon::parse($date)->endOfDay() : null,
                    'approved_by_id' => $approved ? $userId : null,
                    'status' => $approved ? 'posted' : 'draft',
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            );
        }
    }

    private function seedLoanCharges(?int $userId, $loanAccounts, $bankLedgerAccountIds): void
    {
        $chargeNames = ['Processing Fee', 'Bank Charge', 'Insurance Charge', 'Documentation Charge'];

        for ($i = 1; $i <= self::LOAN_CHARGE_COUNT; $i++) {
            $approved = $i % 4 !== 0;
            $date = $this->randomDate();

            LoanCharge::query()->updateOrCreate(
                ['reference' => 'TV-LCH-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT)],
                [
                    'loan_account_id' => $loanAccounts[$i % $loanAccounts->count()]->id,
                    'charge_no' => 'TV-LCH-' . str_pad((string) $i, 5, '0', STR_PAD_LEFT),
                    'charge_name' => $chargeNames[$i % count($chargeNames)],
                    'charge_date' => $date,
                    'amount' => fake()->randomFloat(2, 500, 50000),
                    'charges_paid_from_account_id' => $bankLedgerAccountIds[($i + 4) % $bankLedgerAccountIds->count()],
                    'notes' => 'Seeder loan charge transaction ' . $i,
                    'approved' => $approved,
                    'approved_at' => $approved ? Carbon::parse($date)->endOfDay() : null,
                    'approved_by_id' => $approved ? $userId : null,
                    'status' => $approved ? 'posted' : 'draft',
                    'active' => true,
                    'is_system_generated' => false,
                    'user_add_id' => $userId,
                ]
            );
        }
    }

    private function seedChequeRegisters(?Branch $branch, ?int $userId, $bankLedgerAccountIds, $coaAccounts): void
    {
        $relatedAccountIds = $coaAccounts->pluck('account_id')->filter()->values();

        for ($i = 1; $i <= self::CHEQUE_REGISTER_COUNT; $i++) {
            $date = $this->randomDate();
            $status = fake()->randomElement(['pending', 'cleared', 'bounced', 'cancelled']);
            $approved = $status === 'cleared' || $i % 5 !== 0;
            $amount = fake()->randomFloat(2, 1000, 500000);

            ChequeRegister::query()->updateOrCreate(
                ['cheque_no' => 'TV-CHQ-' . str_pad((string) $i, 6, '0', STR_PAD_LEFT)],
                [
                    'branch_id' => $branch?->id,
                    'cheque_date' => $date,
                    'issued_date' => $date,
                    'received_date' => $i % 2 === 0 ? $date : null,
                    'payee_name' => fake()->company(),
                    'cleared_date' => $status === 'cleared' ? Carbon::parse($date)->addDays(fake()->numberBetween(1, 7))->toDateString() : null,
                    'direction' => $i % 2 === 0 ? 'received' : 'issued',
                    'account_id' => $bankLedgerAccountIds[$i % $bankLedgerAccountIds->count()],
                    'related_account_id' => $relatedAccountIds[$i % $relatedAccountIds->count()],
                    'receiver_related_account_id' => $relatedAccountIds[($i + 3) % $relatedAccountIds->count()],
                    'amount' => $amount,
                    'status' => $status,
                    'notes' => 'Seeder cheque register transaction ' . $i,
                    'active' => true,
                    'approved' => $approved,
                    'approved_at' => $approved ? Carbon::parse($date)->endOfDay() : null,
                    'approved_by_id' => $approved ? $userId : null,
                    'void' => $status === 'cancelled',
                    'voided_by_id' => $status === 'cancelled' ? $userId : null,
                    'voided_reason' => $status === 'cancelled' ? 'Seeder cancelled cheque.' : null,
                    'voided_at' => $status === 'cancelled' ? Carbon::parse($date)->endOfDay() : null,
                    'exchange_rate' => 1,
                    'total' => $amount,
                    'user_add_id' => $userId,
                ]
            );
        }
    }

    private function randomDate(): string
    {
        return Carbon::now()
            ->subDays(fake()->numberBetween(0, 365))
            ->toDateString();
    }
}
