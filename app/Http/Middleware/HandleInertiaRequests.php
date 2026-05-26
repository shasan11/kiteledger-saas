<?php

namespace App\Http\Middleware;

use App\Services\BranchScopeService;
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
        $scope = app(BranchScopeService::class);

        return [
            ...parent::share($request),
            'auth' => [
                'user' => $user,
                'permissions' => fn () => $user?->getAllPermissions()->pluck('name')->values()->all() ?? [],
                'roles' => fn () => $user && method_exists($user, 'getRoleNames')
                    ? $user->getRoleNames()->values()->all()
                    : [],
                'canBypassPermissions' => fn () => $this->canBypassPermissions($user),
                'currentBranchId' => fn () => $scope->selectedBranchId($request, $user),
            ],
            'branchContext' => fn () => $scope->resolveContext($request),
        ];
    }

    protected function canBypassPermissions($user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        if (!method_exists($user, 'hasAnyRole')) {
            return false;
        }

        return $user->hasAnyRole([
            'Super Admin',
            'Company Owner',
            'Admin',
            'super-admin',
            'admin',
        ]);
    }
}
