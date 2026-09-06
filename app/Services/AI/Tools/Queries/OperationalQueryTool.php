<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Database\Query\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class OperationalQueryTool extends BaseQueryTool
{
    public function pendingLeads(Request $request): array
    {
        $this->authorize($request);

        if (! $this->tableExists(['leads'])) {
            return $this->empty('crm.pending_leads', 'Pending leads', $request);
        }

        $query = DB::table('leads')
            ->whereIn('status', ['new', 'contacted', 'qualified']);

        $this->applyActive($query, 'leads');
        $this->applyCrmAssignmentScope($query, $request, 'leads');

        return $this->countResult(
            'crm.pending_leads',
            'Pending leads',
            $query->count(),
            $request,
            '/crm/leads',
        );
    }

    public function openDeals(Request $request): array
    {
        $this->authorize($request);

        if (! $this->tableExists(['deals'])) {
            return $this->empty('crm.open_deals', 'Open deals', $request);
        }

        $query = DB::table('deals')->where('status', 'open');

        $this->applyActive($query, 'deals');
        $this->applyCrmAssignmentScope($query, $request, 'deals');

        return $this->countResult(
            'crm.open_deals',
            'Open deals',
            $query->count(),
            $request,
            '/crm/deals',
        );
    }

    public function activeProjects(Request $request): array
    {
        $this->authorize($request);

        if (! $this->tableExists(['projects'])) {
            return $this->empty('projects.active', 'Active projects', $request);
        }

        $query = DB::table('projects')
            ->whereRaw('LOWER(projects.status) NOT IN (?, ?)', ['completed', 'cancelled']);

        $this->applyActive($query, 'projects');
        $this->applyBranch($query, $request, 'projects');
        $this->applyProjectAccessScope($query, $request);

        return $this->countResult(
            'projects.active',
            'Active projects',
            $query->count(),
            $request,
            '/crm/projects',
        );
    }

    public function pendingTasks(Request $request): array
    {
        $this->authorize($request);

        if (! $this->tableExists(['tasks', 'task_statuses', 'projects'])) {
            return $this->empty('projects.pending_tasks', 'Pending tasks', $request);
        }

        $query = DB::table('tasks')
            ->join('projects', 'projects.id', '=', 'tasks.project_id')
            ->leftJoin('task_statuses', 'task_statuses.id', '=', 'tasks.task_status_id')
            ->where(function (Builder $query): void {
                $query->whereNull('task_statuses.name')
                    ->orWhereRaw(
                        'LOWER(task_statuses.name) NOT IN (?, ?, ?, ?)',
                        ['completed', 'complete', 'done', 'cancelled'],
                    );
            });

        $this->applyActive($query, 'tasks');
        $this->applyActive($query, 'projects');
        $this->applyBranch($query, $request, 'projects');
        $this->applyProjectAccessScope($query, $request);

        return $this->countResult(
            'projects.pending_tasks',
            'Pending tasks',
            $query->count('tasks.id'),
            $request,
            '/hrm/tasks',
        );
    }

    private function applyCrmAssignmentScope(Builder $query, Request $request, string $table): void
    {
        $user = $request->user();

        if (! $user) {
            $query->whereRaw('1 = 0');

            return;
        }

        if ($this->permissions->canBypass($user)
            || $this->permissions->hasAny($user, ['crm.manage', 'crm.*'])) {
            return;
        }

        $query->where($table.'.assigned_to_id', $user->getAuthIdentifier());
    }

    private function applyProjectAccessScope(Builder $query, Request $request): void
    {
        $user = $request->user();

        if (! $user) {
            $query->whereRaw('1 = 0');

            return;
        }

        if ($this->permissions->canBypass($user)) {
            return;
        }

        $userId = (int) $user->getAuthIdentifier();

        $query->where(function (Builder $query) use ($userId): void {
            $query->where('projects.project_manager_id', $userId)
                ->orWhere('projects.user_add_id', $userId)
                ->orWhereExists(function (Builder $memberQuery) use ($userId): void {
                    $memberQuery->selectRaw('1')
                        ->from('project_teams')
                        ->join('project_team_members', 'project_team_members.project_team_id', '=', 'project_teams.id')
                        ->whereColumn('project_teams.project_id', 'projects.id')
                        ->where('project_team_members.user_id', $userId)
                        ->where('project_team_members.active', true);
                })
                ->orWhereExists(function (Builder $taskQuery) use ($userId): void {
                    $taskQuery->selectRaw('1')
                        ->from('tasks as accessible_tasks')
                        ->join('assigned_tasks', 'assigned_tasks.task_id', '=', 'accessible_tasks.id')
                        ->whereColumn('accessible_tasks.project_id', 'projects.id')
                        ->where('assigned_tasks.user_id', $userId)
                        ->where('assigned_tasks.active', true);
                });
        });
    }

    private function countResult(
        string $tool,
        string $title,
        int $count,
        Request $request,
        string $openUrl,
    ): array {
        return AiToolResult::query(
            $tool,
            $title,
            [],
            $this->contextFilters($request),
            "{$title}: {$count}.",
            $openUrl,
        )->toArray() + ['metrics' => ['record_count' => $count]];
    }
}
