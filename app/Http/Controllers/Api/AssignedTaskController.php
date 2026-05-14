<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\AssignedTask;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AssignedTaskController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = AssignedTask::class;

    protected ?string $permissionPrefix = 'project.task';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'task',
        'user',
    ];

    protected array $relationDetails = [
        'task' => 'task_id',
        'user' => 'user_id',
    ];

    protected array $searchable = [
        'task.name',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
    ];

    protected array $filterable = [
        'task_id',
        'user_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'task_id',
        'user_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'task_id' => ['required', 'uuid', 'exists:tasks,id'],
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'task_id' => ['sometimes', 'required', 'uuid', 'exists:tasks,id'],
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
