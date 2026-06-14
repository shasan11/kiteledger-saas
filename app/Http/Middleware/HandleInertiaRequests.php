<?php

namespace App\Http\Middleware;

use App\Services\BranchScopeService;
use App\Services\LocalizationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
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
        $localization = app(LocalizationService::class);
        $locale = $request->attributes->get('locale', App::getLocale());
        $dir = $request->attributes->get('locale_dir', $localization->direction($locale));

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
            'defaultCurrency' => fn () => $this->defaultCurrencyPayload(),
            'locale' => [
                'current' => $locale,
                'fallback' => LocalizationService::FALLBACK_LOCALE,
                'supported' => $localization->supportedPayload(),
                'dir' => $dir,
            ],
            'translations' => fn () => $localization->translationsFor($locale),
        ];
    }

    /**
     * System default currency, shared on every Inertia response so transaction
     * Add forms can prefill the currency selector without an extra round-trip.
     * Returns null when AppSettings has not been seeded yet (early install).
     */
    protected function defaultCurrencyPayload(): ?array
    {
        try {
            $setting = \App\Models\AppSetting::query()->with('defaultCurrency')->first();
            $currency = $setting?->defaultCurrency;

            if (!$currency) {
                return null;
            }

            return [
                'id' => (string) $currency->id,
                'code' => $currency->code,
                'name' => $currency->name,
                'symbol' => $currency->symbol,
                'decimal_places' => (int) ($currency->decimal_places ?? 2),
            ];
        } catch (\Throwable) {
            return null;
        }
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
            'Company Admin',
            'Full Access User',
            'Full Access Admin',
            'super-admin',
            'admin',
        ]);
    }
}
