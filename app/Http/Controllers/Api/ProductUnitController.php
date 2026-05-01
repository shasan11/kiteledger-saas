<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductUnitController extends BaseCrudApiController
{
    protected string $modelClass = ProductUnit::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'products',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'name',
        'short_name',
        'branch.name',
        'branch.code',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = [
        'active',
    ];

    protected array $sortable = [
        'id',
        'name',
        'short_name',
        'precision',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id'           => ['nullable', 'uuid', 'exists:branches,id'],
        'name'                => ['required', 'string', 'max:100'],
        'short_name'          => ['nullable', 'string', 'max:30'],
        'precision'           => ['nullable', 'integer', 'min:0', 'max:10'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'           => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name'                => ['sometimes', 'required', 'string', 'max:100'],
            'short_name'          => ['sometimes', 'nullable', 'string', 'max:30'],
            'precision'           => ['sometimes', 'nullable', 'integer', 'min:0', 'max:10'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
