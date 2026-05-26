<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\Milestone;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\TaskStatus;
use Illuminate\Database\Eloquent\Builder;
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
     | project.project.view
     | project.project.create
     | project.project.update
     | project.project.delete
     |
     */
    protected ?string $permissionPrefix = 'project.project';

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'projectManager',
        'branch',
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
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'status',
        'projectManager.first_name',
        'projectManager.last_name',
        'projectManager.username',
        'projectManager.email',
        'branch.name',
    ];

    protected array $filterable = [
        'branch_id',
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
        'branch_id',
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
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
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
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
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

    protected function applyFilters(\Illuminate\Database\Eloquent\Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->boolean('overdue')) {
            $query
                ->whereDate('end_date', '<', now()->toDateString())
                ->where(function (Builder $query) {
                    $query->where('active', true)->orWhereNull('active');
                })
                ->whereNotIn('status', ['COMPLETED', 'CANCELLED']);
        }
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

        if (empty($parentData['branch_id']) && $this->tableHasColumn('branch_id')) {
            $parentData['branch_id'] = $this->defaultWriteBranchId(request());
        }

        return $parentData;
    }

    public function show(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'show', $record);
        $this->assertRecordBranchAccess($request, $record);
        $this->ensureDefaultTaskStatuses($record);

        return response()->json(
            $this->serializeRecord($record->fresh($this->validEagerLoadRelations($record)))
        );
    }

    public function financialSummary(Request $request, mixed $id)
    {
        $project = $this->findRecord($id);

        $this->checkAccess($request, 'show', $project);
        $this->assertRecordBranchAccess($request, $project);

        $invoiceQuery = $project->invoices()
            ->with('contact')
            ->where(function (Builder $query) {
                $query->where('active', true)->orWhereNull('active');
            })
            ->where(function (Builder $query) {
                $query->where('void', false)->orWhereNull('void');
            })
            ->whereNotIn('status', ['draft', 'void']);

        $purchaseBillQuery = $project->purchaseBills()
            ->with('contact')
            ->where(function (Builder $query) {
                $query->where('active', true)->orWhereNull('active');
            })
            ->where(function (Builder $query) {
                $query->where('void', false)->orWhereNull('void');
            })
            ->whereNotIn('status', ['draft', 'void']);

        $invoices = $invoiceQuery->latest('invoice_date')->get();
        $purchaseBills = $purchaseBillQuery->latest('bill_date')->get();

        $earningsTotal = (float) $invoices->sum('total');
        $earningsPaid = (float) $invoices->sum('paid_total');
        $costsTotal = (float) $purchaseBills->sum('total');
        $costsPaid = (float) $purchaseBills->sum('paid_total');

        return response()->json([
            'project_id' => $project->id,
            'earnings' => [
                'invoice_count' => $invoices->count(),
                'total' => round($earningsTotal, 2),
                'paid_total' => round($earningsPaid, 2),
                'balance_due' => round((float) $invoices->sum('balance_due'), 2),
            ],
            'costs' => [
                'purchase_bill_count' => $purchaseBills->count(),
                'total' => round($costsTotal, 2),
                'paid_total' => round($costsPaid, 2),
                'balance_due' => round((float) $purchaseBills->sum('balance_due'), 2),
            ],
            'profit_loss' => round($earningsTotal - $costsTotal, 2),
            'invoices' => $invoices->values(),
            'purchase_bills' => $purchaseBills->values(),
        ]);
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

        $this->ensureDefaultTaskStatuses($record);

        return $record;
    }

    protected function ensureDefaultTaskStatuses(Project $project): void
    {
        if ($project->taskStatuses()->exists()) {
            return;
        }

        $project->taskStatuses()->createMany([
            ['name' => 'To Do', 'color' => 'default', 'sort_order' => 1, 'active' => true],
            ['name' => 'In Progress', 'color' => 'blue', 'sort_order' => 2, 'active' => true],
            ['name' => 'Done', 'color' => 'green', 'sort_order' => 3, 'active' => true],
        ]);
    }
}
