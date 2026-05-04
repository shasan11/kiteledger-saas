<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxRule;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxRuleController extends BaseCrudApiController
{
    protected string $modelClass = TaxRule::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'taxJurisdiction',
        'taxRate',
        'productTaxCategory',
    ];

    protected array $relationDetails = [
        'taxJurisdiction' => 'tax_jurisdiction_id',
        'taxRate' => 'tax_rate_id',
        'productTaxCategory' => 'product_tax_category_id',
    ];

    protected array $searchable = ['from_state_code', 'to_state_code'];

    protected array $filterable = [
        'tax_jurisdiction_id',
        'tax_rate_id',
        'product_tax_category_id',
        'country_code',
        'transaction_type',
        'customer_type',
        'supply_type',
    ];

    protected array $booleanFilters = ['active', 'reverse_charge', 'is_system_generated'];

    protected array $sortable = ['id', 'priority', 'country_code', 'transaction_type', 'created_at', 'updated_at'];

    protected string $defaultSort = 'priority';

    protected array $storeRules = [
        'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
        'tax_rate_id' => ['required', 'uuid', 'exists:tax_rates,id'],
        'product_tax_category_id' => ['nullable', 'uuid', 'exists:product_tax_categories,id'],
        'country_code' => ['required', 'in:NP,IN,US'],
        'transaction_type' => ['required', 'in:sale,purchase,expense,import,export'],
        'customer_type' => ['nullable', 'in:registered,unregistered,consumer,business,exempt,any'],
        'supply_type' => ['nullable', 'in:local,intrastate,interstate,import,export,any'],
        'from_state_code' => ['nullable', 'string', 'max:20'],
        'to_state_code' => ['nullable', 'string', 'max:20'],
        'reverse_charge' => ['nullable', 'boolean'],
        'priority' => ['nullable', 'integer', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'tax_jurisdiction_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_jurisdictions,id'],
            'tax_rate_id' => ['sometimes', 'required', 'uuid', 'exists:tax_rates,id'],
            'product_tax_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_tax_categories,id'],
            'country_code' => ['sometimes', 'required', 'in:NP,IN,US'],
            'transaction_type' => ['sometimes', 'required', 'in:sale,purchase,expense,import,export'],
            'customer_type' => ['sometimes', 'nullable', 'in:registered,unregistered,consumer,business,exempt,any'],
            'supply_type' => ['sometimes', 'nullable', 'in:local,intrastate,interstate,import,export,any'],
            'from_state_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'to_state_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'reverse_charge' => ['sometimes', 'nullable', 'boolean'],
            'priority' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
