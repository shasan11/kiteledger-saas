<?php

namespace App\Http\Controllers\Api\Pos\Concerns;

use App\Models\PosShift;
use App\Models\PosTerminal;
use App\Services\BranchScopeService;
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
        return $this->branchScope()->applyToQuery($query, $request, $request->user(), $column);
    }

    protected function assertBranchAccess(Request $request, ?string $branchId, string $message = 'You cannot access POS data from another branch.'): void
    {
        if (!$branchId) {
            return;
        }

        abort_unless(
            $this->branchScope()->canAccessBranch($request->user(), (string) $branchId),
            403,
            $message
        );

        $selectedBranchId = $this->branchScope()->selectedBranchId($request, $request->user());

        abort_if(
            $selectedBranchId && (string) $selectedBranchId !== (string) $branchId,
            403,
            $message
        );
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

        $resolved = $this->branchScope()->selectedBranchId($request, $request->user());

        abort_if(!$resolved, 422, 'Select a branch before creating POS records.');

        return $resolved;
    }

    protected function accessibleBranchIds(Request $request): array
    {
        return $this->branchScope()->accessibleBranchIds($request->user());
    }

    protected function canViewAllBranches(Request $request): bool
    {
        return $this->branchScope()->canViewAllBranches($request->user());
    }

    protected function branchScope(): BranchScopeService
    {
        return app(BranchScopeService::class);
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
