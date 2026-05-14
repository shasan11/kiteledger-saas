<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TaskStatusController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = TaskStatus::class;

    protected ?string $permissionPrefix = 'project.task_status';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
    ];

    protected array $relationDetails = [
        'project' => 'project_id',
    ];

    protected array $searchable = [
        'name',
        'color',
        'project.name',
    ];

    protected array $filterable = [
        'project_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'project_id',
        'name',
        'color',
        'sort_order',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'sort_order';

    protected array $storeRules = [
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'name' => ['required', 'string', 'max:80'],
        'color' => ['nullable', 'string', 'max:20'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
