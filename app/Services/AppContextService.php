<?php

namespace App\Services;

use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\FiscalYear;
use App\Models\User;
use App\Models\UserAppContext;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class AppContextService
{
    public function context(Request $request): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        $savedContext = UserAppContext::query()->where('user_id', $user->getKey())->first();
        $appSettings = AppSetting::query()->with('defaultCurrency', 'fiscalYear')->where('active', true)->oldest()->first()
            ?: AppSetting::query()->with('defaultCurrency', 'fiscalYear')->oldest()->first();

        $accessibleBranches = $this->accessibleBranches($user);
        $branch = $this->resolveBranch($request, $user, $accessibleBranches);
        $fiscalYear = $this->resolveFiscalYear($request, $savedContext, $appSettings);
        $today = Carbon::today();

        return [
            'current_branch' => $branch ? $this->branchPayload($branch) : null,
            'current_branch_id' => $branch?->id,
            'all_branches' => $branch === null && $this->canViewAllBranches($user),
            'current_fiscal_year' => $fiscalYear ? $this->fiscalYearPayload($fiscalYear) : null,
            'current_fiscal_year_id' => $fiscalYear?->id,
            'accessible_branches' => $accessibleBranches->map(fn (Branch $branch) => $this->branchPayload($branch))->values(),
            'available_fiscal_years' => FiscalYear::query()
                ->where('active', true)
                ->orderByDesc('start_date')
                ->get()
                ->map(fn (FiscalYear $year) => $this->fiscalYearPayload($year))
                ->values(),
            'fiscal_year_expired' => $fiscalYear ? $today->gt(Carbon::parse($fiscalYear->end_date)) : false,
            'fiscal_year_locked' => $fiscalYear ? $this->isFiscalYearLocked($fiscalYear) : false,
            'app_settings' => $appSettings,
            'permissions' => [
                'view_all_branches' => $this->canViewAllBranches($user),
                'override_fiscal_year_lock' => $this->canOverrideFiscalYearLock($user),
            ],
        ];
    }

    public function setBranch(Request $request, mixed $branchId): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        if (in_array($branchId, ['all', '*', null, ''], true)) {
            abort_unless($this->canViewAllBranches($user), 403, 'You do not have access to all branches.');

            $this->contextForWrite($user)->forceFill(['branch_id' => null])->save();

            return $this->context($request);
        }

        $branch = Branch::query()->whereKey((string) $branchId)->where('active', true)->firstOrFail();

        abort_unless(
            $this->canViewAllBranches($user) || $this->accessibleBranchIds($user)->contains((string) $branch->id),
            403,
            'You do not have access to this branch.'
        );

        $this->contextForWrite($user)->forceFill(['branch_id' => (string) $branch->id])->save();

        return $this->context($request);
    }

    public function setFiscalYear(Request $request, string $fiscalYearId): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        $fiscalYear = FiscalYear::query()
            ->whereKey($fiscalYearId)
            ->where('active', true)
            ->firstOrFail();

        $this->contextForWrite($user)->forceFill(['fiscal_year_id' => (string) $fiscalYear->id])->save();

        return $this->context($request);
    }

    public function resolveBranchIdForRequest(Request $request): ?string
    {
        $context = $this->context($request);

        return $context['all_branches'] ? 'all' : $context['current_branch_id'];
    }

    public function resolveFiscalYearForRequest(Request $request): ?FiscalYear
    {
        $context = $this->context($request);
        $id = $context['current_fiscal_year_id'] ?? null;

        return $id ? FiscalYear::query()->find($id) : null;
    }

    public function accessibleBranchIds(User $user)
    {
        return $this->accessibleBranches($user)->pluck('id')->map(fn ($id) => (string) $id)->values();
    }

    public function canViewAllBranches(?User $user): bool
    {
        return app(BranchScopeService::class)->canViewAllBranches($user);
    }

    public function canOverrideFiscalYearLock(?User $user): bool
    {
        if ($this->hasAdministrativeBypass($user)) {
            return true;
        }

        return $this->userCan($user, ['fiscal-years.override-lock', 'fiscal_years.override_lock', 'settings.fiscal-years.override-lock']);
    }

    public function isFiscalYearLocked(FiscalYear $fiscalYear): bool
    {
        $status = strtoupper((string) $fiscalYear->status);

        return in_array($status, ['CLOSED', 'LOCKED'], true)
            || ($fiscalYear->lock_date && Carbon::today()->gte(Carbon::parse($fiscalYear->lock_date)));
    }

    private function contextForWrite(User $user): UserAppContext
    {
        return UserAppContext::query()->firstOrCreate(['user_id' => $user->getKey()]);
    }

    private function resolveBranch(Request $request, User $user, $accessibleBranches): ?Branch
    {
        $selectedBranchId = app(BranchScopeService::class)->selectedBranchId($request, $user);

        if (!$selectedBranchId) {
            return null;
        }

        $selectedBranch = $accessibleBranches->firstWhere('id', $selectedBranchId)
            ?: Branch::query()->whereKey($selectedBranchId)->where('active', true)->first();

        abort_unless($selectedBranch, 404, 'Branch not found.');
        app(BranchScopeService::class)->assertCanAccessBranch($user, (string) $selectedBranch->id);

        return $selectedBranch;
    }

    private function resolveFiscalYear(Request $request, ?UserAppContext $savedContext, ?AppSetting $appSettings): ?FiscalYear
    {
        $requested = $request->header('X-Fiscal-Year-ID')
            ?: $request->input('fiscal_year_id')
            ?: $request->query('fiscal_year_id');

        if ($requested) {
            return FiscalYear::query()->whereKey((string) $requested)->where('active', true)->firstOrFail();
        }

        if ($savedContext?->fiscal_year_id) {
            $year = FiscalYear::query()->whereKey($savedContext->fiscal_year_id)->where('active', true)->first();

            if ($year) {
                return $year;
            }
        }

        if ($appSettings?->fiscal_year_id) {
            $year = FiscalYear::query()->whereKey($appSettings->fiscal_year_id)->where('active', true)->first();

            if ($year) {
                return $year;
            }
        }

        return FiscalYear::query()->where('is_current', true)->where('active', true)->first()
            ?: FiscalYear::query()
                ->where('active', true)
                ->whereDate('start_date', '<=', Carbon::today())
                ->whereDate('end_date', '>=', Carbon::today())
                ->first();
    }

    private function accessibleBranches(User $user)
    {
        if ($this->canViewAllBranches($user)) {
            return Branch::query()->where('active', true)->orderByDesc('is_head_office')->orderBy('name')->get();
        }

        $ids = app(BranchScopeService::class)->assignedBranchIds($user);

        if (empty($ids)) {
            // Branch-limited user without an assignment. Do NOT fall back to
            // head office — that silently grants cross-branch read access.
            return Branch::query()->whereRaw('1 = 0')->get();
        }

        return Branch::query()
            ->whereIn('id', $ids)
            ->where('active', true)
            ->orderBy('name')
            ->get();
    }

    private function branchPayload(Branch $branch): array
    {
        return [
            'id' => $branch->id,
            'code' => $branch->code,
            'name' => $branch->name,
            'is_head_office' => (bool) $branch->is_head_office,
            'active' => (bool) $branch->active,
        ];
    }

    private function fiscalYearPayload(FiscalYear $fiscalYear): array
    {
        return [
            'id' => $fiscalYear->id,
            'name' => $fiscalYear->name,
            'code' => $fiscalYear->code,
            'start_date' => optional($fiscalYear->start_date)->toDateString(),
            'end_date' => optional($fiscalYear->end_date)->toDateString(),
            'status' => $fiscalYear->status,
            'is_current' => (bool) $fiscalYear->is_current,
            'active' => (bool) $fiscalYear->active,
            'locked' => $this->isFiscalYearLocked($fiscalYear),
            'expired' => Carbon::today()->gt(Carbon::parse($fiscalYear->end_date)),
        ];
    }

    private function userCan(?User $user, array $permissions): bool
    {
        if (!$user || !method_exists($user, 'can')) {
            return false;
        }

        foreach ($permissions as $permission) {
            try {
                if ($user->can($permission)) {
                    return true;
                }
            } catch (\Throwable) {
                //
            }
        }

        return false;
    }

    private function hasAdministrativeBypass(?User $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        $roles = [
            'Super Admin',
            'Company Owner',
            'Admin',
            'Branch Admin',
            'Full Access User',
            'Full Access Admin',
            'super-admin',
            'admin',
        ];

        $legacyRole = $user->relationLoaded('role') ? $user->getRelation('role') : ($user->role ?? null);

        if ($legacyRole && in_array((string) $legacyRole->name, $roles, true)) {
            return true;
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole($roles);
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }
}
