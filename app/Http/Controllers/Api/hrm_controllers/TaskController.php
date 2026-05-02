<?php

namespace App\Http\Controllers\Api;

use App\Models\Task;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaskController extends BaseCrudApiController
{
    protected string $modelClass = Task::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
        'milestone',
        'priority',
        'taskStatus',
    ];

    protected array $relationDetails = [
        'project' => 'project_id',
        'milestone' => 'milestone_id',
        'priority' => 'priority_id',
        'taskStatus' => 'task_status_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'project.name',
        'milestone.name',
        'priority.name',
        'taskStatus.name',
    ];

    protected array $filterable = [
        'project_id',
        'milestone_id',
        'priority_id',
        'task_status_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'start_date' => ['from' => 'start_date_from', 'to' => 'start_date_to'],
        'end_date' => ['from' => 'end_date_from', 'to' => 'end_date_to'],
    ];

    protected array $sortable = [
        'id',
        'project_id',
        'milestone_id',
        'priority_id',
        'task_status_id',
        'name',
        'start_date',
        'end_date',
        'completion_time',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'milestone_id' => ['required', 'uuid', 'exists:milestones,id'],
        'priority_id' => ['required', 'uuid', 'exists:priorities,id'],
        'task_status_id' => ['required', 'uuid', 'exists:task_statuses,id'],
        'name' => ['required', 'string', 'max:180'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        'completion_time' => ['required', 'numeric', 'min:0'],
        'description' => ['required', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'milestone_id' => ['sometimes', 'required', 'uuid', 'exists:milestones,id'],
            'priority_id' => ['sometimes', 'required', 'uuid', 'exists:priorities,id'],
            'task_status_id' => ['sometimes', 'required', 'uuid', 'exists:task_statuses,id'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
            'completion_time' => ['sometimes', 'required', 'numeric', 'min:0'],
            'description' => ['sometimes', 'required', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
