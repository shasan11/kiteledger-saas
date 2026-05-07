<?php

namespace App\Http\Controllers\Api;

use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectController extends BaseCrudApiController
{
    protected string $modelClass = Project::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;
    protected bool $autoFillBranchOnCreate = false;
    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'projectManager',
        'milestones',
        'taskStatuses',
        'tasks.milestone',
        'tasks.priority',
        'tasks.taskStatus',
        'tasks.assignedTasks.user',
        'projectTeams',
        'projectTeams.projectTeamMembers.user',
    ];

    protected array $relationDetails = [
        'projectManager' => 'project_manager_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'status',
        'projectManager.first_name',
        'projectManager.last_name',
        'projectManager.username',
        'projectManager.email',
    ];

    protected array $filterable = [
        'project_manager_id',
        'status',
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
        'name',
        'project_manager_id',
        'start_date',
        'end_date',
        'status',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'milestones' => [
            'relation' => 'milestones',
            'model' => Milestone::class,
            'foreign_key' => 'project_id',
            'delete_key' => 'deleted_milestone_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'name' => ['required', 'string', 'max:180'],
                'start_date' => ['nullable', 'date'],
                'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
                'description' => ['nullable', 'string'],
                'status' => ['nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:180'],
                'start_date' => ['nullable', 'date'],
                'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
                'description' => ['nullable', 'string'],
                'status' => ['nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
            ],
        ],
        'task_statuses' => [
            'relation' => 'taskStatuses',
            'model' => TaskStatus::class,
            'foreign_key' => 'project_id',
            'delete_key' => 'deleted_task_status_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'name' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:30'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:30'],
            ],
        ],
        'teams' => [
            'relation' => 'projectTeams',
            'model' => ProjectTeam::class,
            'foreign_key' => 'project_id',
            'delete_key' => 'deleted_team_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'project_team_name' => ['required', 'string', 'max:180'],
            ],
            'update_rules' => [
                'project_team_name' => ['required', 'string', 'max:180'],
            ],
        ],
    ];

    protected array $storeRules = [
        'project_manager_id' => ['required', 'integer', 'exists:users,id'],
        'name' => ['required', 'string', 'max:180'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        'description' => ['nullable', 'string'],
        'status' => ['nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_manager_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
