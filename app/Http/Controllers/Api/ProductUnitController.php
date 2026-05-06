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

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'products',
    ];

    protected array $relationDetails = [];

    protected array $searchable = [
        'name',
        'short_name',
    ];

    protected array $filterable = [];

    protected array $booleanFilters = [
        'active',
        'accept_fractional',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'short_name',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'name'                => ['required', 'string', 'max:50'],
        'short_name'          => ['nullable', 'string', 'max:20'],
        'description'         => ['nullable', 'string'],
        'accept_fractional'   => ['nullable', 'boolean'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name'                => ['sometimes', 'required', 'string', 'max:50'],
            'short_name'          => ['sometimes', 'nullable', 'string', 'max:20'],
            'description'         => ['sometimes', 'nullable', 'string'],
            'accept_fractional'   => ['sometimes', 'nullable', 'boolean'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
