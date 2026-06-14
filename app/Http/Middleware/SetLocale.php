<?php

namespace App\Http\Middleware;

use App\Models\AppSetting;
use App\Services\LocalizationService;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Symfony\Component\HttpFoundation\Response;

class SetLocale
{
    public function __construct(private readonly LocalizationService $localization)
    {
    }

    public function handle(Request $request, Closure $next): Response
    {
        $locale = $this->resolveLocale($request);

        App::setLocale($locale);
        $request->attributes->set('locale', $locale);
        $request->attributes->set('locale_dir', $this->localization->direction($locale));

        return $next($request);
    }

    private function resolveLocale(Request $request): string
    {
        $candidates = [
            $request->session()->get('locale'),
            $this->userLocale($request),
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

        return LocalizationService::FALLBACK_LOCALE;
    }

    private function userLocale(Request $request): ?string
    {
        $user = $request->user();

        if (!$user) {
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
