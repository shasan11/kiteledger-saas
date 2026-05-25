<?php

namespace App\Http\Controllers\Api;

use App\Models\TaxSystem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaxSystemController extends BaseCrudApiController
{
    protected string $modelClass = TaxSystem::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'code', 'description'];

    protected array $filterable = ['country_code', 'type'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'code', 'country_code', 'type', 'created_at', 'updated_at'];

    protected string $defaultSort = 'country_code';

    protected array $storeRules = [
        'country_code'        => ['required', 'string', 'size:2'],
        'name'                => ['required', 'string', 'max:150'],
        'code'                => ['required', 'string', 'max:80', 'unique:tax_systems,code'],
        'type'                => ['nullable', 'string', 'max:50'],
        'description'         => ['nullable', 'string'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'country_code'        => ['sometimes', 'required', 'string', 'size:2'],
            'name'                => ['sometimes', 'required', 'string', 'max:150'],
            'code'                => ['sometimes', 'required', 'string', 'max:80', "unique:tax_systems,code,{$record->id}"],
            'type'                => ['sometimes', 'nullable', 'string', 'max:50'],
            'description'         => ['sometimes', 'nullable', 'string'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
