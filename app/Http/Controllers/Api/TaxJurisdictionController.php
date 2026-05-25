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

    protected array $relations = ['taxSystem'];

    protected array $relationDetails = [
        'taxSystem' => 'tax_system_id',
    ];

    protected array $searchable = ['name', 'code', 'state_code', 'county_name', 'city_name'];

    protected array $filterable = ['country_code', 'state_code', 'tax_system', 'tax_system_id'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'code', 'country_code', 'state_code', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'country_code' => ['required', 'string', 'size:2'],
        'state_code' => ['nullable', 'string', 'max:20'],
        'county_name' => ['nullable', 'string', 'max:120'],
        'city_name' => ['nullable', 'string', 'max:120'],
        'name' => ['required', 'string', 'max:150'],
        'code' => ['nullable', 'string', 'max:50'],
        'tax_system' => ['nullable', 'string', 'max:80'],
        'tax_system_id' => ['nullable', 'uuid', 'exists:tax_systems,id'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'country_code' => ['sometimes', 'required', 'string', 'size:2'],
            'state_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'county_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'city_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'tax_system' => ['sometimes', 'nullable', 'string', 'max:80'],
            'tax_system_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_systems,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
