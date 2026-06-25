<?php

namespace App\Services;

use App\Models\Language;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Schema;

class LocalizationService
{
    public const FALLBACK_LOCALE = 'en';

    public function supportedLanguages(bool $activeOnly = true): Collection
    {
        if ($this->hasLanguageTable()) {
            try {
                $query = Language::query()->orderBy('sort_order')->orderBy('name');

                if ($activeOnly) {
                    $query->where('is_active', true);
                }

                $languages = $query->get();

                $languages = $languages->reject(fn (Language $language) => $language->code === 'ne')->values();

                if ($languages->isNotEmpty()) {
                    return $languages;
                }
            } catch (\Throwable) {
                // JSON language files keep early installs and DB outages usable.
            }
        }

        return collect($this->fileLanguages())->map(
            fn (array $language) => new Language($language),
        );
    }

    public function supportedPayload(bool $activeOnly = true): array
    {
        return $this->supportedLanguages($activeOnly)
            ->map(fn (Language $language) => [
                'id' => $language->exists ? $language->id : null,
                'code' => $language->code,
                'name' => $language->name,
                'native' => $language->native_name,
                'native_name' => $language->native_name,
                'dir' => $language->direction,
                'direction' => $language->direction,
                'date_locale' => $language->date_locale,
                'is_active' => (bool) $language->is_active,
                'is_default' => (bool) $language->is_default,
                'is_system' => (bool) $language->is_system,
                'sort_order' => (int) $language->sort_order,
            ])
            ->values()
            ->all();
    }

    public function supportedCodes(): array
    {
        return $this->supportedLanguages()
            ->pluck('code')
            ->filter()
            ->values()
            ->all();
    }

    public function isSupported(?string $locale): bool
    {
        return is_string($locale)
            && in_array($locale, $this->supportedCodes(), true);
    }

    public function language(?string $locale): ?Language
    {
        if (!$locale) {
            return null;
        }

        return $this->supportedLanguages(false)->firstWhere('code', $locale);
    }

    public function direction(string $locale): string
    {
        return $this->language($locale)?->direction === 'rtl' ? 'rtl' : 'ltr';
    }

    public function defaultLocale(): string
    {
        $default = $this->supportedLanguages()
            ->first(fn (Language $language) => (bool) $language->is_default);

        return $default?->code ?: self::FALLBACK_LOCALE;
    }

    /**
     * @return array<string, string>
     */
    public function translationsFor(string $locale): array
    {
        $fallback = $this->languageTranslationsFor(self::FALLBACK_LOCALE);

        if ($locale === self::FALLBACK_LOCALE) {
            return $fallback;
        }

        return array_merge(
            $fallback,
            $this->languageTranslationsFor($locale),
        );
    }

    /**
     * Return only this language's pack and overrides, without English fallback.
     *
     * @return array<string, string>
     */
    public function languageTranslationsFor(string $locale): array
    {
        return array_merge(
            $this->decodeTranslationFile($locale),
            $this->databaseTranslations($locale),
        );
    }

    /**
     * @return array<string, string>
     */
    public function baseTranslations(): array
    {
        return $this->translationsFor(self::FALLBACK_LOCALE);
    }

    public function clearCache(): void
    {
        Cache::forget('localization.language-table');
    }

    private function hasLanguageTable(): bool
    {
        try {
            return Cache::remember(
                'localization.language-table',
                now()->addMinute(),
                fn () => Schema::hasTable('languages'),
            );
        } catch (\Throwable) {
            // Before install (placeholder DB credentials) or during a DB outage
            // the connection check itself throws — fall back to the bundled JSON
            // language files instead of 500-ing every page, including /install.
            return false;
        }
    }

    /**
     * @return array<string, string>
     */
    private function databaseTranslations(string $locale): array
    {
        if (!$this->hasLanguageTable()) {
            return [];
        }

        try {
            $translations = Language::query()
                ->where('code', $locale)
                ->value('translations');

            if (is_string($translations)) {
                $translations = json_decode($translations, true);
            }

            if (!is_array($translations)) {
                return [];
            }

            return array_filter(
                $translations,
                fn ($value, $key) => is_string($key) && is_string($value) && $value !== '',
                ARRAY_FILTER_USE_BOTH,
            );
        } catch (\Throwable) {
            return [];
        }
    }

    /**
     * @return array<string, string>
     */
    private function decodeTranslationFile(string $locale): array
    {
        $path = resource_path("lang/{$locale}.json");

        if (!is_file($path) || !is_readable($path)) {
            return [];
        }

        try {
            $decoded = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);

            if (!is_array($decoded)) {
                return [];
            }

            return array_filter(
                $decoded,
                fn ($value, $key) => is_string($key) && is_string($value),
                ARRAY_FILTER_USE_BOTH,
            );
        } catch (\Throwable) {
            return [];
        }
    }

    private function fileLanguages(): array
    {
        $known = [
            'en' => ['name' => 'English', 'native_name' => 'English', 'direction' => 'ltr'],
            'es' => ['name' => 'Spanish', 'native_name' => 'Español', 'direction' => 'ltr'],
            'fr' => ['name' => 'French', 'native_name' => 'Français', 'direction' => 'ltr'],
            'ar' => ['name' => 'Arabic', 'native_name' => 'العربية', 'direction' => 'rtl'],
        ];
        $paths = glob(resource_path('lang/*.json')) ?: [];
        $codes = collect($paths)
            ->map(fn (string $path) => pathinfo($path, PATHINFO_FILENAME))
            ->filter(fn (string $code) => $code !== 'ne' && preg_match('/^[a-z]{2,3}(?:-[A-Z]{2})?$/', $code))
            ->unique()
            ->values();

        if ($codes->isEmpty()) {
            $codes = collect([self::FALLBACK_LOCALE]);
        }

        return $codes->map(function (string $code, int $index) use ($known) {
            $meta = $known[$code] ?? [];

            return [
                'code' => $code,
                'name' => $meta['name'] ?? strtoupper($code),
                'native_name' => $meta['native_name'] ?? strtoupper($code),
                'direction' => $meta['direction'] ?? 'ltr',
                'date_locale' => $code,
                'is_active' => true,
                'is_default' => $code === self::FALLBACK_LOCALE,
                'is_system' => array_key_exists($code, $known),
                'sort_order' => $index,
                'translations' => [],
            ];
        })->all();
    }
}
