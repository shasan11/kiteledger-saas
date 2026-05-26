<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\AssignedTask;
use App\Models\Milestone;
use App\Models\Task;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class TaskController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = Task::class;

    protected ?string $permissionPrefix = 'project.task';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
        'milestone',
        'priority',
        'taskStatus',
        'assignedTasks',
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
        'sort_order',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'assigned_tasks' => [
            'relation' => 'assignedTasks',
            'model' => AssignedTask::class,
            'foreign_key' => 'task_id',
            'delete_key' => 'deleted_assigned_task_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'user_id' => ['required', 'integer', 'exists:users,id'],
            ],
            'update_rules' => [
                'user_id' => ['required', 'integer', 'exists:users,id'],
            ],
        ],
    ];

    protected array $storeRules = [
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'milestone_id' => ['nullable', 'uuid', 'exists:milestones,id'],
        'priority_id' => ['nullable', 'uuid', 'exists:priorities,id'],
        'task_status_id' => ['required', 'uuid', 'exists:task_statuses,id'],
        'name' => ['required', 'string', 'max:180'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        'completion_time' => ['nullable', 'numeric', 'min:0'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        $startDate = $request->input('start_date', $record->start_date?->format('Y-m-d'));
        $endDate = $request->input('end_date', $record->end_date?->format('Y-m-d'));

        return [
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'milestone_id' => ['sometimes', 'nullable', 'uuid', 'exists:milestones,id'],
            'priority_id' => ['sometimes', 'nullable', 'uuid', 'exists:priorities,id'],
            'task_status_id' => ['sometimes', 'required', 'uuid', 'exists:task_statuses,id'],
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
            'completion_time' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ($record->assignedTasks()->exists()) {
            return response()->json([
                'message' => 'Cannot delete this task because it has assignees.',
            ], 422);
        }

        return parent::destroy($request, $id);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $this->validateProjectScopedSelections($parentData, null);

        if (!array_key_exists('completion_time', $parentData) || $parentData['completion_time'] === null) {
            $parentData['completion_time'] = 0;
        }

        if (!array_key_exists('sort_order', $parentData) || $parentData['sort_order'] === null) {
            $parentData['sort_order'] = $this->nextSortOrder(
                (string) $parentData['project_id'],
                (string) $parentData['task_status_id']
            );
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
        $this->validateProjectScopedSelections($parentData, $record);

        return $parentData;
    }

    protected function nextSortOrder(string $projectId, string $taskStatusId): int
    {
        return ((int) Task::query()
            ->where('project_id', $projectId)
            ->where('task_status_id', $taskStatusId)
            ->max('sort_order')) + 1;
    }

    protected function validateProjectScopedSelections(array $data, ?Task $task): void
    {
        $projectId = $data['project_id'] ?? $task?->project_id;

        if (!$projectId) {
            return;
        }

        if (!empty($data['milestone_id'])) {
            $belongs = Milestone::query()
                ->whereKey($data['milestone_id'])
                ->where('project_id', $projectId)
                ->exists();

            if (!$belongs) {
                $this->throwValidation([
                    'milestone_id' => ['Selected milestone does not belong to this project.'],
                ]);
            }
        }

        if (!empty($data['task_status_id'])) {
            $belongs = TaskStatus::query()
                ->whereKey($data['task_status_id'])
                ->where('project_id', $projectId)
                ->exists();

            if (!$belongs) {
                $this->throwValidation([
                    'task_status_id' => ['Selected task status does not belong to this project.'],
                ]);
            }
        }
    }
}
