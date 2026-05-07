<?php

namespace App\Http\Controllers\Api;

use App\Models\OnboardingChecklist;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class OnboardingChecklistController extends BaseCrudApiController
{
    protected string $modelClass = OnboardingChecklist::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['user', 'branch', 'assignedTo', 'userAdd'];
    protected array $relationDetails = [
        'user'       => 'user_id',
        'branch'     => 'branch_id',
        'assignedTo' => 'assigned_to',
        'userAdd'    => 'user_add_id',
    ];

    protected array $searchable = [
        'title',
        'description',
        'notes',
        'status',
        'type',
        'user.first_name',
        'user.last_name',
        'assignedTo.first_name',
        'assignedTo.last_name',
    ];

    protected array $filterable = ['user_id', 'branch_id', 'type', 'status', 'assigned_to'];
    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'due_date'      => ['from' => 'due_date_from',      'to' => 'due_date_to'],
        'completed_at'  => ['from' => 'completed_at_from',  'to' => 'completed_at_to'],
    ];

    protected array $sortable = [
        'id', 'user_id', 'type', 'title', 'status', 'due_date', 'completed_at', 'active', 'created_at',
    ];

    protected string $defaultSort = 'due_date';

    protected array $storeRules = [
        'user_id'     => ['required', 'integer', 'exists:users,id'],
        'branch_id'   => ['nullable', 'uuid', 'exists:branches,id'],
        'type'        => ['required', 'in:ONBOARDING,OFFBOARDING'],
        'title'       => ['required', 'string', 'max:180'],
        'description' => ['nullable', 'string'],
        'assigned_to' => ['nullable', 'integer', 'exists:users,id'],
        'due_date'    => ['nullable', 'date'],
        'completed_at' => ['nullable', 'date'],
        'status'      => ['nullable', 'in:PENDING,IN_PROGRESS,COMPLETED,SKIPPED'],
        'notes'       => ['nullable', 'string'],
        'active'      => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id'     => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'branch_id'   => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'type'        => ['sometimes', 'required', 'in:ONBOARDING,OFFBOARDING'],
            'title'       => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string'],
            'assigned_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'due_date'    => ['sometimes', 'nullable', 'date'],
            'completed_at' => ['sometimes', 'nullable', 'date'],
            'status'      => ['sometimes', 'nullable', 'in:PENDING,IN_PROGRESS,COMPLETED,SKIPPED'],
            'notes'       => ['sometimes', 'nullable', 'string'],
            'active'      => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
