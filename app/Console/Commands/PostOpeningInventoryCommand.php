<?php

namespace App\Console\Commands;

use App\Models\JournalVoucher;
use App\Models\WarehouseItem;
use App\Services\AccountingAccountResolverService;
use App\Services\DocumentNumberingService;
use App\Services\LedgerValidationService;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;

/**
 * One-time catch-up for the switch to perpetual inventory costing.
 *
 * Stock bought before the switch was expensed straight to Purchase Expense, so
 * it never reached the Inventory asset account. This posts a single opening
 * entry bringing the stock currently on hand onto the balance sheet:
 *
 *     Dr Inventory            (value of stock on hand)
 *       Cr Purchase Expense   (reversing what was already expensed)
 *
 * Run it once per tenant, after migrating and before relying on the Balance
 * Sheet. Re-running is refused unless --force is passed.
 */
class PostOpeningInventoryCommand extends Command
{
    protected $signature = 'kiteledger:post-opening-inventory
        {--date= : Posting date for the opening entry (defaults to today)}
        {--dry-run : Show what would be posted without writing anything}
        {--force : Post again even though an opening entry already exists}';

    protected $description = 'Bring stock on hand onto the Inventory account when switching to perpetual costing.';

    private const SOURCE_TYPE = 'OpeningInventory';

    public function handle(
        AccountingAccountResolverService $accounts,
        LedgerValidationService $validator,
        DocumentNumberingService $numbering,
    ): int {
        if (! tenancy()->initialized) {
            $this->error('Run this inside a tenant context, for example: php artisan tenants:run kiteledger:post-opening-inventory');

            return self::FAILURE;
        }

        $existing = JournalVoucher::where('source_type', self::SOURCE_TYPE)->first();
        if ($existing && ! $this->option('force')) {
            $this->warn("An opening inventory entry already exists ({$existing->voucher_no}). Pass --force to post another.");

            return self::FAILURE;
        }

        $rows = WarehouseItem::query()
            ->selectRaw('product_id, SUM(qty_on_hand) AS qty, AVG(NULLIF(avg_cost, 0)) AS cost')
            ->groupBy('product_id')
            ->get();

        $value = 0.0;
        $counted = 0;
        foreach ($rows as $row) {
            $lineValue = round((float) $row->qty * (float) $row->cost, 2);
            if ($lineValue <= 0) {
                continue;
            }
            $value += $lineValue;
            $counted++;
        }
        $value = round($value, 2);

        $this->line("Products with costed stock on hand: {$counted}");
        $this->line('Total stock value: '.number_format($value, 2));

        if ($value <= 0) {
            $this->info('Nothing to post: no costed stock on hand.');

            return self::SUCCESS;
        }

        $inventory = $accounts->getInventoryAccount();
        $purchases = $accounts->getPurchaseExpenseAccount();
        $date = $this->option('date') ?: now()->toDateString();

        $lines = [
            ['account_id' => $inventory->account_id ?: $inventory->id, 'chart_of_account_id' => $inventory->id, 'debit' => $value, 'credit' => 0, 'description' => 'Opening inventory on hand'],
            ['account_id' => $purchases->account_id ?: $purchases->id, 'chart_of_account_id' => $purchases->id, 'debit' => 0, 'credit' => $value, 'description' => 'Reversal of stock previously expensed'],
        ];
        $validator->validateJournalVoucherLines($lines);

        $this->table(['Account', 'Debit', 'Credit'], [
            [$inventory->code.' '.$inventory->name, number_format($value, 2), ''],
            [$purchases->code.' '.$purchases->name, '', number_format($value, 2)],
        ]);

        if ($this->option('dry-run')) {
            $this->info('Dry run: nothing was written.');

            return self::SUCCESS;
        }

        DB::transaction(function () use ($lines, $value, $date, $numbering): void {
            $voucher = JournalVoucher::create([
                'voucher_no' => $numbering->generate('journal_voucher'),
                'voucher_date' => $date,
                'narration' => 'Opening inventory brought on to the balance sheet (perpetual costing changeover)',
                'status' => 'posted', 'active' => true, 'approved' => true, 'approved_at' => now(),
                'void' => false, 'exchange_rate' => 1, 'total' => $value,
                'source_type' => self::SOURCE_TYPE, 'source_module' => 'Opening Inventory',
                'is_auto_generated' => true, 'is_system_generated' => true,
            ]);

            foreach ($lines as $line) {
                $voucher->journalVoucherLines()->create($line);
            }
        });

        $this->info('Opening inventory posted.');

        return self::SUCCESS;
    }
}
