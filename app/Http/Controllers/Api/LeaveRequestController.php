<?php

namespace App\Http\Controllers\Api;

use App\Models\LeaveRequest;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LeaveRequestController extends BaseCrudApiController
{
    protected string $modelClass = LeaveRequest::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch', 'employee', 'leaveType', 'approvedBy', 'voidedBy'];
    protected array $relationDetails = ['branch' => 'branch_id', 'employee' => 'employee_id', 'leaveType' => 'leave_type_id', 'approvedBy' => 'approved_by_id', 'voidedBy' => 'voided_by_id'];
    protected array $searchable = ['reason', 'status'];
    protected array $filterable = ['branch_id', 'employee_id', 'leave_type_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $dateRangeFilters = ['from_date' => ['from' => 'from_date_from', 'to' => 'from_date_to'], 'to_date' => ['from' => 'to_date_from', 'to' => 'to_date_to']];
    protected array $sortable = ['id', 'from_date', 'to_date', 'requested_days', 'status', 'created_at'];
    protected string $defaultSort = '-created_at';
    protected array $storeRules = ['branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'employee_id' => ['required', 'uuid', 'exists:employees,id'], 'leave_type_id' => ['required', 'uuid', 'exists:leave_types,id'], 'from_date' => ['required', 'date'], 'to_date' => ['required', 'date', 'after_or_equal:from_date'], 'requested_days' => ['nullable', 'numeric', 'min:0.5'], 'reason' => ['nullable', 'string'], 'status' => ['nullable', 'string', 'max:40'], 'active' => ['nullable', 'boolean'], 'approved' => ['nullable', 'boolean'], 'approved_at' => ['nullable', 'date'], 'approved_by_id' => ['nullable', 'integer', 'exists:users,id'], 'void' => ['nullable', 'boolean'], 'voided_by_id' => ['nullable', 'integer', 'exists:users,id'], 'voided_reason' => ['nullable', 'string'], 'voided_at' => ['nullable', 'date']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'], 'employee_id' => ['sometimes', 'required', 'uuid', 'exists:employees,id'], 'leave_type_id' => ['sometimes', 'required', 'uuid', 'exists:leave_types,id'], 'from_date' => ['sometimes', 'required', 'date'], 'to_date' => ['sometimes', 'required', 'date', 'after_or_equal:from_date'], 'requested_days' => ['sometimes', 'nullable', 'numeric', 'min:0.5'], 'reason' => ['sometimes', 'nullable', 'string'], 'status' => ['sometimes', 'nullable', 'string', 'max:40'], 'active' => ['sometimes', 'nullable', 'boolean'], 'approved' => ['sometimes', 'nullable', 'boolean'], 'approved_at' => ['sometimes', 'nullable', 'date'], 'approved_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'], 'void' => ['sometimes', 'nullable', 'boolean'], 'voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'], 'voided_reason' => ['sometimes', 'nullable', 'string'], 'voided_at' => ['sometimes', 'nullable', 'date']]; }
}
