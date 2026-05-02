<?php

namespace App\Http\Controllers\Api;

use App\Models\Attendance;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AttendanceController extends BaseCrudApiController
{
    protected string $modelClass = Attendance::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch', 'employee'];
    protected array $relationDetails = ['branch' => 'branch_id', 'employee' => 'employee_id'];
    protected array $searchable = ['status', 'remarks'];
    protected array $filterable = ['branch_id', 'employee_id', 'status'];
    protected array $booleanFilters = ['active'];
    protected array $dateRangeFilters = ['attendance_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'attendance_date', 'clock_in_at', 'clock_out_at', 'work_hours', 'created_at'];
    protected string $defaultSort = '-attendance_date';
    protected array $storeRules = ['branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'employee_id' => ['required', 'uuid', 'exists:employees,id'], 'attendance_date' => ['required', 'date'], 'clock_in_at' => ['nullable', 'date'], 'clock_out_at' => ['nullable', 'date', 'after_or_equal:clock_in_at'], 'work_hours' => ['nullable', 'numeric', 'min:0'], 'status' => ['nullable', 'string', 'max:40'], 'remarks' => ['nullable', 'string', 'max:500'], 'active' => ['nullable', 'boolean']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'], 'employee_id' => ['sometimes', 'required', 'uuid', 'exists:employees,id'], 'attendance_date' => ['sometimes', 'required', 'date'], 'clock_in_at' => ['sometimes', 'nullable', 'date'], 'clock_out_at' => ['sometimes', 'nullable', 'date', 'after_or_equal:clock_in_at'], 'work_hours' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'status' => ['sometimes', 'nullable', 'string', 'max:40'], 'remarks' => ['sometimes', 'nullable', 'string', 'max:500'], 'active' => ['sometimes', 'nullable', 'boolean']]; }
}
