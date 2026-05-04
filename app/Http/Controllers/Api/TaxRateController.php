<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxRate;
use App\Models\TaxRateComponent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

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

    protected array $booleanFilters = ['active', 'inclusive', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'effective_from' => ['from' => 'effective_from_start', 'to' => 'effective_from_end'],
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'rate_percent',
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
            'relations' => ['account', 'chartOfAccount'],
            'relation_details' => [
                'account' => 'account_id',
                'chartOfAccount' => 'chart_of_account_id',
            ],
            'rules' => [
                'component_name' => ['required', 'string', 'max:80'],
                'component_type' => ['required', 'in:vat,cgst,sgst,igst,state_tax,county_tax,city_tax,special_tax,tds,tcs,withholding'],
                'rate_percent' => ['nullable', 'numeric', 'min:0'],
                'account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
                'chart_of_account_id' => ['nullable', 'integer'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'component_name' => ['required', 'string', 'max:80'],
                'component_type' => ['required', 'in:vat,cgst,sgst,igst,state_tax,county_tax,city_tax,special_tax,tds,tcs,withholding'],
                'rate_percent' => ['nullable', 'numeric', 'min:0'],
                'account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
                'chart_of_account_id' => ['nullable', 'integer'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'tax_class_id' => ['required', 'uuid', 'exists:tax_classes,id'],
        'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
        'country_code' => ['required', 'in:NP,IN,US'],
        'tax_type' => ['required', 'in:vat,gst,sales_tax,use_tax,withholding,tds,tcs'],
        'name' => ['required', 'string', 'max:120'],
        'code' => ['nullable', 'string', 'max:50'],
        'rate_percent' => ['nullable', 'numeric', 'min:0'],
        'inclusive' => ['nullable', 'boolean'],
        'calculation_method' => ['nullable', 'in:single,split,compound'],
        'applies_on' => ['nullable', 'in:sale,purchase,both,expense'],
        'effective_from' => ['nullable', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'report_code' => ['nullable', 'string', 'max:80'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'tax_class_id' => ['sometimes', 'required', 'uuid', 'exists:tax_classes,id'],
            'tax_jurisdiction_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_jurisdictions,id'],
            'country_code' => ['sometimes', 'required', 'in:NP,IN,US'],
            'tax_type' => ['sometimes', 'required', 'in:vat,gst,sales_tax,use_tax,withholding,tds,tcs'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'rate_percent' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'inclusive' => ['sometimes', 'nullable', 'boolean'],
            'calculation_method' => ['sometimes', 'nullable', 'in:single,split,compound'],
            'applies_on' => ['sometimes', 'nullable', 'in:sale,purchase,both,expense'],
            'effective_from' => ['sometimes', 'nullable', 'date'],
            'effective_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:effective_from'],
            'report_code' => ['sometimes', 'nullable', 'string', 'max:80'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
