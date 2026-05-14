<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\AssignedTask;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectTeamMember;
use App\Models\Task;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

trait AuthorizesProjectResources
{
    protected array $projectAccessBypassRoles = [
        'Super Admin',
        'Company Owner',
        'Branch Admin',
        'System Manager',
        'HR Manager',
    ];

    protected function baseQuery(): Builder
    {
        $query = parent::baseQuery();
        $user = request()->user();

        if (!$user || $this->userBypassesProjectScope($user)) {
            return $query;
        }

        return $this->scopeQueryToAccessibleProjects($query, (int) $user->id);
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        parent::checkAccess($request, $action, $record);

        $user = $request->user();

        if (!$user || $this->userBypassesProjectScope($user)) {
            return;
        }

        if ($record instanceof Model) {
            $projectId = $this->projectIdForRecord($record);

            abort_unless(
                $projectId && $this->userCanAccessProject((int) $user->id, $projectId),
                403,
                'You do not have access to this project.'
            );
        }

        $incomingProjectId = $this->projectIdFromRequest($request);

        if ($incomingProjectId) {
            abort_unless(
                $this->userCanAccessProject((int) $user->id, $incomingProjectId) || $this->isCreatingProject($action),
                403,
                'You do not have access to this project.'
            );
        }

        if ($record instanceof Task && !$this->canMutateTask($request, $action, $record)) {
            abort(403, 'You can only update tasks assigned to you.');
        }
    }

    protected function scopeQueryToAccessibleProjects(Builder $query, int $userId): Builder
    {
        $model = $query->getModel();

        if ($model instanceof Project) {
            return $query->where(function (Builder $query) use ($userId) {
                $query
                    ->where('project_manager_id', $userId)
                    ->orWhereHas('projectTeams.projectTeamMembers', fn (Builder $q) => $q->where('user_id', $userId))
                    ->orWhereHas('tasks.assignedTasks', fn (Builder $q) => $q->where('user_id', $userId));
            });
        }

        if ($model instanceof Task) {
            return $query->whereHas('project', fn (Builder $q) => $this->scopeProjectRelation($q, $userId));
        }

        if ($model instanceof Milestone || $model instanceof TaskStatus || $model instanceof ProjectTeam) {
            return $query->whereHas('project', fn (Builder $q) => $this->scopeProjectRelation($q, $userId));
        }

        if ($model instanceof ProjectTeamMember) {
            return $query->whereHas('projectTeam.project', fn (Builder $q) => $this->scopeProjectRelation($q, $userId));
        }

        if ($model instanceof AssignedTask) {
            return $query->whereHas('task.project', fn (Builder $q) => $this->scopeProjectRelation($q, $userId));
        }

        return $query;
    }

    protected function scopeProjectRelation(Builder $query, int $userId): void
    {
        $query
            ->where('project_manager_id', $userId)
            ->orWhereHas('projectTeams.projectTeamMembers', fn (Builder $q) => $q->where('user_id', $userId))
            ->orWhereHas('tasks.assignedTasks', fn (Builder $q) => $q->where('user_id', $userId));
    }

    protected function projectIdForRecord(Model $record): ?string
    {
        if ($record instanceof Project) {
            return (string) $record->getKey();
        }

        if ($record instanceof Task || $record instanceof Milestone || $record instanceof TaskStatus || $record instanceof ProjectTeam) {
            return $record->project_id ? (string) $record->project_id : null;
        }

        if ($record instanceof ProjectTeamMember) {
            return $record->projectTeam?->project_id ? (string) $record->projectTeam->project_id : null;
        }

        if ($record instanceof AssignedTask) {
            return $record->task?->project_id ? (string) $record->task->project_id : null;
        }

        return null;
    }

    protected function projectIdFromRequest(Request $request): ?string
    {
        if ($request->filled('project_id')) {
            return (string) $request->input('project_id');
        }

        if ($request->filled('task_id')) {
            return Task::query()->whereKey($request->input('task_id'))->value('project_id');
        }

        if ($request->filled('project_team_id')) {
            return ProjectTeam::query()->whereKey($request->input('project_team_id'))->value('project_id');
        }

        return null;
    }

    protected function userCanAccessProject(int $userId, string $projectId): bool
    {
        return Project::query()
            ->whereKey($projectId)
            ->where(function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            })
            ->exists();
    }

    protected function userBypassesProjectScope($user): bool
    {
        return method_exists($user, 'hasAnyRole') && $user->hasAnyRole($this->projectAccessBypassRoles);
    }

    protected function isCreatingProject(string $action): bool
    {
        return $this->modelClass === Project::class && in_array($action, ['store', 'bulkStore'], true);
    }

    protected function canMutateTask(Request $request, string $action, Task $task): bool
    {
        if (!in_array($action, ['update', 'bulkUpdate'], true)) {
            return true;
        }

        $user = $request->user();

        if ($user->can('project.task.assign') || (int) $task->project?->project_manager_id === (int) $user->id) {
            return true;
        }

        return $task->assignedTasks()->where('user_id', $user->id)->exists();
    }
}
