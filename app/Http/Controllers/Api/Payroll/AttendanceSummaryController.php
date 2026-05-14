<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\AttendanceSummary;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AttendanceSummaryController extends BaseCrudApiController
{
    protected string $modelClass = AttendanceSummary::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected array $relations = ['employee', 'payrollPeriod'];
    protected array $relationDetails = ['employee' => 'employee_id', 'payrollPeriod' => 'payroll_period_id'];
    protected array $filterable = ['employee_id', 'payroll_period_id', 'branch_id'];

    protected array $storeRules = [
        'employee_id' => ['required', 'integer', 'exists:users,id'],
        'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'total_working_days' => ['required', 'numeric', 'gt:0'],
        'present_days' => ['nullable', 'numeric', 'min:0'],
        'absent_days' => ['nullable', 'numeric', 'min:0'],
        'paid_leave_days' => ['nullable', 'numeric', 'min:0'],
        'unpaid_leave_days' => ['nullable', 'numeric', 'min:0'],
        'half_days' => ['nullable', 'numeric', 'min:0'],
        'late_days' => ['nullable', 'integer', 'min:0'],
        'overtime_hours' => ['nullable', 'numeric', 'min:0'],
        'payable_days' => ['required', 'numeric', 'min:0'],
        'locked' => ['nullable', 'boolean'],
    ];

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if ($record->locked) {
            abort(422, 'Attendance summary is locked by approved payroll.');
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }
}
