<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\AttendanceSummary;
use App\Models\PayrollPeriod;
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

        $this->assertPeriodAcceptsAttendance($parentData['payroll_period_id'] ?? $record->payroll_period_id);

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $this->assertPeriodAcceptsAttendance($parentData['payroll_period_id']);

        $existing = AttendanceSummary::query()
            ->where('employee_id', $parentData['employee_id'])
            ->where('payroll_period_id', $parentData['payroll_period_id'])
            ->first();

        if ($existing?->locked) {
            abort(422, 'Attendance summary is locked by approved payroll.');
        }

        return parent::mutateParentDataBeforeCreate($parentData, $nestedData);
    }

    protected function assertPeriodAcceptsAttendance(string $periodId): void
    {
        $period = PayrollPeriod::query()->find($periodId);

        if ($period && in_array($period->status, ['closed', 'locked'], true)) {
            abort(422, 'Closed or locked payroll periods cannot accept attendance changes.');
        }
    }
}
