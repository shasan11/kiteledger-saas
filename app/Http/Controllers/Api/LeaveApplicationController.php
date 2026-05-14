<?php

namespace App\Http\Controllers\Api;

use App\Models\LeaveApplication;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LeaveApplicationController extends BaseCrudApiController
{
    protected string $modelClass = LeaveApplication::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'user',
        'leavePolicy',
        'leaveTypeRecord',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'user' => 'user_id',
        'leavePolicy' => 'leave_policy_id',
        'leaveTypeRecord' => 'leave_type_id',
    ];

    protected array $searchable = [
        'leave_type',
        'reason',
        'review_comment',
        'status',
        'branch.name',
        'branch.code',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
        'leavePolicy.name',
        'leaveTypeRecord.name',
        'leaveTypeRecord.code',
    ];

    protected array $filterable = [
        'branch_id',
        'user_id',
        'leave_policy_id',
        'leave_type_id',
        'leave_type',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'leave_from' => ['from' => 'leave_from_from', 'to' => 'leave_from_to'],
        'leave_to' => ['from' => 'leave_to_from', 'to' => 'leave_to_to'],
        'accept_leave_from' => ['from' => 'accept_leave_from_from', 'to' => 'accept_leave_from_to'],
        'accept_leave_to' => ['from' => 'accept_leave_to_from', 'to' => 'accept_leave_to_to'],
    ];

    protected array $sortable = [
        'id',
        'user_id',
        'leave_policy_id',
        'leave_type_id',
        'leave_type',
        'leave_from',
        'leave_to',
        'leave_duration',
        'status',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'leave_policy_id' => ['nullable', 'uuid', 'exists:leave_policies,id'],
        'leave_type_id' => ['nullable', 'uuid', 'exists:leave_types,id'],
        'leave_type' => ['required_without:leave_type_id', 'nullable', 'string', 'max:60'],
        'leave_from' => ['required', 'date'],
        'leave_to' => ['required', 'date', 'after_or_equal:leave_from'],
        'accept_leave_from' => ['nullable', 'date'],
        'accept_leave_to' => ['nullable', 'date', 'after_or_equal:accept_leave_from'],
        'accept_leave_by' => ['nullable', 'integer', 'exists:users,id'],
        'leave_duration' => ['nullable', 'integer', 'min:0'],
        'reason' => ['nullable', 'string', 'max:255'],
        'review_comment' => ['nullable', 'string', 'max:255'],
        'attachment' => ['nullable', 'string', 'max:255'],
        'status' => ['nullable', 'string', 'in:PENDING,APPROVED,REJECTED,CANCELLED'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'leave_policy_id' => ['sometimes', 'nullable', 'uuid', 'exists:leave_policies,id'],
            'leave_type_id' => ['sometimes', 'nullable', 'uuid', 'exists:leave_types,id'],
            'leave_type' => ['sometimes', 'required_without:leave_type_id', 'nullable', 'string', 'max:60'],
            'leave_from' => ['sometimes', 'required', 'date'],
            'leave_to' => ['sometimes', 'required', 'date', 'after_or_equal:leave_from'],
            'accept_leave_from' => ['sometimes', 'nullable', 'date'],
            'accept_leave_to' => ['sometimes', 'nullable', 'date', 'after_or_equal:accept_leave_from'],
            'accept_leave_by' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'leave_duration' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'review_comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'attachment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'status' => ['sometimes', 'nullable', 'string', 'in:PENDING,APPROVED,REJECTED,CANCELLED'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
