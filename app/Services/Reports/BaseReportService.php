<?php

namespace App\Services\Reports;

use App\Models\AppSetting;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;

abstract class BaseReportService
{
    protected function response(
        string $title,
        string $categoryLabel,
        string $reportKey,
        array $filters,
        array $columns,
        array $rows,
        array $summary = [],
        array $totals = [],
        array $extra = []
    ): array {
        $company = $this->companyInfo();

        return [
            'title' => $title,
            'category' => $categoryLabel,
            'report_key' => str_replace('-', '_', $reportKey),
            'period' => [
                'from' => $filters['date_from'] ?? $filters['as_of_date'] ?? null,
                'to' => $filters['date_to'] ?? $filters['as_of_date'] ?? null,
            ],
            'filters' => $filters,
            'summary' => $summary,
            'columns' => $columns,
            'rows' => $rows,
            'totals' => $totals,
            'generated_at' => Carbon::now()->format('Y-m-d H:i:s'),
            'company' => $company,
            'company_name' => $company['name'] ?? '',
            ...$extra,
        ];
    }

    /**
     * Pull company branding from the singleton AppSetting row. Returns
     * empty strings when not configured — we never fall back to the
     * application code name (e.g. "KiteLedger") on customer-facing
     * report output.
     */
    protected function companyInfo(): array
    {
        static $cached = null;
        if ($cached !== null) {
            return $cached;
        }

        try {
            $row = AppSetting::query()->first();
        } catch (\Throwable) {
            $row = null;
        }

        $addressParts = array_filter([
            $row?->address_line_1 ?: null,
            $row?->address_line_2 ?: null,
            $row?->city ?: null,
            $row?->state ?: null,
            $row?->postal_code ?: null,
            $row?->country ?: null,
        ]);

        return $cached = [
            'name' => trim((string) ($row?->company_name ?? '')),
            'legal_name' => trim((string) ($row?->legal_name ?? '')),
            'tag_line' => trim((string) ($row?->tag_line ?? '')),
            'address' => trim((string) ($row?->address ?? implode(', ', $addressParts))),
            'phone' => trim((string) ($row?->phone ?? '')),
            'email' => trim((string) ($row?->email ?? '')),
            'website' => trim((string) ($row?->website ?? '')),
            'tax_number' => trim((string) ($row?->tax_number ?? '')),
            'vat_number' => trim((string) ($row?->vat_number ?? '')),
            'registration_number' => trim((string) ($row?->registration_number ?? '')),
            'logo' => $row?->logo ?: null,
        ];
    }

    protected function companyName(): string
    {
        return $this->companyInfo()['name'] ?? '';
    }

    protected function applyBranchFilter(Builder $query, array $filters, ?string $column = 'branch_id'): Builder
    {
        if (! $column || empty($filters['branch_id']) || $filters['branch_id'] === 'all') {
            return $query;
        }

        return $query->where($column, $filters['branch_id']);
    }

    /**
     * Restrict a report query to postings that actually count.
     *
     * $table names the table that carries the status/approved/void columns.
     * It defaults to the query model's own table, but line-level reports must
     * pass the header table explicitly (e.g. 'journal_vouchers' for a query
     * built on journal_voucher_lines) — otherwise the guards below silently
     * find no columns and every draft and voided document leaks into the
     * report. Columns are qualified so the joined tables cannot collide.
     */
    protected function applyStatusApprovalFilters(Builder $query, array $filters, ?string $table = null): Builder
    {
        $table ??= $query->getModel()->getTable();
        $has = fn (string $column): bool => $this->reportColumnExists($table, $column);
        $column = fn (string $name): string => $table.'.'.$name;

        if ($has('status')) {
            if (! empty($filters['status'])) {
                $query->where($column('status'), $filters['status']);
            } elseif (empty($filters['include_draft'])) {
                $query->where(function (Builder $builder) use ($column) {
                    $builder->where($column('status'), '!=', 'draft')->orWhereNull($column('status'));
                });
            }
        }

        $approved = $filters['approved'] ?? null;
        if ($has('approved')) {
            if ($approved !== null && $approved !== '') {
                $query->where($column('approved'), filter_var($approved, FILTER_VALIDATE_BOOL));
            } elseif (empty($filters['include_draft'])) {
                $query->where(function (Builder $builder) use ($column) {
                    $builder->where($column('approved'), true)->orWhereNull($column('approved'));
                });
            }
        }

        // Voided documents are never reportable, whatever the other filters say.
        if ($has('void')) {
            $query->where(function (Builder $builder) use ($column) {
                $builder->where($column('void'), false)->orWhereNull($column('void'));
            });
        }

        return $query;
    }

    private function reportColumnExists(string $table, string $column): bool
    {
        static $cache = [];

        return $cache[$table.'.'.$column] ??= Schema::hasColumn($table, $column);
    }

    protected function toFloat(mixed $value): float
    {
        return round((float) ($value ?? 0), 2);
    }

    protected function total(array|Collection $rows, string $key): float
    {
        $items = $rows instanceof Collection ? $rows->all() : $rows;

        return round(collect($items)->sum(fn ($row) => (float) data_get($row, $key, 0)), 2);
    }

    protected function ageingBucket(int $ageDays): string
    {
        if ($ageDays < 0) {
            return 'Not Due';
        }

        if ($ageDays <= 30) {
            return '0-30';
        }

        if ($ageDays <= 60) {
            return '31-60';
        }

        if ($ageDays <= 90) {
            return '61-90';
        }

        if ($ageDays <= 120) {
            return '91-120';
        }

        return '120+';
    }
}
