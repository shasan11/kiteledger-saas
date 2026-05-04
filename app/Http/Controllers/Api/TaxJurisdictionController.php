<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxJurisdiction;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxJurisdictionController extends BaseCrudApiController
{
    protected string $modelClass = TaxJurisdiction::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'code', 'state_code', 'county_name', 'city_name'];

    protected array $filterable = ['country_code', 'state_code', 'tax_system'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'code', 'country_code', 'state_code', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'country_code' => ['required', 'in:NP,IN,US'],
        'state_code' => ['nullable', 'string', 'max:20'],
        'county_name' => ['nullable', 'string', 'max:120'],
        'city_name' => ['nullable', 'string', 'max:120'],
        'name' => ['required', 'string', 'max:150'],
        'code' => ['nullable', 'string', 'max:50'],
        'tax_system' => ['required', 'in:nepal_vat,india_gst,usa_sales_tax,withholding,custom'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'country_code' => ['sometimes', 'required', 'in:NP,IN,US'],
            'state_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'county_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'tax_system' => ['sometimes', 'required', 'in:nepal_vat,india_gst,usa_sales_tax,withholding,custom'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
