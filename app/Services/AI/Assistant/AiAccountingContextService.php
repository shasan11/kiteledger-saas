<?php

namespace App\Services\AI\Assistant;

use App\Services\AppContextService;
use App\Services\BranchScopeService;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

class AiAccountingContextService
{
    public function __construct(
        private readonly BranchScopeService $branchScope,
        private readonly AppContextService $appContext,
    ) {}

    public function applyVoucherScope(Builder $query, Request $request, array $filters = []): Builder
    {
        $user = $request->user();
        $branchId = $filters['branch_id'] ?? $this->branchScope->selectedBranchId($request, $user);

        if ($branchId && Schema::hasColumn('journal_vouchers', 'branch_id')) {
            $query->where('journal_vouchers.branch_id', $branchId);
        } elseif ($user && ! $this->branchScope->canViewAllBranches($user) && Schema::hasColumn('journal_vouchers', 'branch_id')) {
            $ids = $this->branchScope->accessibleBranchIds($user);
            empty($ids) ? $query->whereRaw('1 = 0') : $query->whereIn('journal_vouchers.branch_id', $ids);
        }

        if (! empty($filters['date_range']['from'])) {
            $query->whereDate('journal_vouchers.voucher_date', '>=', $filters['date_range']['from']);
        }

        if (! empty($filters['date_range']['to'])) {
            $query->whereDate('journal_vouchers.voucher_date', '<=', $filters['date_range']['to']);
        }

        if (empty($filters['date_range']['from']) && empty($filters['date_range']['to']) && Schema::hasColumn('journal_vouchers', 'fiscal_year_id')) {
            try {
                $fy = $this->appContext->resolveFiscalYearForRequest($request);
                if ($fy) {
                    $query->where('journal_vouchers.fiscal_year_id', $fy->id);
                }
            } catch (\Throwable) {
                //
            }
        }

        foreach (['approved' => true, 'void' => false, 'active' => true] as $column => $value) {
            if (Schema::hasColumn('journal_vouchers', $column)) {
                $query->where('journal_vouchers.' . $column, $value);
            }
        }

        return $query;
    }
}
