<?php

namespace App\Http\Controllers\Api\Pos\Concerns;

use App\Models\Branch;
use App\Models\PosShift;
use App\Models\PosTerminal;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Schema;

trait AuthorizesPosAccess
{
    protected function authorizePos(string $permission): void
    {
        $user = request()->user();

        abort_if(!$user || !$user->can($permission), 403, 'You do not have permission to perform this POS action.');
    }

    protected function applyBranchScope(Builder $query, Request $request, string $column = 'branch_id'): Builder
    {
        if (!$this->canViewAllBranches($request)) {
            return $query->whereIn($column, $this->accessibleBranchIds($request));
        }

        if ($request->filled('branch_id')) {
            $this->assertBranchAccess($request, (string) $request->input('branch_id'));

            return $query->where($column, (string) $request->input('branch_id'));
        }

        return $query;
    }

    protected function assertBranchAccess(Request $request, ?string $branchId, string $message = 'You cannot access POS data from another branch.'): void
    {
        if (!$branchId || $this->canViewAllBranches($request)) {
            return;
        }

        abort_unless(in_array((string) $branchId, $this->accessibleBranchIds($request), true), 403, $message);
    }

    protected function assertTerminalAccess(Request $request, PosTerminal $terminal): void
    {
        $this->assertBranchAccess($request, $terminal->branch_id, 'You cannot use a POS terminal from another branch.');
    }

    protected function assertShiftAccess(Request $request, PosShift $shift): void
    {
        $this->assertBranchAccess($request, $shift->branch_id, 'You cannot use a POS shift from another branch.');
    }

    protected function resolveWritableBranchId(Request $request, ?string $branchId = null): ?string
    {
        if ($branchId) {
            $this->assertBranchAccess($request, $branchId, 'You cannot create POS records for another branch.');

            return $branchId;
        }

        $user = $request->user();

        return $user?->current_branch_id
            ?? $user?->branch_id
            ?? Branch::query()->where('code', 'MAIN')->value('id')
            ?? Branch::query()->value('id');
    }

    protected function accessibleBranchIds(Request $request): array
    {
        $user = $request->user();

        if (!$user) {
            return [];
        }

        $ids = array_filter([
            $user->current_branch_id ?? null,
            $user->branch_id ?? null,
        ]);

        if (!empty($user->branch_ids) && is_array($user->branch_ids)) {
            foreach ($user->branch_ids as $branchId) {
                if ($branchId) {
                    $ids[] = $branchId;
                }
            }
        }

        try {
            if (method_exists($user, 'branches')) {
                foreach ($user->branches()->pluck('branches.id')->all() as $branchId) {
                    if ($branchId) {
                        $ids[] = $branchId;
                    }
                }
            }
        } catch (\Throwable) {
            //
        }

        if (empty($ids)) {
            $fallback = Branch::query()->where('code', 'MAIN')->value('id') ?? Branch::query()->value('id');

            if ($fallback) {
                $ids[] = $fallback;
            }
        }

        return array_values(array_unique(array_map('strval', $ids)));
    }

    protected function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        try {
            return $user->can('branch.view_all')
                || $user->can('branches.view-all')
                || $user->can('branches.view_all');
        } catch (\Throwable) {
            return false;
        }
    }

    protected function tableHasColumn(string $table, string $column): bool
    {
        try {
            return Schema::hasColumn($table, $column);
        } catch (\Throwable) {
            return false;
        }
    }
}
