<?php

namespace App\Http\Controllers\Api;

use App\Models\AppSetting;
use Illuminate\Http\Request;

class AppSettingController extends BaseCrudApiController
{
    protected string $modelClass = AppSetting::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['defaultCurrency', 'fiscalYear'];

    protected array $relationDetails = [
        'defaultCurrency' => 'default_currency_id',
        'fiscalYear' => 'fiscal_year_id',
    ];

    protected array $searchable = ['company_name', 'email', 'phone', 'website'];

    protected array $sortable = ['id', 'company_name', 'created_at', 'updated_at'];

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
        'logo' => ['nullable', 'string', 'max:255'],
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

        $record = AppSetting::query()->orderBy('created_at')->first();

        if (!$record) {
            return response()->json(null);
        }

        return response()->json(
            $this->serializeRecord($record->load($this->eagerLoadRelations()))
        );
    }

    public function singletonUpsert(Request $request)
    {
        $record = AppSetting::query()->orderBy('created_at')->first();

        if (!$record) {
            return $this->store($request);
        }

        return $this->update($request, $record->getKey());
    }

    protected function updateRules(Request $request, \Illuminate\Database\Eloquent\Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }
}
