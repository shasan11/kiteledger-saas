<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Services\LocalizationService;
use App\Support\Installer\InstalledState;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function __construct(private readonly LocalizationService $localization) {}

    public function handle(Request $request, Closure $next): Response
    {
        if ($request->is('install', 'install/*') || ! InstalledState::isInstalled()) {
            $locale = $this->staticLocale();
            App::setLocale($locale);
            $request->attributes->set('locale', $locale);
            $request->attributes->set('locale_dir', 'ltr');

            return $next($request);
        }

        $locale = $this->resolveLocale($request);

        App::setLocale($locale);
        $request->attributes->set('locale', $locale);
        $request->attributes->set('locale_dir', $this->localization->direction($locale));

        return $next($request);
    }

    private function resolveLocale(Request $request): string
    {
        // Any locale candidate may hit the database (user, branch, app settings,
        // languages table). Before install those credentials are placeholders
        // and the query throws — which must NOT 500 the installer. Wrap it all
        // and fall back to the statically-configured locale on any failure.
        try {
            $candidates = [
                $request->hasSession() ? $request->session()->get('locale') : null,
                $this->userLocale($request),
                $this->branchLocale($request),
                $this->appSettingLocale(),
                config('app.locale'),
                $this->localization->defaultLocale(),
                LocalizationService::FALLBACK_LOCALE,
            ];

            foreach ($candidates as $candidate) {
                if ($this->localization->isSupported($candidate)) {
                    return $candidate;
                }
            }
        } catch (\Throwable) {
            // A transient DB problem must never take down every page over locale.
        }

        return $this->staticLocale();
    }

    private function staticLocale(): string
    {
        $configured = (string) config('app.locale');

        return $configured !== '' ? $configured : LocalizationService::FALLBACK_LOCALE;
    }

    private function userLocale(Request $request): ?string
    {
        $user = $request->user();

        if (! $user) {
            return null;
        }

        foreach (['locale', 'language'] as $attribute) {
            $value = $user->getAttribute($attribute);

            if (is_string($value) && $value !== '') {
                return $value;
            }
        }

        return null;
    }

    private function branchLocale(Request $request): ?string
    {
        $user = $request->user();

        if (! $user || ! $user->branch_id) {
            return null;
        }

        try {
            return $user->branch?->language?->code;
        } catch (\Throwable) {
            return null;
        }
    }

    private function appSettingLocale(): ?string
    {
        try {
            return AppSetting::query()
                ->where('active', true)
                ->oldest()
                ->value('language')
                ?? AppSetting::query()->oldest()->value('language');
        } catch (\Throwable) {
            return null;
        }
    }
}
