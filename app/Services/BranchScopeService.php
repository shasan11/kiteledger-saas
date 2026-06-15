<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class BranchScopeService
{
    public const PERMISSION_VIEW_ALL = 'system.branch.view_all';
    public const PERMISSION_SWITCH = 'system.branch.switch';
    public const PERMISSION_MANAGE_ALL = 'system.branch.manage_all';

    /**
     * Roles whose holders implicitly bypass branch scoping.
     * Canonical names + a couple of legacy aliases kept until data is migrated.
     */
    public const ABOVE_BRANCH_ROLES = [
        'Super Admin',
        'Admin',
        'Company Owner',
        'Company Admin',
        'Main Branch Admin',
        // FullPermissionUserSeeder creates these roles and grants them every
        // permission in the system. They are documented god-mode admins and
        // must bypass branch scoping the same way Super Admin does.
        'Full Access User',
        'Full Access Admin',
        'super-admin',
        'admin',
    ];

    /**
     * Permission names that grant cross-branch read access. The first entry is
     * the canonical name; the remainder are backward-compatible aliases that
     * existing role assignments may still hold. Remove aliases after data
     * migration is verified in production.
     */
    public const VIEW_ALL_ALIASES = [
        self::PERMISSION_VIEW_ALL,
        'branch.view_all',
        'branches.view_all',
        'branches.view-all',
    ];

    public function canViewAllBranches(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        $legacyRole = $user->relationLoaded('role') ? $user->getRelation('role') : ($user->role ?? null);

        if ($legacyRole && in_array((string) $legacyRole->name, self::ABOVE_BRANCH_ROLES, true)) {
            return true;
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole(self::ABOVE_BRANCH_ROLES)) {
                    return true;
                }
            } catch (\Throwable) {
                // ignore – roles table may be missing during seeding
            }
        }

        // IMPORTANT: use Spatie's hasPermissionTo, not $user->can(). The
        // latter routes through Laravel's Gate which may have a `Gate::before`
        // hook that auto-grants every ability to unrelated roles — that
        // would silently make a Branch Admin view-all-capable.
        if (method_exists($user, 'hasPermissionTo')) {
            foreach (self::VIEW_ALL_ALIASES as $permission) {
                try {
                    if ($user->hasPermissionTo($permission)) {
                        return true;
                    }
                } catch (\Throwable) {
                    // permission may not exist in DB yet — keep checking aliases
                }
            }
        }

        return false;
    }

    public function canSwitchBranch(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if ($this->canViewAllBranches($user)) {
            return true;
        }

        try {
            if (method_exists($user, 'hasPermissionTo') && $user->hasPermissionTo(self::PERMISSION_SWITCH)) {
                return true;
            }
        } catch (\Throwable) {
            //
        }

        return count($this->assignedBranchIds($user)) > 1;
    }

    /**
     * Branches explicitly assigned to a user via user.branch_id, pivot, or
     * legacy branch_ids attribute. Does NOT fall back to head office.
     */
    public function assignedBranchIds(?User $user): array
    {
        if (!$user) {
            return [];
        }

        $ids = [];

        if (!empty($user->branch_id)) {
            $ids[] = (string) $user->branch_id;
        }

        if (!empty($user->current_branch_id)) {
            $ids[] = (string) $user->current_branch_id;
        }

        if (!empty($user->branch_ids) && is_array($user->branch_ids)) {
            foreach ($user->branch_ids as $id) {
                if ($id) {
                    $ids[] = (string) $id;
                }
            }
        }

        if (method_exists($user, 'branches')) {
            try {
                foreach ($user->branches()->pluck('branches.id')->all() as $id) {
                    if ($id) {
                        $ids[] = (string) $id;
                    }
                }
            } catch (\Throwable) {
                //
            }
        }

        return array_values(array_unique(array_filter($ids)));
    }

    /**
     * Branch IDs a user is allowed to read. For above-branch users this is
     * every active branch. For branch-limited users this is exactly their
     * assigned set — no head-office fallback.
     */
    public function accessibleBranchIds(?User $user): array
    {
        if (!$user) {
            return [];
        }

        if ($this->canViewAllBranches($user)) {
            return Branch::query()
                ->where('active', true)
                ->pluck('id')
                ->map(fn ($id) => (string) $id)
                ->all();
        }

        return $this->assignedBranchIds($user);
    }

    public function isBranchLimited(?User $user): bool
    {
        return $user && !$this->canViewAllBranches($user);
    }

    /**
     * Resolve which branch the request should be scoped to.
     *
     * Returns null when the result is "all branches" (only legal for users
     * who can view all branches). Returns a UUID string otherwise.
     *
     * Aborts 403 when a branch-limited user tries to access a branch outside
     * their assigned set or requests `all`.
     */
    public function selectedBranchId(Request $request, ?User $user): ?string
    {
        $user ??= $request->user();

        if (!$user) {
            return null;
        }

        $requested = $this->normalizeRequestedBranch($request);

        if ($requested === 'all') {
            abort_unless($this->canViewAllBranches($user), 403, 'You do not have access to all branches.');
            return null;
        }

        if ($requested) {
            $this->assertCanAccessBranch($user, $requested);
            return $requested;
        }

        // No per-request override — fall back to persisted context.
        $savedBranchId = optional(
            \App\Models\UserAppContext::query()->where('user_id', $user->getKey())->first()
        )->branch_id;

        if ($savedBranchId === null) {
            // explicit "all" was previously saved
            if ($this->canViewAllBranches($user)) {
                return null;
            }
        } elseif ($savedBranchId) {
            // saved a specific branch — must still be accessible today
            if ($this->canAccessBranch($user, (string) $savedBranchId)) {
                return (string) $savedBranchId;
            }
        }

        // Default for branch-limited users: their own assigned branch.
        $assigned = $this->assignedBranchIds($user);

        if (count($assigned) === 1) {
            return $assigned[0];
        }

        if ($this->canViewAllBranches($user)) {
            return null; // default to "all"
        }

        return $assigned[0] ?? null;
    }

    public function selectedBranchMode(Request $request, ?User $user): string
    {
        $user ??= $request->user();

        if (!$user) {
            return 'none';
        }

        $id = $this->selectedBranchId($request, $user);

        if ($id === null) {
            return $this->canViewAllBranches($user) ? 'all' : 'none';
        }

        return 'selected';
    }

    public function canAccessBranch(?User $user, ?string $branchId): bool
    {
        if (!$user || !$branchId) {
            return false;
        }

        if ($this->canViewAllBranches($user)) {
            return true;
        }

        return in_array((string) $branchId, $this->assignedBranchIds($user), true);
    }

    public function assertCanAccessBranch(?User $user, ?string $branchId): void
    {
        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($branchId === null || $branchId === '') {
            return;
        }

        if (!$this->canAccessBranch($user, $branchId)) {
            abort(403, 'You do not have access to this branch.');
        }
    }

    /**
     * Apply branch scoping to a query based on the current request + user.
     */
    public function applyToQuery(
        Builder $query,
        Request $request,
        ?User $user = null,
        string $branchColumn = 'branch_id',
        ?string $tableAlias = null
    ): Builder {
        $user ??= $request->user();

        if (!$user) {
            return $query->whereRaw('1 = 0');
        }

        $column = $tableAlias
            ? "{$tableAlias}.{$branchColumn}"
            : $branchColumn;

        if ($this->canViewAllBranches($user)) {
            $selected = $this->selectedBranchId($request, $user);

            if ($selected !== null) {
                $query->where($column, $selected);
            }

            return $query;
        }

        $accessible = $this->accessibleBranchIds($user);

        if (empty($accessible)) {
            // Branch-limited user with zero assignments — return nothing.
            // Never fall back to head office.
            return $query->whereRaw('1 = 0');
        }

        $selected = $this->selectedBranchId($request, $user);

        if ($selected !== null) {
            return $query->where($column, $selected);
        }

        return $query->whereIn($column, $accessible);
    }

    /**
     * Read the requested branch from query, then header, then body.
     * Returns the literal "all" string for all-branches requests, a uuid
     * string for a specific branch, or null when nothing was supplied.
     */
    public function normalizeRequestedBranch(Request $request): ?string
    {
        $raw = $request->query('branch_id')
            ?? $request->header('X-Branch-ID')
            ?? $request->input('branch_id');

        if ($raw === null || $raw === '') {
            return null;
        }

        $value = (string) $raw;

        if (in_array(strtolower($value), ['all', '*'], true)) {
            return 'all';
        }

        return $value;
    }

    /**
     * Snapshot of branch context for sharing with the frontend.
     */
    public function resolveContext(Request $request): array
    {
        $user = $request->user();

        if (!$user) {
            return [
                'canViewAllBranches' => false,
                'canSwitchBranch' => false,
                'selectedBranchId' => null,
                'selectedBranchMode' => 'none',
                'branches' => [],
                'accessibleBranchIds' => [],
            ];
        }

        $canViewAll = $this->canViewAllBranches($user);
        $accessible = $this->accessibleBranchIds($user);
        $selected = $this->selectedBranchId($request, $user);

        $branches = Branch::query()
            ->when(!$canViewAll, fn ($q) => $q->whereIn('id', $accessible ?: ['__none__']))
            ->where('active', true)
            ->orderByDesc('is_head_office')
            ->orderBy('name')
            ->get(['id', 'name', 'code', 'active', 'is_head_office'])
            ->map(fn (Branch $b) => [
                'id' => (string) $b->id,
                'name' => $b->name,
                'code' => $b->code,
                'active' => (bool) $b->active,
                'is_head_office' => (bool) $b->is_head_office,
            ])
            ->values()
            ->all();

        return [
            'canViewAllBranches' => $canViewAll,
            'canSwitchBranch' => $this->canSwitchBranch($user),
            'selectedBranchId' => $selected,
            'selectedBranchMode' => $selected === null
                ? ($canViewAll ? 'all' : 'none')
                : 'selected',
            'branches' => $branches,
            'accessibleBranchIds' => $accessible,
        ];
    }
}
