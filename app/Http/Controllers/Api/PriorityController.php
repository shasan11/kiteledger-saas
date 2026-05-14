<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\Priority;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PriorityController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = Priority::class;

    protected ?string $permissionPrefix = 'project.priority';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'name',
        'color',
        'branch.name',
        'branch.code',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'color',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:80'],
        'color' => ['nullable', 'string', 'max:20'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
