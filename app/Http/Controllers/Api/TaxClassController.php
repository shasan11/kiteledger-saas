<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxClass;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxClassController extends BaseCrudApiController
{
    protected string $modelClass = TaxClass::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['taxJurisdiction'];

    protected array $relationDetails = [
        'taxJurisdiction' => 'tax_jurisdiction_id',
    ];

    protected array $searchable = ['name', 'code', 'description'];

    protected array $filterable = ['tax_jurisdiction_id', 'country_code', 'tax_type', 'tax_behavior'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'code', 'country_code', 'tax_type', 'created_at', 'updated_at'];

    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
        'country_code' => ['required', 'string', 'size:2'],
        'name' => ['required', 'string', 'max:120'],
        'code' => ['required', 'string', 'max:30'],
        'tax_type' => ['required', 'string', 'max:50'],
        'tax_behavior' => ['nullable', 'in:standard,exempt,zero_rated,reverse_charge,out_of_scope'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'tax_jurisdiction_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_jurisdictions,id'],
            'country_code' => ['sometimes', 'required', 'string', 'size:2'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'required', 'string', 'max:30'],
            'tax_type' => ['sometimes', 'required', 'string', 'max:50'],
            'tax_behavior' => ['sometimes', 'nullable', 'in:standard,exempt,zero_rated,reverse_charge,out_of_scope'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
