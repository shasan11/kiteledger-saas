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
        'Admin',
        'Branch Admin',
        'System Manager',
        'HR Manager',
        'Full Access User',
        'Full Access Admin',
        'super-admin',
        'admin',
    ];

    protected function baseQuery(): Builder
    {
        $query = parent::baseQuery();
        $user = $this->currentApiUser(request());

        if (!$user) {
            return $query->whereRaw('1 = 0');
        }

        if ($this->userBypassesProjectScope($user)) {
            return $query;
        }

        return $this->scopeQueryToAccessibleProjects($query, (int) $user->id);
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        $user = $this->currentApiUser($request);

        abort_unless(
            $user,
            401,
            'Unauthenticated. Please login again.'
        );

        if (!$this->userBypassesProjectCrudPermission($user)) {
            parent::checkAccess($request, $action, $record);
        }

        if ($this->userBypassesProjectScope($user)) {
            return;
        }

        if ($record instanceof Model) {
            $projectId = $this->projectIdForRecord($record);

            abort_unless(
                $projectId && $this->userCanAccessProject((int) $user->id, (string) $projectId),
                403,
                'You do not have access to this project.'
            );
        }

        $incomingProjectId = $this->projectIdFromRequest($request);

        if ($incomingProjectId) {
            abort_unless(
                $this->userCanAccessProject((int) $user->id, (string) $incomingProjectId)
                    || $this->isCreatingProject($action),
                403,
                'You do not have access to this project.'
            );
        }

        if ($record instanceof Task && !$this->canMutateTask($request, $action, $record, $user)) {
            abort(403, 'You can only update tasks assigned to you.');
        }
    }

    protected function currentApiUser(Request $request)
    {
        try {
            if ($request->user()) {
                return $request->user();
            }
        } catch (\Throwable $e) {
            //
        }

        try {
            if (auth()->check()) {
                return auth()->user();
            }
        } catch (\Throwable $e) {
            //
        }

        try {
            if (auth('sanctum')->check()) {
                return auth('sanctum')->user();
            }
        } catch (\Throwable $e) {
            //
        }

        try {
            if (auth('web')->check()) {
                return auth('web')->user();
            }
        } catch (\Throwable $e) {
            //
        }

        return null;
    }

    protected function scopeQueryToAccessibleProjects(Builder $query, int $userId): Builder
    {
        $model = $query->getModel();

        if ($model instanceof Project) {
            return $query->where(function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            });
        }

        if ($model instanceof Task) {
            return $query->whereHas('project', function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            });
        }

        if (
            $model instanceof Milestone ||
            $model instanceof TaskStatus ||
            $model instanceof ProjectTeam
        ) {
            return $query->whereHas('project', function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            });
        }

        if ($model instanceof ProjectTeamMember) {
            return $query->whereHas('projectTeam.project', function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            });
        }

        if ($model instanceof AssignedTask) {
            return $query->whereHas('task.project', function (Builder $query) use ($userId) {
                $this->scopeProjectRelation($query, $userId);
            });
        }

        return $query;
    }

    protected function scopeProjectRelation(Builder $query, int $userId): void
    {
        $query
            ->where('project_manager_id', $userId)
            ->orWhereHas('projectTeams.projectTeamMembers', function (Builder $query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->orWhereHas('tasks.assignedTasks', function (Builder $query) use ($userId) {
                $query->where('user_id', $userId);
            });
    }

    protected function projectIdForRecord(Model $record): ?string
    {
        if ($record instanceof Project) {
            return (string) $record->getKey();
        }

        if (
            $record instanceof Task ||
            $record instanceof Milestone ||
            $record instanceof TaskStatus ||
            $record instanceof ProjectTeam
        ) {
            return !empty($record->project_id) ? (string) $record->project_id : null;
        }

        if ($record instanceof ProjectTeamMember) {
            $projectTeam = $record->relationLoaded('projectTeam')
                ? $record->getRelation('projectTeam')
                : $record->projectTeam;

            return !empty($projectTeam?->project_id) ? (string) $projectTeam->project_id : null;
        }

        if ($record instanceof AssignedTask) {
            $task = $record->relationLoaded('task')
                ? $record->getRelation('task')
                : $record->task;

            return !empty($task?->project_id) ? (string) $task->project_id : null;
        }

        return null;
    }

    protected function projectIdFromRequest(Request $request): ?string
    {
        if ($request->filled('project_id')) {
            return (string) $request->input('project_id');
        }

        if ($request->filled('task_id')) {
            $projectId = Task::query()
                ->whereKey($request->input('task_id'))
                ->value('project_id');

            return $projectId ? (string) $projectId : null;
        }

        if ($request->filled('project_team_id')) {
            $projectId = ProjectTeam::query()
                ->whereKey($request->input('project_team_id'))
                ->value('project_id');

            return $projectId ? (string) $projectId : null;
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
        return $this->userBypassesProjectCrudPermission($user);
    }

    protected function userBypassesProjectCrudPermission($user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        if (method_exists($this, 'userHasAdministrativeAccess')) {
            try {
                if ($this->userHasAdministrativeAccess($user)) {
                    return true;
                }
            } catch (\Throwable $e) {
                //
            }
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                if ($user->hasAnyRole($this->projectAccessBypassRoles)) {
                    return true;
                }
            } catch (\Throwable $e) {
                //
            }
        }

        if (method_exists($user, 'hasRole')) {
            foreach ($this->projectAccessBypassRoles as $role) {
                try {
                    if ($user->hasRole($role)) {
                        return true;
                    }
                } catch (\Throwable $e) {
                    //
                }
            }
        }

        try {
            $role = $user->relationLoaded('role')
                ? $user->getRelation('role')
                : $user->role;

            $roleName = $role?->name;

            if ($roleName && in_array($roleName, $this->projectAccessBypassRoles, true)) {
                return true;
            }
        } catch (\Throwable $e) {
            //
        }

        return false;
    }

    protected function isCreatingProject(string $action): bool
    {
        return $this->modelClass === Project::class
            && in_array($action, ['store', 'bulkStore'], true);
    }

    protected function canMutateTask(Request $request, string $action, Task $task, $user = null): bool
    {
        if (!in_array($action, ['update', 'bulkUpdate'], true)) {
            return true;
        }

        $user = $user ?: $this->currentApiUser($request);

        if (!$user) {
            return false;
        }

        if ($this->userBypassesProjectCrudPermission($user)) {
            return true;
        }

        try {
            if (method_exists($user, 'can') && $user->can('project.task.assign')) {
                return true;
            }
        } catch (\Throwable $e) {
            //
        }

        $project = $task->relationLoaded('project')
            ? $task->getRelation('project')
            : $task->project;

        if ($project && (int) $project->project_manager_id === (int) $user->id) {
            return true;
        }

        return $task->assignedTasks()
            ->where('user_id', $user->id)
            ->exists();
    }
}