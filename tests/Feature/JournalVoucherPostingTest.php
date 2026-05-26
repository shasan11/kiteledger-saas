<?php

namespace Tests\Feature;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Domain\Accounting\Services\SystemJournalVoucherService;
use App\Models\Account;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class JournalVoucherPostingTest extends TestCase
{
    use RefreshDatabase;

    public function test_draft_journal_voucher_does_not_affect_accounts(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();

        $voucher = $this->draftVoucher($branch, $currency);

        JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $cashCoa->id,
            'debit' => 10000,
            'credit' => 0,
        ]);

        JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $capitalCoa->id,
            'debit' => 0,
            'credit' => 10000,
        ]);

        $this->assertAccountAmounts($cash->refresh(), 0, 0, 0);
        $this->assertAccountAmounts($capital->refresh(), 0, 0, 0);
    }

    public function test_posting_and_updating_posted_journal_voucher_applies_only_delta(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();

        $voucher = $this->draftVoucher($branch, $currency);

        $cashLine = JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $cashCoa->id,
            'debit' => 10000,
            'credit' => 0,
        ]);

        $capitalLine = JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $capitalCoa->id,
            'debit' => 0,
            'credit' => 10000,
        ]);

        app(JournalVoucherService::class)->post($voucher);

        $this->assertAccountAmounts($cash->refresh(), 10000, 0, 10000);
        $this->assertAccountAmounts($capital->refresh(), 0, 10000, -10000);

        $cashLine->update(['debit' => 15000]);
        $capitalLine->update(['credit' => 15000]);

        $this->assertAccountAmounts($cash->refresh(), 15000, 0, 15000);
        $this->assertAccountAmounts($capital->refresh(), 0, 15000, -15000);
    }

    public function test_voiding_posted_journal_voucher_reverses_account_effect(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();

        $voucher = $this->draftVoucher($branch, $currency);

        JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $cashCoa->id,
            'debit' => 10000,
            'credit' => 0,
        ]);

        JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $capitalCoa->id,
            'debit' => 0,
            'credit' => 10000,
        ]);

        $posted = app(JournalVoucherService::class)->post($voucher);
        app(JournalVoucherService::class)->void($posted, 'Incorrect entry');

        $this->assertAccountAmounts($cash->refresh(), 0, 0, 0);
        $this->assertAccountAmounts($capital->refresh(), 0, 0, 0);
    }

    public function test_system_generated_journal_voucher_is_the_balance_update_layer(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();
        $source = $this->draftVoucher($branch, $currency);

        app(SystemJournalVoucherService::class)->syncFromEntries(
            sourceType: 'test_source',
            source: $source,
            date: now()->toDateString(),
            entries: [
                ['account_id' => $cash->id, 'debit' => 1000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 1000],
            ],
            branchId: $branch->id,
            currencyId: $currency->id,
            status: 'posted',
            exchangeRate: 1
        );

        $this->assertAccountAmounts($cash->refresh(), 1000, 0, 1000);
        $this->assertAccountAmounts($capital->refresh(), 0, 1000, -1000);

        app(SystemJournalVoucherService::class)->syncFromEntries(
            sourceType: 'test_source',
            source: $source,
            date: now()->toDateString(),
            entries: [
                ['account_id' => $cash->id, 'debit' => 1250, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 1250],
            ],
            branchId: $branch->id,
            currencyId: $currency->id,
            status: 'posted',
            exchangeRate: 1
        );

        $this->assertAccountAmounts($cash->refresh(), 1250, 0, 1250);
        $this->assertAccountAmounts($capital->refresh(), 0, 1250, -1250);
    }

    public function test_system_generated_draft_journal_voucher_does_not_affect_accounts(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();
        $source = $this->draftVoucher($branch, $currency);

        app(SystemJournalVoucherService::class)->syncFromEntries(
            sourceType: 'draft_source',
            source: $source,
            date: now()->toDateString(),
            entries: [
                ['account_id' => $cash->id, 'debit' => 1000, 'credit' => 0],
                ['account_id' => $capital->id, 'debit' => 0, 'credit' => 1000],
            ],
            branchId: $branch->id,
            currencyId: $currency->id,
            status: 'draft',
            exchangeRate: 1
        );

        $this->assertAccountAmounts($cash->refresh(), 0, 0, 0);
        $this->assertAccountAmounts($capital->refresh(), 0, 0, 0);
    }

    public function test_invalid_posted_journal_line_rules_are_enforced(): void
    {
        [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency] = $this->accounts();

        $voucher = $this->draftVoucher($branch, $currency);

        $this->expectException(ValidationException::class);

        JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id,
            'chart_of_account_id' => $cashCoa->id,
            'debit' => 100,
            'credit' => 100,
        ]);

        $this->assertAccountAmounts($cash->refresh(), 0, 0, 0);
    }

    private function accounts(): array
    {
        $currency = Currency::create([
            'name' => 'Nepalese Rupee',
            'code' => 'NPR',
            'symbol' => 'Rs',
            'active' => true,
            'is_base' => true,
        ]);

        $cash = Account::create([
            'name' => 'Cash',
            'code' => '1000',
            'nature' => 'coa',
            'currency_id' => $currency->id,
            'dr_amount' => 0,
            'cr_amount' => 0,
            'balance' => 0,
            'active' => true,
        ]);

        $capital = Account::create([
            'name' => 'Capital',
            'code' => '3000',
            'nature' => 'coa',
            'currency_id' => $currency->id,
            'dr_amount' => 0,
            'cr_amount' => 0,
            'balance' => 0,
            'active' => true,
        ]);

        $branch = Branch::create([
            'name' => 'Main Branch',
            'code' => 'MAIN',
            'active' => true,
        ]);

        $cashCoa = ChartOfAccount::create([
            'account_id' => $cash->id,
            'branch_id' => $branch->id,
            'type' => 'asset',
            'code' => '1000',
            'name' => 'Cash',
            'active' => true,
        ]);

        $capitalCoa = ChartOfAccount::create([
            'account_id' => $capital->id,
            'branch_id' => $branch->id,
            'type' => 'equity',
            'code' => '3000',
            'name' => 'Capital',
            'active' => true,
        ]);

        return [$cash, $capital, $cashCoa, $capitalCoa, $branch, $currency];
    }

    private function draftVoucher(Branch $branch, Currency $currency): JournalVoucher
    {
        return JournalVoucher::create([
            'branch_id' => $branch->id,
            'voucher_date' => now()->toDateString(),
            'currency_id' => $currency->id,
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
            'total' => 0,
        ]);
    }

    private function assertAccountAmounts(Account $account, float $dr, float $cr, float $balance): void
    {
        $this->assertSame(number_format($dr, 2, '.', ''), number_format((float) $account->dr_amount, 2, '.', ''));
        $this->assertSame(number_format($cr, 2, '.', ''), number_format((float) $account->cr_amount, 2, '.', ''));
        $this->assertSame(number_format($balance, 2, '.', ''), number_format((float) $account->balance, 2, '.', ''));
    }
}
