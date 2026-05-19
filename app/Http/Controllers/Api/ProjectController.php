<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectController extends BaseCrudApiController
{
    use AuthorizesProjectResources;
 
    protected string $modelClass = Project::class;

    /*
     |--------------------------------------------------------------------------
     | Permission Prefix
     |--------------------------------------------------------------------------
     |
     | BaseCrudApiController checks permissions like:
     |
     | {$permissionPrefix}.view
     | {$permissionPrefix}.create
     | {$permissionPrefix}.update
     | {$permissionPrefix}.delete
     |
     | So this controller requires:
     |
     | projects.view
     | projects.create
     | projects.update
     | projects.delete
     |
     */
    protected ?string $permissionPrefix = 'projects';

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
        'start_date' => [
            'from' => 'start_date_from',
            'to' => 'start_date_to',
        ],
        'end_date' => [
            'from' => 'end_date_from',
            'to' => 'end_date_to',
        ],
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
                'end_date' => ['nullable', 'date'],
                'description' => ['nullable', 'string'],
                'status' => ['nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:180'],
                'start_date' => ['nullable', 'date'],
                'end_date' => ['nullable', 'date'],
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
                'sort_order' => ['nullable', 'integer', 'min:0'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:30'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
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
        $startDate = $request->input('start_date', $record->start_date?->format('Y-m-d'));
        $endDate = $request->input('end_date', $record->end_date?->format('Y-m-d'));

        return [
            'project_manager_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'start_date' => [
                'sometimes',
                'required',
                'date',
                function ($attribute, $value, $fail) use ($endDate) {
                    if ($endDate && strtotime((string) $value) > strtotime((string) $endDate)) {
                        $fail('The start date must be before or equal to the end date.');
                    }
                },
            ],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:' . $startDate],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED,ON_HOLD'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        if (empty($parentData['status'])) {
            $parentData['status'] = 'PENDING';
        }

        if (!array_key_exists('active', $parentData) || $parentData['active'] === null) {
            $parentData['active'] = true;
        }

        if (!array_key_exists('is_system_generated', $parentData) || $parentData['is_system_generated'] === null) {
            $parentData['is_system_generated'] = false;
        }

        if (empty($parentData['user_add_id']) && auth()->id()) {
            $parentData['user_add_id'] = auth()->id();
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

        if (array_key_exists('status', $parentData) && empty($parentData['status'])) {
            $parentData['status'] = 'PENDING';
        }

        return $parentData;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        $record = parent::afterSave($record, $parentData, $nestedData, $isUpdate);

        if (!$isUpdate && empty($nestedData['task_statuses']) && !$record->taskStatuses()->exists()) {
            $record->taskStatuses()->createMany([
                ['name' => 'To Do', 'color' => 'default', 'sort_order' => 1, 'active' => true],
                ['name' => 'In Progress', 'color' => 'blue', 'sort_order' => 2, 'active' => true],
                ['name' => 'Done', 'color' => 'green', 'sort_order' => 3, 'active' => true],
            ]);
        }

        return $record;
    }
}
