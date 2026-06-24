<?php

namespace App\Services\AI\Rag;

use App\Models\User;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Throwable;

/**
 * RAG retrieval for the chat assistant (spec §7).
 *
 * Wraps {@see AiSemanticSearchService}: embeds the query, ranks stored vectors
 * by cosine similarity within the user's branch scope, then enriches each hit
 * into a citable "source card" (title, module, snippet, deep-link route).
 *
 * Hard rules:
 *  - Never returns raw vectors / embeddings / content hashes.
 *  - Branch scope is enforced (search service already filters by branch_id or
 *    null); record lookups stay within the same scope.
 *  - Numbers are never computed here — only real source records are cited.
 */
class AiRagRetriever
{
    /**
     * Per source_type metadata: module label + deep-link route base + the
     * table/columns used to build a human title. Mirrors the indexer registry
     * and the executor's module routes.
     *
     * @var array<string, array{module: string, table: string, route: string, number: array<int,string>, status: string, date: array<int,string>}>
     */
    private array $sourceMap = [
        'invoice' => [
            'module' => 'Sales',
            'table' => 'invoices',
            'route' => '/payment-in/invoices',
            'number' => ['invoice_no', 'invoice_number'],
            'status' => 'status',
            'date' => ['invoice_date', 'date'],
        ],
        'journal_voucher' => [
            'module' => 'Accounting',
            'table' => 'journal_vouchers',
            'route' => '/accounting/journal-vouchers',
            'number' => ['voucher_no'],
            'status' => 'status',
            'date' => ['voucher_date', 'date'],
        ],
        'quotation' => [
            'module' => 'Sales',
            'table' => 'quotations',
            'route' => '/payment-in/quotations',
            'number' => ['quotation_no'],
            'status' => 'status',
            'date' => ['quotation_date', 'date'],
        ],
        'purchase_bill' => [
            'module' => 'Purchase',
            'table' => 'purchase_bills',
            'route' => '/payment-out/purchase-bills',
            'number' => ['bill_no'],
            'status' => 'status',
            'date' => ['bill_date', 'date'],
        ],
        'expense' => [
            'module' => 'Purchase',
            'table' => 'expenses',
            'route' => '/payment-out/expenses',
            'number' => ['expense_no'],
            'status' => 'status',
            'date' => ['expense_date', 'date'],
        ],
        'product' => [
            'module' => 'Inventory',
            'table' => 'products',
            'route' => '/inventory/products',
            'number' => ['code', 'sku'],
            'status' => 'status',
            'date' => ['created_at'],
        ],
        'contact' => [
            'module' => 'Contacts',
            'table' => 'contacts',
            'route' => '/actors/contacts',
            'number' => ['code'],
            'status' => 'contact_type',
            'date' => ['created_at'],
        ],
    ];

    public function __construct(
        private readonly AiSemanticSearchService $search,
        private readonly AiSettingsService $settings,
    ) {}

    public function available(): bool
    {
        return $this->settings->enabled() && $this->settings->supportsEmbeddings();
    }

    /**
     * @param  array{branch_id?:string|null, source_type?:string|null, limit?:int, min_score?:float}  $filters
     * @return array<int, array<string, mixed>>
     */
    public function retrieve(?User $user, string $query, array $filters = []): array
    {
        if (! $this->available() || trim($query) === '') {
            return [];
        }

        $branchId = $filters['branch_id'] ?? $user?->branch_id;

        try {
            $hits = $this->search->search($query, [
                'limit' => max(1, min(10, (int) ($filters['limit'] ?? 5))),
                'branch_id' => $branchId,
                'min_score' => (float) ($filters['min_score'] ?? 0.15),
            ]);
        } catch (AiProviderException) {
            // Provider can't embed right now — RAG is optional, degrade quietly.
            return [];
        } catch (Throwable) {
            return [];
        }

        $sourceTypeFilter = $filters['source_type'] ?? null;

        return collect($hits)
            ->when($sourceTypeFilter, fn ($c) => $c->where('source_type', $sourceTypeFilter))
            ->map(fn ($hit) => $this->toSourceCard($hit))
            ->values()
            ->all();
    }

    /**
     * @param  array{source_type:string, source_id:string, snippet:string, score:float}  $hit
     * @return array<string, mixed>
     */
    private function toSourceCard(array $hit): array
    {
        $type = $hit['source_type'];
        $map = $this->sourceMap[$type] ?? null;
        $record = $map ? $this->lookupRecord($map, $hit['source_id']) : null;

        $displayNumber = $record['number'] ?? null;
        $title = $displayNumber
            ? trim($map['module'].' '.$displayNumber)
            : Str::headline(str_replace('_', ' ', $type)).' '.Str::limit($hit['source_id'], 8, '');

        return [
            'title' => $title,
            'module' => $map['module'] ?? Str::headline($type),
            'source_type' => $type,
            'source_public_id' => $hit['source_id'],
            'snippet' => Str::limit(trim((string) $hit['snippet']), 280),
            'score' => $hit['score'],
            'metadata' => [
                'display_number' => $displayNumber,
                'status' => $record['status'] ?? null,
                'date' => $record['date'] ?? null,
                'route' => $map ? $map['route'].'/'.$hit['source_id'] : null,
            ],
        ];
    }

    /**
     * Best-effort lookup of display fields for a source record. Defensive about
     * missing tables/columns (dev SQLite vs prod MySQL).
     *
     * @param  array<string, mixed>  $map
     * @return array{number: ?string, status: ?string, date: ?string}|null
     */
    private function lookupRecord(array $map, string $id): ?array
    {
        try {
            if (! Schema::hasTable($map['table'])) {
                return null;
            }

            $row = DB::table($map['table'])->where('id', $id)->first();
            if (! $row) {
                return null;
            }

            return [
                'number' => $this->firstColumn($map['table'], (array) $map['number'], $row),
                'status' => Schema::hasColumn($map['table'], $map['status']) ? ($row->{$map['status']} ?? null) : null,
                'date' => $this->firstColumn($map['table'], (array) $map['date'], $row),
            ];
        } catch (Throwable) {
            return null;
        }
    }

    /**
     * @param  array<int, string>  $candidates
     */
    private function firstColumn(string $table, array $candidates, object $row): ?string
    {
        foreach ($candidates as $column) {
            if (Schema::hasColumn($table, $column) && ! empty($row->{$column})) {
                return (string) $row->{$column};
            }
        }

        return null;
    }
}
