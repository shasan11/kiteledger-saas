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
        'System Manager',
        'HR Manager',
        'Full Access User',
        'Full Access Admin',
        'super-admin',
        'admin',
    ];

    protected array $projectCrudBypassRoles = [
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

        return $this->scopeQueryToAccessibleProjects($query, $user);
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
                $projectId && $this->userCanAccessProject($user, (string) $projectId),
                403,
                'You do not have access to this project.'
            );
        }

        $incomingProjectId = $this->projectIdFromRequest($request);

        if ($incomingProjectId) {
            abort_unless(
                $this->userCanAccessProject($user, (string) $incomingProjectId)
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

    protected function scopeQueryToAccessibleProjects(Builder $query, $user): Builder
    {
        $model = $query->getModel();
        $userId = (int) $user->id;

        if ($model instanceof Project) {
            return $query->where(function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
            });
        }

        if ($model instanceof Task) {
            return $query->whereHas('project', function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
            });
        }

        if (
            $model instanceof Milestone ||
            $model instanceof TaskStatus ||
            $model instanceof ProjectTeam
        ) {
            return $query->whereHas('project', function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
            });
        }

        if ($model instanceof ProjectTeamMember) {
            return $query->whereHas('projectTeam.project', function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
            });
        }

        if ($model instanceof AssignedTask) {
            return $query->whereHas('task.project', function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
            });
        }

        return $query;
    }

    protected function scopeProjectRelation(Builder $query, int $userId, $user = null): void
    {
        $query
            ->where('project_manager_id', $userId)
            ->orWhere('user_add_id', $userId)
            ->orWhereHas('projectTeams.projectTeamMembers', function (Builder $query) use ($userId) {
                $query->where('user_id', $userId);
            })
            ->orWhereHas('tasks.assignedTasks', function (Builder $query) use ($userId) {
                $query->where('user_id', $userId);
            });

        if ($user && $this->userIsBranchAdmin($user) && $this->projectTableHasColumn('branch_id')) {
            $branchIds = $this->projectAccessibleBranchIds($user);
            if (!empty($branchIds)) {
                $query->orWhereIn('branch_id', $branchIds);
            }
        }
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

    protected function userCanAccessProject($user, string $projectId): bool
    {
        $userId = (int) $user->id;

        return Project::query()
            ->whereKey($projectId)
            ->where(function (Builder $query) use ($userId, $user) {
                $this->scopeProjectRelation($query, $userId, $user);
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
                if ($user->hasAnyRole($this->projectCrudBypassRoles)) {
                    return true;
                }
            } catch (\Throwable $e) {
                //
            }
        }

        if (method_exists($user, 'hasRole')) {
        foreach ($this->projectCrudBypassRoles as $role) {
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

            if ($roleName && in_array($roleName, $this->projectCrudBypassRoles, true)) {
                return true;
            }
        } catch (\Throwable $e) {
            //
        }

        return false;
    }

    protected function userIsBranchAdmin($user): bool
    {
        foreach (['Branch Admin', 'branch-admin', 'branch_admin'] as $role) {
            try {
                if (method_exists($user, 'hasRole') && $user->hasRole($role)) {
                    return true;
                }
            } catch (\Throwable $e) {
                //
            }
        }

        try {
            $role = $user->relationLoaded('role') ? $user->getRelation('role') : $user->role;
            return in_array((string) $role?->name, ['Branch Admin', 'branch-admin', 'branch_admin'], true);
        } catch (\Throwable $e) {
            return false;
        }
    }

    protected function projectAccessibleBranchIds($user): array
    {
        return collect([
            $user->current_branch_id ?? null,
            $user->branch_id ?? null,
        ])->filter()->map(fn ($id) => (string) $id)->unique()->values()->all();
    }

    protected function projectTableHasColumn(string $column): bool
    {
        try {
            return \Illuminate\Support\Facades\Schema::hasColumn('projects', $column);
        } catch (\Throwable $e) {
            return false;
        }
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

        $isAssigned = $task->assignedTasks()
            ->where('user_id', $user->id)
            ->exists();

        if (!$isAssigned) {
            return false;
        }

        $allowedFields = ['task_status_id', 'sort_order', 'completion_time', 'description'];
        $requestedFields = array_keys($request->all());
        $structuralFields = array_diff($requestedFields, $allowedFields);

        return empty($structuralFields);
    }
}
