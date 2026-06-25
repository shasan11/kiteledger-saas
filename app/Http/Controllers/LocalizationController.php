<?php

namespace App\Http\Controllers;

use App\Models\AppSetting;
use App\Models\Language;
use App\Services\LocalizationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class LocalizationController extends Controller
{
    public function change(Request $request, LocalizationService $localization): RedirectResponse
    {
        $validated = $request->validate([
            'locale' => ['required', 'string', Rule::in($localization->supportedCodes())],
            'persist' => ['sometimes', 'boolean'],
        ]);

        $request->session()->put('locale', $validated['locale']);

        if ($request->boolean('persist') && $request->user()) {
            try {
                $request->user()->forceFill([
                    'locale' => $validated['locale'],
                ])->save();
            } catch (\Throwable) {
                // Session switching remains available during setup or DB outages.
            }
        }

        return back();
    }

    public function index(Request $request, LocalizationService $localization): JsonResponse
    {
        $this->authorizeManagement($request);

        return response()->json([
            'languages' => $localization->supportedPayload(false),
            'fallback' => LocalizationService::FALLBACK_LOCALE,
            'key_count' => count($localization->baseTranslations()),
        ]);
    }

    public function store(Request $request, LocalizationService $localization): JsonResponse
    {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'code' => ['required', 'string', 'max:12', 'regex:/^[a-z]{2,3}(?:-[A-Z]{2})?$/', 'not_in:ne', 'unique:languages,code'],
            'name' => ['required', 'string', 'max:80'],
            'native_name' => ['required', 'string', 'max:80'],
            'direction' => ['required', Rule::in(['ltr', 'rtl'])],
            'date_locale' => ['nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
            'copy_from' => ['nullable', 'string', 'exists:languages,code'],
        ]);

        $translations = [];

        if (!empty($validated['copy_from'])) {
            $translations = Language::query()
                ->where('code', $validated['copy_from'])
                ->value('translations') ?? [];
        }

        $language = DB::transaction(function () use ($validated, $translations) {
            if (!empty($validated['is_default'])) {
                Language::query()->update(['is_default' => false]);
            }

            return Language::query()->create([
                'code' => $validated['code'],
                'name' => $validated['name'],
                'native_name' => $validated['native_name'],
                'direction' => $validated['direction'],
                'date_locale' => $validated['date_locale'] ?? $validated['code'],
                'is_active' => $validated['is_active'] ?? true,
                'is_default' => $validated['is_default'] ?? false,
                'is_system' => false,
                'sort_order' => $validated['sort_order'] ?? 100,
                'translations' => is_array($translations) ? $translations : [],
            ]);
        });

        $localization->clearCache();

        return response()->json($language, 201);
    }

    public function update(
        Request $request,
        Language $language,
        LocalizationService $localization,
    ): JsonResponse {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:12',
                'regex:/^[a-z]{2,3}(?:-[A-Z]{2})?$/',
                'not_in:ne',
                Rule::unique('languages', 'code')->ignore($language->id),
            ],
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'native_name' => ['sometimes', 'required', 'string', 'max:80'],
            'direction' => ['sometimes', 'required', Rule::in(['ltr', 'rtl'])],
            'date_locale' => ['sometimes', 'nullable', 'string', 'max:20'],
            'is_active' => ['sometimes', 'boolean'],
            'is_default' => ['sometimes', 'boolean'],
            'sort_order' => ['sometimes', 'integer', 'min:0', 'max:65535'],
        ]);

        if ($language->is_system) {
            unset($validated['code']);
        }

        if ($language->is_default && array_key_exists('is_active', $validated) && !$validated['is_active']) {
            abort(422, 'The default language cannot be disabled.');
        }

        DB::transaction(function () use ($language, $validated) {
            if (!empty($validated['is_default'])) {
                Language::query()->where('id', '!=', $language->id)->update(['is_default' => false]);
                $validated['is_active'] = true;
            }

            $language->update($validated);
        });

        if (!empty($validated['is_default'])) {
            AppSetting::query()->oldest()->first()?->update(['language' => $language->code]);
        }

        $localization->clearCache();

        return response()->json($language->fresh());
    }

    public function destroy(
        Request $request,
        Language $language,
        LocalizationService $localization,
    ): JsonResponse {
        $this->authorizeManagement($request);

        if ($language->is_system || $language->is_default) {
            abort(422, 'System and default languages cannot be deleted.');
        }

        $language->delete();
        $localization->clearCache();

        return response()->json(['deleted' => true]);
    }

    public function translations(
        Request $request,
        Language $language,
        LocalizationService $localization,
    ): JsonResponse {
        $this->authorizeManagement($request);

        $base = $localization->baseTranslations();
        $stored = $localization->languageTranslationsFor($language->code);
        $isFallback = $language->code === LocalizationService::FALLBACK_LOCALE;
        $search = trim((string) $request->query('search', ''));
        $missingOnly = $request->boolean('missing');

        $rows = collect($base)
            ->map(function (string $english, string $key) use ($stored, $isFallback) {
                $value = (string) ($stored[$key] ?? '');
                $missing = trim($value) === ''
                    || (!$isFallback && $value === $english);

                return [
                    'key' => $key,
                    'english' => $english,
                    'value' => $value,
                    'missing' => $missing,
                ];
            })
            ->when($search !== '', fn ($items) => $items->filter(
                fn (array $row) => str_contains(mb_strtolower($row['key']), mb_strtolower($search))
                    || str_contains(mb_strtolower($row['value']), mb_strtolower($search)),
            ))
            ->when($missingOnly, fn ($items) => $items->where('missing', true))
            ->values();

        return response()->json([
            'language' => $language,
            'rows' => $rows,
            'total' => $rows->count(),
            'translated' => $rows->where('missing', false)->count(),
            'key_count' => count($base),
        ]);
    }

    public function updateTranslations(
        Request $request,
        Language $language,
        LocalizationService $localization,
    ): JsonResponse {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'translations' => ['required', 'array'],
            'translations.*' => ['nullable', 'string'],
        ]);

        $base = $localization->baseTranslations();
        $translations = is_array($language->translations) ? $language->translations : [];

        foreach ($validated['translations'] as $key => $value) {
            if (!array_key_exists($key, $base)) {
                continue;
            }

            $value = is_string($value) ? trim($value) : '';

            if ($value === '') {
                unset($translations[$key]);
            } else {
                $translations[$key] = $value;
            }
        }

        ksort($translations);
        $language->update(['translations' => $translations]);
        $effective = $localization->languageTranslationsFor($language->code);
        $translated = collect($base)->filter(function (string $english, string $key) use ($effective, $language) {
            $value = trim((string) ($effective[$key] ?? ''));

            return $value !== ''
                && ($language->code === LocalizationService::FALLBACK_LOCALE || $value !== $english);
        })->count();

        return response()->json([
            'saved' => true,
            'translated' => $translated,
        ]);
    }

    public function importTranslations(
        Request $request,
        Language $language,
        LocalizationService $localization,
    ): JsonResponse {
        $this->authorizeManagement($request);

        $validated = $request->validate([
            'translations' => ['required', 'array'],
            'translations.*' => ['nullable', 'string'],
            'replace' => ['sometimes', 'boolean'],
        ]);
        $base = $localization->baseTranslations();
        $incoming = array_filter(
            $validated['translations'],
            fn ($value, $key) => array_key_exists($key, $base) && is_string($value),
            ARRAY_FILTER_USE_BOTH,
        );
        $translations = $request->boolean('replace')
            ? $incoming
            : array_merge($language->translations ?? [], $incoming);

        ksort($translations);
        $language->update(['translations' => $translations]);

        return response()->json(['imported' => count($incoming)]);
    }

    private function authorizeManagement(Request $request): void
    {
        $user = $request->user();

        if (!$user) {
            abort(403);
        }

        if (!empty($user->is_super_admin)) {
            return;
        }

        $roleNames = [
            $user->role?->name,
            ...($user->relationLoaded('roles') ? $user->roles->pluck('name')->all() : []),
            ...(method_exists($user, 'getRoleNames') ? $user->getRoleNames()->all() : []),
        ];

        if (collect($roleNames)->filter()->intersect([
            'Super Admin',
            'Company Owner',
            'Admin',
            'Company Admin',
            'Full Access User',
            'Full Access Admin',
            'super-admin',
            'admin',
        ])->isNotEmpty()) {
            return;
        }

        abort(403, 'You are not allowed to manage languages.');
    }
}
