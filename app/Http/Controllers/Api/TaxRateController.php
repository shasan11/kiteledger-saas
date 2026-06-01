<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxRate;
use App\Models\TaxRateComponent;
use App\Models\TaxClass;
use App\Models\TaxJurisdiction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class TaxRateController extends BaseCrudApiController
{
    protected string $modelClass = TaxRate::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'taxClass',
        'taxJurisdiction',
        'taxRateComponents',
    ];

    protected array $relationDetails = [
        'taxClass' => 'tax_class_id',
        'taxJurisdiction' => 'tax_jurisdiction_id',
    ];

    protected array $searchable = ['name', 'code', 'report_code'];

    protected array $filterable = [
        'tax_class_id',
        'tax_jurisdiction_id',
        'country_code',
        'tax_type',
        'calculation_method',
        'applies_on',
    ];

    protected array $booleanFilters = ['active', 'inclusive', 'is_default', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'effective_from' => ['from' => 'effective_from_start', 'to' => 'effective_from_end'],
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'rate_percent',
        'is_default',
        'country_code',
        'tax_type',
        'effective_from',
        'effective_to',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'name';

    protected array $nested = [
        'components' => [
            'relation' => 'taxRateComponents',
            'model' => TaxRateComponent::class,
            'foreign_key' => 'tax_rate_id',
            'delete_key' => 'deleted_component_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => ['account'],
            'relation_details' => [
                'account' => 'account_id',
            ],
            'rules' => [
                'component_name' => ['required', 'string', 'max:80'],
                'component_type' => ['required', 'in:vat,cgst,sgst,igst,state_tax,county_tax,city_tax,special_tax,tds,tcs,withholding'],
                'rate_percent' => ['nullable', 'numeric', 'min:0'],
                'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'component_name' => ['required', 'string', 'max:80'],
                'component_type' => ['required', 'in:vat,cgst,sgst,igst,state_tax,county_tax,city_tax,special_tax,tds,tcs,withholding'],
                'rate_percent' => ['nullable', 'numeric', 'min:0'],
                'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'tax_class_id' => ['nullable', 'uuid', 'exists:tax_classes,id'],
        'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
        'country_code' => ['required', 'string', 'size:2'],
        'tax_type' => ['required', 'string', 'max:50'],
        'name' => ['required', 'string', 'max:120'],
        'code' => ['nullable', 'string', 'max:50'],
        'rate_percent' => ['nullable', 'numeric', 'min:0'],
        'description' => ['nullable', 'string', 'max:1000'],
        'inclusive' => ['nullable', 'boolean'],
        'calculation_method' => ['nullable', 'in:single,split,compound'],
        'applies_on' => ['nullable', 'in:sale,purchase,both,expense'],
        'effective_from' => ['nullable', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'report_code' => ['nullable', 'string', 'max:80'],
        'active' => ['nullable', 'boolean'],
        'is_default' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'tax_class_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_classes,id'],
            'tax_jurisdiction_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_jurisdictions,id'],
            'country_code' => ['sometimes', 'required', 'string', 'size:2'],
            'tax_type' => ['sometimes', 'required', 'string', 'max:50'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'rate_percent' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string', 'max:1000'],
            'inclusive' => ['sometimes', 'nullable', 'boolean'],
            'calculation_method' => ['sometimes', 'nullable', 'in:single,split,compound'],
            'applies_on' => ['sometimes', 'nullable', 'in:sale,purchase,both,expense'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:effective_from'],
            'report_code' => ['sometimes', 'nullable', 'string', 'max:80'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_default' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        return $this->ensureSimpleTaxClass($parentData);
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        return $this->ensureSimpleTaxClass($parentData, $record);
    }

    private function ensureSimpleTaxClass(array $data, ?Model $record = null): array
    {
        if (! empty($data['tax_class_id']) || $record?->tax_class_id) {
            return $data;
        }

        $country = $data['country_code'] ?? $record?->country_code ?? 'NP';
        $taxType = $data['tax_type'] ?? $record?->tax_type ?? 'vat';
        $name = $data['name'] ?? $record?->name ?? 'Tax';
        $rate = (float) ($data['rate_percent'] ?? $record?->rate_percent ?? 0);
        $code = strtoupper(Str::slug(($data['code'] ?? '') ?: "{$name} {$rate}", '_'));
        $code = substr($code ?: 'TAX', 0, 30);

        $jurisdiction = TaxJurisdiction::query()->firstOrCreate(
            ['country_code' => $country, 'code' => "{$country}-TAX"],
            [
                'name' => "{$country} Tax",
                'tax_system' => strtolower($country) . '_tax',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $taxClass = TaxClass::query()->firstOrCreate(
            ['country_code' => $country, 'code' => $code],
            [
                'tax_jurisdiction_id' => $jurisdiction->id,
                'name' => $name,
                'tax_type' => $taxType,
                'tax_behavior' => $rate <= 0 ? 'zero_rated' : 'standard',
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $data['tax_class_id'] = $taxClass->id;
        $data['tax_jurisdiction_id'] ??= $jurisdiction->id;

        return $data;
    }
}
