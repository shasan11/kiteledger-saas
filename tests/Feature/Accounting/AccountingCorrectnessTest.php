<?php

namespace Tests\Feature\Accounting;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\Contact;
use App\Models\Invoice;
use App\Services\Inventory\InvoiceStockPostingService;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\FiscalYear;
use App\Models\InventoryAdjustment;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Models\Product;
use App\Models\Warehouse;
use App\Models\WarehouseItem;
use App\Services\Inventory\WarehouseStockService;
use App\Services\Accounting\FiscalPeriodGuard;
use App\Services\AccountingAccountResolverService;
use App\Services\LedgerValidationService;
use App\Services\ParallelJournalVoucherService;
use App\Services\Reports\AccountingReportService;
use App\Services\Reports\ReportFilterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use InvalidArgumentException;
use ReflectionMethod;
use Tests\TestCase;

class AccountingCorrectnessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    // ------------------------------------------------------------- ledger

    public function test_a_journal_voucher_line_cannot_carry_a_negative_amount(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('negative debit or credit');

        app(LedgerValidationService::class)->validateJournalVoucherLines([
            ['debit' => -500, 'credit' => 0],
            ['debit' => 0, 'credit' => -500],
        ]);
    }

    public function test_a_journal_voucher_must_move_a_non_zero_amount(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('non-zero');

        app(LedgerValidationService::class)->validateJournalVoucherLines([
            ['debit' => 0, 'credit' => 0],
            ['debit' => 0, 'credit' => 0],
        ]);
    }

    public function test_balance_is_checked_to_the_cent_not_to_a_tolerance(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('not balanced');

        // One cent out. The old 0.01 float tolerance let this through.
        app(LedgerValidationService::class)->validateJournalVoucherLines([
            ['debit' => 100.00, 'credit' => 0],
            ['debit' => 0, 'credit' => 99.99],
        ]);
    }

    public function test_sub_cent_rounding_drift_is_still_absorbed(): void
    {
        $method = new ReflectionMethod(ParallelJournalVoucherService::class, 'balanceRoundingDifference');
        $lines = $method->invoke(app(ParallelJournalVoucherService::class), [
            ['debit' => 100.00, 'credit' => 0],
            ['debit' => 0, 'credit' => 99.99],
        ]);

        $this->assertSame(100.00, round(array_sum(array_column($lines, 'credit')), 2));
    }

    public function test_an_imbalance_larger_than_rounding_is_refused_not_plugged(): void
    {
        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('exceeds');

        $method = new ReflectionMethod(ParallelJournalVoucherService::class, 'balanceRoundingDifference');
        $method->invoke(app(ParallelJournalVoucherService::class), [
            ['debit' => 10000, 'credit' => 0],
            ['debit' => 0, 'credit' => 1],
        ]);
    }

    // --------------------------------------------------------- resolution

    public function test_control_accounts_resolve_to_the_preferred_code_not_the_parent_header(): void
    {
        [$branch, $currency] = $this->baseData();
        // Deliberately created parent-first, which is the order that used to win.
        $this->chartAccount('1100', 'Current Assets', 'asset', $branch, $currency);
        $this->chartAccount('1130', 'Accounts Receivable', 'asset', $branch, $currency);
        $this->chartAccount('2100', 'Current Liabilities', 'liability', $branch, $currency);
        $this->chartAccount('2110', 'Accounts Payable', 'liability', $branch, $currency);

        $resolver = app(AccountingAccountResolverService::class);

        $this->assertSame('1130', $resolver->getAccountsReceivableAccount()->code);
        $this->assertSame('2110', $resolver->getAccountsPayableAccount()->code);
    }

    public function test_a_contact_control_account_of_the_wrong_kind_is_ignored(): void
    {
        [$branch, $currency] = $this->baseData();
        $receivable = $this->chartAccount('1130', 'Accounts Receivable', 'asset', $branch, $currency);
        $bank = $this->chartAccount('1120', 'Bank', 'asset', $branch, $currency);
        // ChartOfAccountService::syncLinkedAccount() resets the linked account's
        // nature to 'coa' on every save, so a bank is identified by its
        // bank_accounts row rather than by nature alone.
        BankAccount::create([
            'branch_id' => $branch->id, 'type' => 'bank', 'display_name' => 'Main Bank',
            'code' => 'BNK-1', 'currency_id' => $currency->id, 'account_id' => $bank->account_id,
            'active' => true,
        ]);

        $method = new ReflectionMethod(ParallelJournalVoucherService::class, 'contactControlAccount');
        $service = app(ParallelJournalVoucherService::class);

        // A bank account is an asset, so a type check alone would accept it.
        $resolved = $method->invoke($service, $bank->id, $receivable, 'asset');
        $this->assertSame($receivable->id, $resolved->id, 'A cash/bank account must never stand in for a receivable control account.');

        $kept = $method->invoke($service, $receivable->id, $receivable, 'asset');
        $this->assertSame($receivable->id, $kept->id);
    }

    // ------------------------------------------------------- period locks

    public function test_closed_and_locked_fiscal_periods_refuse_postings(): void
    {
        FiscalYear::create([
            'name' => 'FY Closed', 'code' => 'FY-C',
            'start_date' => '2025-04-01', 'end_date' => '2026-03-31',
            'status' => 'CLOSED', 'active' => true,
        ]);
        FiscalYear::create([
            'name' => 'FY Open', 'code' => 'FY-O',
            'start_date' => '2026-04-01', 'end_date' => '2027-03-31',
            'status' => 'ACTIVE', 'active' => true, 'lock_date' => '2026-06-30',
        ]);

        $guard = app(FiscalPeriodGuard::class);

        $this->assertFalse($guard->isOpen('2025-09-01'), 'A closed fiscal year must not accept postings.');
        $this->assertFalse($guard->isOpen('2026-05-15'), 'A date on or before the lock date must not accept postings.');
        $this->assertTrue($guard->isOpen('2026-09-01'), 'An open period after the lock date must accept postings.');
        // No fiscal year covers this date, so nothing is being restated.
        $this->assertTrue($guard->isOpen('2030-01-01'));

        $this->expectException(ValidationException::class);
        $guard->assertOpen('2025-09-01', 'voucher_date');
    }

    public function test_an_unseeded_chart_of_accounts_does_not_block_stock_movement(): void
    {
        [$branch, $currency] = $this->baseData();
        $warehouse = Warehouse::create(['branch_id' => $branch->id, 'name' => 'Main Warehouse', 'code' => 'WH-1', 'active' => true]);
        $product = Product::create([
            'name' => 'Widget', 'code' => 'W-1', 'sku' => 'W-1', 'type' => 'simple',
            'track_inventory' => true, 'active' => true, 'purchase_price' => 10, 'sales_price' => 20,
        ]);

        $adjustment = InventoryAdjustment::create([
            'branch_id' => $branch->id, 'adjustment_no' => 'ADJ-'.uniqid(),
            'adjustment_date' => '2026-05-01', 'warehouse_id' => $warehouse->id,
            'reason' => 'opening stock', 'status' => 'draft', 'approved' => false,
            'stock_posted' => false, 'exchange_rate' => 1,
        ]);
        $adjustment->inventoryAdjustmentLines()->create([
            'product_id' => $product->id, 'adjustment_type' => 'increase', 'qty' => 5, 'unit_cost' => 10,
        ]);

        // No chart of accounts exists, so the journal cannot be raised. Stock
        // must still move rather than the whole operation failing.
        app(WarehouseStockService::class)->postInventoryAdjustment($adjustment);

        $this->assertTrue((bool) $adjustment->refresh()->stock_posted);
        $this->assertSame(5.0, (float) WarehouseItem::where('warehouse_id', $warehouse->id)->where('product_id', $product->id)->value('qty_on_hand'));
    }

    // ----------------------------------------------------------- reports

    public function test_ledger_aggregates_never_mix_a_wildcard_select_with_sum(): void
    {
        $this->ledgerFixture();

        $offending = [];
        DB::listen(function ($query) use (&$offending): void {
            $sql = strtolower($query->sql);
            // MySQL rejects "select t.*, sum(...)" without GROUP BY under
            // ONLY_FULL_GROUP_BY. SQLite happily runs it, which is exactly why
            // this has to be asserted structurally rather than by execution.
            if (str_contains($sql, 'sum(') && str_contains($sql, '.*') && ! str_contains($sql, 'group by')) {
                $offending[] = $query->sql;
            }
        });

        app(AccountingReportService::class)->build('trial-balance', $this->filters(), $this->meta());
        app(AccountingReportService::class)->build('balance-sheet', $this->filters(), $this->meta());
        app(AccountingReportService::class)->build('income-statement', $this->filters(), $this->meta());

        $this->assertSame([], $offending, 'A wildcard select combined with an aggregate would fail on MySQL: '.implode(' | ', $offending));
    }

    public function test_core_financial_statements_run_and_balance(): void
    {
        $this->ledgerFixture();

        foreach (['trial-balance', 'income-statement', 'balance-sheet', 'cash-flow-summary', 'general-ledger-summary'] as $key) {
            $report = app(AccountingReportService::class)->build($key, $this->filters(), $this->meta());
            $this->assertIsArray($report['rows'], "Report {$key} failed to build.");
        }

        $trial = app(AccountingReportService::class)->build('trial-balance', $this->filters(), $this->meta());
        $this->assertSame(0.0, (float) $this->summaryValue($trial, 'Difference'), 'Trial balance must balance.');

        // Assets = Liabilities + Equity only holds once the period result is
        // carried into equity; nothing closes income/expense otherwise.
        $sheet = app(AccountingReportService::class)->build('balance-sheet', $this->filters(), $this->meta());
        $this->assertSame(0.0, (float) $this->summaryValue($sheet, 'Difference'), 'Balance sheet must balance.');
    }

    public function test_draft_and_voided_vouchers_stay_out_of_line_level_reports(): void
    {
        [$posted, $draft, $voided] = $this->ledgerFixture();

        $rows = app(AccountingReportService::class)->build('transaction-list', $this->filters(), $this->meta())['rows'];
        $descriptions = collect($rows)->pluck('description')->filter()->all();

        $this->assertContains('posted-line', $descriptions);
        $this->assertNotContains('draft-line', $descriptions, 'Draft vouchers must not appear in reports.');
        $this->assertNotContains('voided-line', $descriptions, 'Voided vouchers must not appear in reports.');
    }

    // ------------------------------------------------- phase 7: cost gaps

    public function test_stock_leaving_without_a_warehouse_cost_falls_back_to_the_product_price(): void
    {
        [$branch, $currency] = $this->baseData();
        $warehouse = Warehouse::create(['branch_id' => $branch->id, 'name' => 'WH', 'code' => 'WH-9', 'active' => true]);
        // Without events: ContactObserver wants a document-numbering config that
        // this bare fixture has no reason to seed.
        $contact = Contact::withoutEvents(fn () => Contact::create(['name' => 'Acme', 'type' => 'customer', 'active' => true]));
        $product = Product::create([
            'name' => 'Widget', 'code' => 'W-9', 'sku' => 'W-9', 'type' => 'simple',
            'track_inventory' => true, 'active' => true, 'purchase_price' => 12, 'sales_price' => 30,
        ]);

        $invoice = Invoice::create([
            'branch_id' => $branch->id, 'invoice_no' => 'INV-9', 'invoice_date' => '2026-05-01',
            'contact_id' => $contact->id, 'warehouse_id' => $warehouse->id, 'currency_id' => $currency->id,
            'status' => 'draft', 'approved' => false, 'void' => false, 'active' => true,
            'exchange_rate' => 1, 'total' => 60, 'paid_total' => 0, 'balance_due' => 60,
        ]);
        $invoice->invoiceLines()->create([
            'product_id' => $product->id, 'product_name' => 'Widget',
            'qty' => 2, 'unit_price' => 30, 'tax_amount' => 0, 'line_total' => 60,
        ]);

        // Stock is on hand but carries no cost, which is what happens to any
        // product whose opening balance was entered without a value.
        WarehouseItem::create([
            'warehouse_id' => $warehouse->id, 'product_id' => $product->id,
            'branch_id' => $branch->id, 'qty_on_hand' => 10, 'avg_cost' => 0,
        ]);

        app(InvoiceStockPostingService::class)->post($invoice->fresh());

        $adjustment = InventoryAdjustment::where('source_type', 'invoice')->where('source_id', $invoice->id)->firstOrFail();
        $this->assertSame(12.0, (float) $adjustment->inventoryAdjustmentLines()->value('unit_cost'), 'Cost should fall back to the product purchase price, not silently become zero.');
    }

    public function test_syncing_a_chart_account_preserves_a_cash_or_bank_nature(): void
    {
        [$branch, $currency] = $this->baseData();
        $chart = $this->chartAccount('1120', 'Bank', 'asset', $branch, $currency);

        Account::whereKey($chart->account_id)->update(['nature' => 'cash']);
        $chart->refresh()->update(['name' => 'Bank Renamed']);

        $this->assertSame('cash', Account::whereKey($chart->refresh()->account_id)->value('nature'), 'Re-saving a chart account must not erase a cash/bank nature.');
    }

    // ------------------------------------------- phase 8: void integrity

    public function test_voiding_inside_a_closed_period_posts_a_reversal_and_leaves_the_original(): void
    {
        [$branch, $currency] = $this->baseData();
        $cash = $this->chartAccount('1110', 'Cash in Hand', 'asset', $branch, $currency);
        $sales = $this->chartAccount('4100', 'Sales Income', 'income', $branch, $currency);
        $original = $this->voucher($branch, $currency, 'posted', ['approved' => true, 'void' => false], $cash, $sales, 1000, 'closed-period-line');
        $original->forceFill(['voucher_date' => '2025-09-01'])->saveQuietly();

        FiscalYear::create([
            'name' => 'FY Closed', 'code' => 'FY-C', 'start_date' => '2025-04-01',
            'end_date' => '2026-03-31', 'status' => 'CLOSED', 'active' => true,
        ]);

        $cashBefore = (float) Account::whereKey($cash->account_id)->value('balance');

        app(JournalVoucherService::class)->void($original->refresh(), 'disputed');

        // The reversal is built without model events, so its balance effect is
        // applied once here rather than once per line by the line observer.
        $cashAfter = (float) Account::whereKey($cash->account_id)->value('balance');
        $this->assertSame(-1000.0, round($cashAfter - $cashBefore, 2), 'The reversal must move the account exactly once.');

        $after = $original->refresh();
        $this->assertFalse((bool) $after->void, 'An entry in a closed period must not be mutated.');
        $this->assertNotNull($after->reversed_journal_voucher_id);

        $reversal = JournalVoucher::with('journalVoucherLines')->findOrFail($after->reversed_journal_voucher_id);
        $this->assertSame(now()->toDateString(), $reversal->voucher_date->toDateString(), 'The reversal belongs in the current open period.');
        // Debits and credits are swapped, never negated.
        $this->assertSame(1000.0, (float) $reversal->journalVoucherLines->sum('debit'));
        $this->assertSame(1000.0, (float) $reversal->journalVoucherLines->sum('credit'));
        // Cash was debited 1000 originally, so the reversal credits it.
        $this->assertSame(1000.0, (float) $reversal->journalVoucherLines->where('chart_of_account_id', $cash->id)->sum('credit'));
        $this->assertSame(0.0, (float) $reversal->journalVoucherLines->where('chart_of_account_id', $cash->id)->sum('debit'));
    }

    public function test_voiding_inside_an_open_period_still_voids_in_place(): void
    {
        [$branch, $currency] = $this->baseData();
        $cash = $this->chartAccount('1110', 'Cash in Hand', 'asset', $branch, $currency);
        $sales = $this->chartAccount('4100', 'Sales Income', 'income', $branch, $currency);
        $voucher = $this->voucher($branch, $currency, 'posted', ['approved' => true, 'void' => false], $cash, $sales, 500, 'open-period-line');

        app(JournalVoucherService::class)->void($voucher->refresh(), 'keyed twice');

        $after = $voucher->refresh();
        $this->assertTrue((bool) $after->void);
        $this->assertNull($after->reversed_journal_voucher_id, 'No contra entry is needed while the period is still open.');
    }

    // -------------------------------------- phase 9: account column drift

    public function test_a_line_saved_with_only_one_account_reference_gains_the_other(): void
    {
        [$branch, $currency] = $this->baseData();
        $cash = $this->chartAccount('1110', 'Cash in Hand', 'asset', $branch, $currency);
        $sales = $this->chartAccount('4100', 'Sales Income', 'income', $branch, $currency);
        $voucher = $this->voucher($branch, $currency, 'posted', ['approved' => true, 'void' => false], $cash, $sales, 100, 'drift-line');

        // Reports join on chart_of_account_id; postings write account_id.
        $onlyChart = JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id, 'chart_of_account_id' => $cash->id,
            'debit' => 10, 'credit' => 0, 'description' => 'chart only',
        ]);
        $this->assertNotNull($onlyChart->refresh()->account_id);

        $onlyAccount = JournalVoucherLine::create([
            'journal_voucher_id' => $voucher->id, 'account_id' => $sales->account_id,
            'debit' => 0, 'credit' => 10, 'description' => 'account only',
        ]);
        $this->assertSame($sales->id, $onlyAccount->refresh()->chart_of_account_id, 'A line written with only account_id would be invisible to every report.');
    }

    public function test_approval_checks_read_the_schema_not_the_fillable_list(): void
    {
        $validator = app(LedgerValidationService::class);

        $this->assertTrue($validator->hasApprovedField(new Invoice));
        $this->assertTrue($validator->hasStatusField(new Invoice));
        // journal_voucher_lines has neither column, and never claimed to.
        $this->assertFalse($validator->hasApprovedField(new JournalVoucherLine));
    }

    // ----------------------------------------------------------- helpers

    private function summaryValue(array $report, string $label): mixed
    {
        return collect($report['summary'] ?? [])->firstWhere('label', $label)['value'] ?? null;
    }

    private function filters(): array
    {
        return app(ReportFilterService::class)->normalize(Request::create('/api/reports/x', 'GET', [
            'date_from' => '2000-01-01', 'date_to' => '2099-12-31', 'as_of_date' => '2099-12-31',
        ]));
    }

    private function meta(): array
    {
        return ['title' => 'Test Report', 'category_label' => 'Accounting'];
    }

    private function baseData(): array
    {
        $currency = Currency::firstOrCreate(
            ['code' => 'NPR'],
            ['name' => 'Nepalese Rupee', 'symbol' => 'Rs', 'active' => true, 'is_base' => true],
        );
        $branch = Branch::firstOrCreate(['code' => 'MAIN'], ['name' => 'Main Branch', 'active' => true]);

        return [$branch, $currency];
    }

    private function chartAccount(string $code, string $name, string $type, Branch $branch, Currency $currency): ChartOfAccount
    {
        $account = Account::create([
            'name' => $name, 'code' => $code, 'nature' => 'coa', 'currency_id' => $currency->id,
            'dr_amount' => 0, 'cr_amount' => 0, 'balance' => 0, 'active' => true,
        ]);

        return ChartOfAccount::create([
            'account_id' => $account->id, 'branch_id' => $branch->id, 'currency_id' => $currency->id,
            'type' => $type, 'code' => $code, 'name' => $name, 'active' => true,
        ]);
    }

    /**
     * One posted, one draft and one voided voucher over the same two accounts.
     *
     * @return array{0: JournalVoucher, 1: JournalVoucher, 2: JournalVoucher}
     */
    private function ledgerFixture(): array
    {
        [$branch, $currency] = $this->baseData();
        $cash = $this->chartAccount('1110', 'Cash in Hand', 'asset', $branch, $currency);
        $sales = $this->chartAccount('4100', 'Sales Income', 'income', $branch, $currency);

        $posted = $this->voucher($branch, $currency, 'posted', ['approved' => true, 'void' => false], $cash, $sales, 1000, 'posted-line');
        $draft = $this->voucher($branch, $currency, 'draft', ['approved' => false, 'void' => false], $cash, $sales, 700, 'draft-line');
        $voided = $this->voucher($branch, $currency, 'cancelled', ['approved' => true, 'void' => true], $cash, $sales, 400, 'voided-line');

        return [$posted, $draft, $voided];
    }

    private function voucher(Branch $branch, Currency $currency, string $status, array $flags, ChartOfAccount $debit, ChartOfAccount $credit, float $amount, string $description): JournalVoucher
    {
        $voucher = JournalVoucher::create(array_merge([
            'branch_id' => $branch->id, 'currency_id' => $currency->id,
            'voucher_no' => strtoupper($description).'-'.uniqid(),
            'voucher_date' => '2026-05-01', 'status' => $status,
            'active' => true, 'exchange_rate' => 1, 'total' => $amount,
        ], $flags));

        foreach ([[$debit, $amount, 0], [$credit, 0, $amount]] as [$account, $dr, $cr]) {
            JournalVoucherLine::create([
                'journal_voucher_id' => $voucher->id,
                'chart_of_account_id' => $account->id,
                'account_id' => $account->account_id,
                'debit' => $dr, 'credit' => $cr, 'description' => $description,
            ]);
        }

        return $voucher->refresh();
    }
}
