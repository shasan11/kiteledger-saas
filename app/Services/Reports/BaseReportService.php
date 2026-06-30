<?php

namespace App\Services\Reports;

use App\Models\AppSetting;
use Carbon\Carbon;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

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

    protected function applyStatusApprovalFilters(Builder $query, array $filters): Builder
    {
        if (! empty($filters['status'])) {
            $query->where('status', $filters['status']);
        } elseif (array_key_exists('include_draft', $filters) && ! $filters['include_draft']) {
            $query->where(function (Builder $builder) {
                $builder->where('status', '!=', 'draft')->orWhereNull('status');
            });
        }

        if ($filters['approved'] !== null && $filters['approved'] !== '') {
            $query->where('approved', filter_var($filters['approved'], FILTER_VALIDATE_BOOL));
        } elseif (empty($filters['include_draft']) && $query->getModel()->isFillable('approved')) {
            $query->where(function (Builder $builder) {
                $builder->where('approved', true)->orWhereNull('approved');
            });
        }

        if ($query->getModel()->isFillable('void')) {
            $query->where(function (Builder $builder) {
                $builder->where('void', false)->orWhereNull('void');
            });
        }

        return $query;
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
