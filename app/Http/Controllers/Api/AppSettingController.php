<?php

namespace App\Http\Controllers\Api;

use App\Models\AppSetting;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;

class AppSettingController extends BaseCrudApiController
{
    protected string $modelClass = AppSetting::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'defaultCurrency',
        'fiscalYear',
    ];

    protected array $relationDetails = [
        'defaultCurrency' => 'default_currency_id',
        'fiscalYear' => 'fiscal_year_id',
    ];

    protected array $searchable = [
        'company_name',
        'email',
        'phone',
        'website',
    ];

    protected array $sortable = [
        'id',
        'company_name',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'company_name' => ['required', 'string', 'max:180'],
        'legal_name' => ['nullable', 'string', 'max:180'],
        'registration_number' => ['nullable', 'string', 'max:80'],
        'tax_number' => ['nullable', 'string', 'max:80'],
        'vat_number' => ['nullable', 'string', 'max:80'],
        'tag_line' => ['nullable', 'string', 'max:200'],

        'address' => ['nullable', 'string', 'max:255'],
        'phone' => ['nullable', 'string', 'max:40'],
        'email' => ['nullable', 'email', 'max:120'],
        'website' => ['nullable', 'string', 'max:180'],

        'address_line_1' => ['nullable', 'string', 'max:255'],
        'address_line_2' => ['nullable', 'string', 'max:255'],
        'city' => ['nullable', 'string', 'max:80'],
        'state' => ['nullable', 'string', 'max:80'],
        'postal_code' => ['nullable', 'string', 'max:40'],
        'country' => ['nullable', 'string', 'max:80'],

        'default_currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'fiscal_year_id' => ['nullable', 'uuid', 'exists:fiscal_years,id'],

        'timezone' => ['nullable', 'string', 'max:80'],
        'date_format' => ['nullable', 'string', 'max:30'],
        'time_format' => ['nullable', 'string', 'max:30'],
        'number_format' => ['nullable', 'string', 'max:40'],
        'language' => ['nullable', 'string', 'max:20'],
        'week_start_day' => ['nullable', 'string', 'max:20'],
        'financial_year_start_month' => ['nullable', 'integer', 'min:1', 'max:12'],
        'use_nepali_calendar' => ['nullable', 'boolean'],

        'footer' => ['nullable', 'string'],

        'logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        'dark_logo' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        'favicon' => ['nullable', 'file', 'mimes:jpg,jpeg,png,webp,ico,svg', 'max:1024'],

        'remove_logo' => ['nullable', 'boolean'],
        'remove_dark_logo' => ['nullable', 'boolean'],
        'remove_favicon' => ['nullable', 'boolean'],

        'brand_primary_color' => ['nullable', 'string', 'max:20'],
        'brand_secondary_color' => ['nullable', 'string', 'max:20'],
        'brand_accent_color' => ['nullable', 'string', 'max:20'],
        'brand_sidebar_color' => ['nullable', 'string', 'max:20'],
        'brand_header_color' => ['nullable', 'string', 'max:20'],
        'brand_text_color' => ['nullable', 'string', 'max:20'],

        'suggest_selling' => ['nullable', 'in:recent,fixed'],
        'negative_cash_balance' => ['nullable', 'in:reject,warn,do_nothing'],
        'negative_item_balance' => ['nullable', 'in:reject,warn,do_nothing'],
        'credit_limit_exceed' => ['nullable', 'in:reject,warn,do_nothing'],

        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    public function singletonShow(Request $request)
    {
        $this->checkAccess($request, 'show');

        $record = AppSetting::query()
            ->with($this->eagerLoadRelations())
            ->orderBy('created_at')
            ->first();

        if (!$record) {
            return response()->json(null);
        }

        return response()->json($this->serializeAppSetting($record));
    }

    public function singletonUpsert(Request $request)
    {
        $this->checkAccess($request, 'update');

        $record = AppSetting::query()
            ->orderBy('created_at')
            ->first();

        $this->normalizeBooleanFields($request);

        $rules = $record
            ? $this->makeRulesPartial($this->storeRules)
            : $this->storeRules;

        $validated = Validator::make($request->all(), $rules)->validate();

        $this->removeUploadOnlyFields($validated);

        if (!$record) {
            $record = new AppSetting();
        }

        $record->fill($validated);

        $this->handleBrandingUploads($request, $record);

        $record->save();

        $record->load($this->eagerLoadRelations());

        return response()->json($this->serializeAppSetting($record));
    }

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $this->normalizeBooleanFields($request);

        $validated = Validator::make($request->all(), $this->storeRules)->validate();

        $this->removeUploadOnlyFields($validated);

        $record = new AppSetting();
        $record->fill($validated);

        $this->handleBrandingUploads($request, $record);

        $record->save();

        $record->load($this->eagerLoadRelations());

        return response()->json($this->serializeAppSetting($record), 201);
    }

    public function update(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);

        $this->normalizeBooleanFields($request);

        $rules = $this->makeRulesPartial($this->storeRules);

        $validated = Validator::make($request->all(), $rules)->validate();

        $this->removeUploadOnlyFields($validated);

        $record->fill($validated);

        $this->handleBrandingUploads($request, $record);

        $record->save();

        $record->load($this->eagerLoadRelations());

        return response()->json($this->serializeAppSetting($record));
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    protected function serializeAppSetting(AppSetting $record): array
    {
        return $this->serializeRecord($record);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        if (!$record instanceof AppSetting) {
            return $data;
        }

        $data['logo_url'] = $this->makePublicFileUrl($record->logo);
        $data['dark_logo_url'] = $this->makePublicFileUrl($record->dark_logo);
        $data['favicon_url'] = $this->makePublicFileUrl($record->favicon);

        return $data;
    }

    protected function handleBrandingUploads(Request $request, AppSetting $record): void
    {
        $files = [
            'logo' => [
                'remove' => 'remove_logo',
                'directory' => 'company/logos',
            ],
            'dark_logo' => [
                'remove' => 'remove_dark_logo',
                'directory' => 'company/logos',
            ],
            'favicon' => [
                'remove' => 'remove_favicon',
                'directory' => 'company/favicons',
            ],
        ];

        foreach ($files as $field => $config) {
            if ($request->boolean($config['remove'])) {
                $this->deletePublicFile($record->{$field});
                $record->{$field} = null;
            }

            if ($request->hasFile($field)) {
                $this->deletePublicFile($record->{$field});

                $record->{$field} = $request
                    ->file($field)
                    ->store($config['directory'], 'public');
            }
        }
    }

    protected function removeUploadOnlyFields(array &$validated): void
    {
        unset(
            $validated['logo'],
            $validated['dark_logo'],
            $validated['favicon'],
            $validated['remove_logo'],
            $validated['remove_dark_logo'],
            $validated['remove_favicon']
        );
    }

    protected function makePublicFileUrl(?string $path): ?string
    {
        if (!$path) {
            return null;
        }

        $path = trim($path);

        if (
            str_starts_with($path, 'http://') ||
            str_starts_with($path, 'https://')
        ) {
            return $path;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'public/')) {
            $path = substr($path, 7);
        }

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, 8);
        }

        if (!Storage::disk('public')->exists($path)) {
            return null;
        }

        return rtrim(config('app.url'), '/') . '/storage/' . $path;
    }

    protected function deletePublicFile(?string $path): void
    {
        if (!$path) {
            return;
        }

        $path = trim($path);

        if (
            str_starts_with($path, 'http://') ||
            str_starts_with($path, 'https://')
        ) {
            return;
        }

        $path = ltrim($path, '/');

        if (str_starts_with($path, 'public/')) {
            $path = substr($path, 7);
        }

        if (str_starts_with($path, 'storage/')) {
            $path = substr($path, 8);
        }

        if (Storage::disk('public')->exists($path)) {
            Storage::disk('public')->delete($path);
        }
    }

    protected function normalizeBooleanFields(Request $request): void
    {
        foreach ([
            'use_nepali_calendar',
            'active',
            'is_system_generated',
            'remove_logo',
            'remove_dark_logo',
            'remove_favicon',
        ] as $field) {
            if (!$request->has($field)) {
                continue;
            }

            $value = $request->input($field);

            if ($value === true || $value === false || $value === 1 || $value === 0) {
                continue;
            }

            if ($value === 'true' || $value === '1') {
                $request->merge([$field => true]);
            }

            if ($value === 'false' || $value === '0') {
                $request->merge([$field => false]);
            }
        }
    }
}