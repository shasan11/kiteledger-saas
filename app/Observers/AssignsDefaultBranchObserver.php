<?php

namespace App\Observers;

use App\Models\Branch;
use App\Models\UserAppContext;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Schema;

class AssignsDefaultBranchObserver
{
    public function creating(Model $model): void
    {
        if (!$this->shouldAssignBranch($model)) {
            return;
        }

        $branchId = $this->requestBranchId()
            ?: $this->userBranchId()
            ?: $this->contextBranchId()
            ?: $this->fallbackBranchId();

        if ($branchId) {
            $model->setAttribute('branch_id', (string) $branchId);
        }
    }

    protected function shouldAssignBranch(Model $model): bool
    {
        return Schema::hasColumn($model->getTable(), 'branch_id')
            && empty($model->getAttribute('branch_id'));
    }

    protected function requestBranchId(): ?string
    {
        if (!app()->bound('request')) {
            return null;
        }

        $request = request();
        $value = $request->input('branch_id')
            ?: $request->header('X-Branch-ID')
            ?: $request->query('branch_id');

        if (!$value || in_array(strtolower((string) $value), ['all', '*'], true)) {
            return null;
        }

        return (string) $value;
    }

    protected function userBranchId(): ?string
    {
        $user = Auth::user();

        return $user?->current_branch_id
            ?: $user?->branch_id
            ?: null;
    }

    protected function contextBranchId(): ?string
    {
        $user = Auth::user();

        if (!$user) {
            return null;
        }

        return UserAppContext::query()
            ->where('user_id', $user->getKey())
            ->value('branch_id');
    }

    protected function fallbackBranchId(): ?string
    {
        return Branch::query()
            ->where('active', true)
            ->where('is_head_office', true)
            ->value('id')
            ?: Branch::query()
                ->where('active', true)
                ->oldest()
                ->value('id');
    }
}
