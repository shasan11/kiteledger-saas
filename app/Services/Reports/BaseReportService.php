<?php

namespace App\Services\Reports;

use App\Models\GeneralSetting;
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
            'company_name' => $this->companyName(),
            ...$extra,
        ];
    }

    protected function companyName(): string
    {
        return GeneralSetting::query()->value('company_name')
            ?? config('app.name', 'ERP');
    }

    protected function applyBranchFilter(Builder $query, array $filters, ?string $column = 'branch_id'): Builder
    {
        if (!$column || empty($filters['branch_id']) || $filters['branch_id'] === 'all') {
            return $query;
        }

        return $query->where($column, $filters['branch_id']);
    }

    protected function applyStatusApprovalFilters(Builder $query, array $filters): Builder
    {
        if (!empty($filters['status'])) {
            $query->where('status', $filters['status']);
        } elseif (array_key_exists('include_draft', $filters) && !$filters['include_draft']) {
            $query->where(function (Builder $builder) {
                $builder->where('status', '!=', 'draft')->orWhereNull('status');
            });
        }

        if ($filters['approved'] !== null && $filters['approved'] !== '') {
            $query->where('approved', filter_var($filters['approved'], FILTER_VALIDATE_BOOL));
        } elseif ($query->getModel()->isFillable('approved')) {
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
