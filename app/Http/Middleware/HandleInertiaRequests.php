<?php

namespace App\Http\Middleware;

use App\Models\Branch;
use Illuminate\Http\Request;
use Inertia\Middleware;

class HandleInertiaRequests extends Middleware
{
    /**
     * The root template that is loaded on the first page visit.
     *
     * @var string
     */
    protected $rootView = 'app';

    /**
     * Determine the current asset version.
     */
    public function version(Request $request): ?string
    {
        return parent::version($request);
    }

    /**
     * Define the props that are shared by default.
     *
     * @return array<string, mixed>
     */
    public function share(Request $request): array
    {
        $user = $request->user();

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => fn () => $user?->getAllPermissions()->pluck('name')->values()->all() ?? [],
                'currentBranchId' => fn () => $this->selectedBranchId($user),
            ],
            'branchContext' => fn () => $this->branchContext($request),
        ];
    }

    protected function branchContext(Request $request): array
    {
        $user = $request->user();
        $canViewAll = $this->canViewAllBranches($user);
        $selectedBranchId = $this->selectedBranchId($user);
        $accessibleBranchIds = $this->accessibleBranchIds($user);

        $branches = Branch::query()
            ->when(!$canViewAll && !empty($accessibleBranchIds), fn ($query) => $query->whereIn('id', $accessibleBranchIds))
            ->orderByDesc('is_head_office')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'active'])
            ->map(fn (Branch $branch) => [
                'id' => (string) $branch->id,
                'name' => $branch->name,
                'code' => $branch->code,
                'active' => (bool) $branch->active,
            ])
            ->values();

        return [
            'canViewAllBranches' => $canViewAll,
            'selectedBranchId' => $selectedBranchId,
            'branches' => $branches,
        ];
    }

    protected function selectedBranchId($user): ?string
    {
        if (!$user) {
            return null;
        }

        if (!empty($user->current_branch_id)) {
            return (string) $user->current_branch_id;
        }

        if (!empty($user->branch_id)) {
            return (string) $user->branch_id;
        }

        return null;
    }

    protected function accessibleBranchIds($user): array
    {
        if (!$user) {
            return [];
        }

        $ids = [];

        if (!empty($user->current_branch_id)) {
            $ids[] = (string) $user->current_branch_id;
        }

        if (!empty($user->branch_id)) {
            $ids[] = (string) $user->branch_id;
        }

        if (!empty($user->branch_ids) && is_array($user->branch_ids)) {
            foreach ($user->branch_ids as $branchId) {
                if ($branchId) {
                    $ids[] = (string) $branchId;
                }
            }
        }

        try {
            if (method_exists($user, 'branches')) {
                foreach ($user->branches()->pluck('branches.id')->all() as $branchId) {
                    if ($branchId) {
                        $ids[] = (string) $branchId;
                    }
                }
            }
        } catch (\Throwable) {
            //
        }

        return array_values(array_unique(array_filter($ids)));
    }

    protected function canViewAllBranches($user): bool
    {
        if (!$user) {
            return false;
        }

        try {
            return $user->can('branch.view_all');
        } catch (\Throwable) {
            return false;
        }
    }
}
