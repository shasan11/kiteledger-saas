<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\AiPermissionService;
use App\Services\AI\Tools\AiToolResult;
use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

abstract class BaseQueryTool
{
    public function __construct(
        protected BranchScopeService $branchScope,
        protected AppContextService $appContext,
        protected AiPermissionService $permissions,
    ) {
    }

    protected function authorize(Request $request, string $permission = 'ai.records.search'): void
    {
        $user = $request->user();
        abort_unless($this->permissions->hasAny($user, [$permission, 'ai.use', 'ai.chat', 'ai.manage']), 403, 'You do not have permission to run this AI query tool.');
    }

    protected function empty(string $tool, string $title, Request $request, array $filters = [], string $summary = 'No data was found.'): array
    {
        return AiToolResult::empty($tool, $title, array_merge($this->contextFilters($request), $filters), $summary)->toArray();
    }

    protected function contextFilters(Request $request): array
    {
        $branchId = $this->branchScope->selectedBranchId($request, $request->user());
        $fiscalYear = null;

        try {
            $fiscalYear = $this->appContext->resolveFiscalYearForRequest($request);
        } catch (\Throwable) {
            $fiscalYear = null;
        }

        return array_filter([
            'branch_id' => $branchId,
            'fiscal_year_id' => $fiscalYear?->id,
        ]);
    }

    protected function applyBranch(Builder $query, Request $request, string $table, string $column = 'branch_id'): Builder
    {
        if (!Schema::hasColumn($table, $column)) {
            return $query;
        }

        $user = $request->user();
        if (!$user) {
            return $query->whereRaw('1 = 0');
        }

        $selected = $this->branchScope->selectedBranchId($request, $user);
        if ($selected !== null) {
            return $query->where($table . '.' . $column, $selected);
        }

        if ($this->branchScope->canViewAllBranches($user)) {
            return $query;
        }

        $accessible = $this->branchScope->accessibleBranchIds($user);
        return empty($accessible)
            ? $query->whereRaw('1 = 0')
            : $query->whereIn($table . '.' . $column, $accessible);
    }

    protected function applyFiscalYear(Builder $query, Request $request, string $table, ?string $dateColumn = null): Builder
    {
        $from = $request->input('from_date');
        $to = $request->input('to_date');

        if ($dateColumn && $from) {
            $query->whereDate($table . '.' . $dateColumn, '>=', $from);
        }

        if ($dateColumn && $to) {
            $query->whereDate($table . '.' . $dateColumn, '<=', $to);
        }

        if ($from || $to || !Schema::hasColumn($table, 'fiscal_year_id')) {
            return $query;
        }

        try {
            $fiscalYear = $this->appContext->resolveFiscalYearForRequest($request);
            if ($fiscalYear) {
                $query->where($table . '.fiscal_year_id', $fiscalYear->id);
            }
        } catch (\Throwable) {
            //
        }

        return $query;
    }

    protected function applyActive(Builder $query, string $table): Builder
    {
        if (Schema::hasColumn($table, 'active')) {
            $query->where(function ($q) use ($table) {
                $q->where($table . '.active', true)->orWhereNull($table . '.active');
            });
        }

        return $query;
    }

    protected function applyApprovedFinancialTruth(Builder $query, string $table = 'journal_vouchers'): Builder
    {
        foreach (['approved' => true, 'void' => false, 'active' => true] as $column => $value) {
            if (Schema::hasColumn($table, $column)) {
                $query->where($table . '.' . $column, $value);
            }
        }

        return $query;
    }

    protected function number(mixed $value): float
    {
        return round((float) ($value ?? 0), 2);
    }

    protected function tableExists(array $tables): bool
    {
        foreach ($tables as $table) {
            if (!Schema::hasTable($table)) {
                return false;
            }
        }

        return true;
    }

    protected function accountNameExpression(string $alias = 'accounts'): \Illuminate\Database\Query\Expression
    {
        return DB::raw("COALESCE({$alias}.name, {$alias}.code, 'Unnamed account')");
    }
}
