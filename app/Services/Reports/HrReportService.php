<?php

namespace App\Services\Reports;

use App\Models\Attendance;
use App\Models\EmployeeProfile;
use App\Models\LeaveApplication;
use App\Models\Payslip;
use Carbon\Carbon;

class HrReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'employee-master' => $this->employeeMaster($reportKey, $filters, $meta),
            'attendance-summary' => $this->attendanceSummary($reportKey, $filters, $meta),
            'attendance-detail' => $this->attendanceDetail($reportKey, $filters, $meta),
            'late-attendance' => $this->lateAttendance($reportKey, $filters, $meta),
            'absent-report' => $this->absentReport($reportKey, $filters, $meta),
            'leave-summary' => $this->leaveSummary($reportKey, $filters, $meta),
            'leave-balance' => $this->leaveBalance($reportKey, $filters, $meta),
            'payroll-summary' => $this->payrollSummary($reportKey, $filters, $meta),
            'payslip-register' => $this->payslipRegister($reportKey, $filters, $meta),
            'department-wise-cost' => $this->departmentWiseCost($reportKey, $filters, $meta),
            'employee-turnover' => $this->employeeTurnover($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported HR report.'),
        };
    }

    protected function employeeProfiles(array $filters)
    {
        return EmployeeProfile::query()
            ->with(['user', 'branch', 'department', 'designation', 'employmentStatus', 'shift', 'leavePolicy'])
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->when(! empty($filters['department_id']), fn ($query) => $query->where('department_id', $filters['department_id']))
            ->when(! empty($filters['designation_id']), fn ($query) => $query->where('designation_id', $filters['designation_id']))
            ->when(! empty($filters['employment_status_id']), fn ($query) => $query->where('employment_status_id', $filters['employment_status_id']))
            ->when(! empty($filters['employee_id']), fn ($query) => $query->whereKey($filters['employee_id']))
            ->when($filters['active'] !== null && $filters['active'] !== '', fn ($query) => $query->where('active', filter_var($filters['active'], FILTER_VALIDATE_BOOL)));
    }

    protected function employeeMaster(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->employeeProfiles($filters)->get()->map(fn ($employee) => [
            'employee_id' => $employee->employee_id ?: $employee->user?->employee_id,
            'name' => $employee->user?->display_name ?: $employee->user?->name,
            'branch' => $employee->branch?->name,
            'department' => $employee->department?->name,
            'designation' => $employee->designation?->name,
            'employment_status' => $employee->employmentStatus?->name,
            'join_date' => $employee->join_date?->format('Y-m-d'),
            'phone' => $employee->user?->phone,
            'email' => $employee->user?->email,
            'salary' => $this->toFloat($employee->salary),
            'status' => $employee->active ? 'Active' : 'Inactive',
        ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Employee ID', 'key' => 'employee_id'],
            ['title' => 'Name', 'key' => 'name'],
            ['title' => 'Branch', 'key' => 'branch'],
            ['title' => 'Department', 'key' => 'department'],
            ['title' => 'Designation', 'key' => 'designation'],
            ['title' => 'Employment Status', 'key' => 'employment_status'],
            ['title' => 'Join Date', 'key' => 'join_date'],
            ['title' => 'Phone', 'key' => 'phone'],
            ['title' => 'Email', 'key' => 'email'],
            ['title' => 'Salary', 'key' => 'salary'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }

    protected function attendanceSummary(string $reportKey, array $filters, array $meta): array
    {
        $attendances = Attendance::query()->with(['user.department', 'user.branch'])
            ->whereBetween('in_time', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get();

        $rows = $attendances->groupBy('user_id')->map(function ($items) {
            $user = $items->first()->user;

            return [
                'employee' => $user?->display_name ?: $user?->name,
                'department' => $user?->department?->name,
                'present_days' => $items->count(),
                'absent_days' => 0,
                'late_days' => $items->where('in_time_status', 'late')->count(),
                'early_out_days' => $items->where('out_time_status', 'early_out')->count(),
                'total_hours' => round($items->sum('total_hour'), 2),
                'overtime_hours' => 0,
            ];
        })->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'Department', 'key' => 'department'],
            ['title' => 'Present Days', 'key' => 'present_days'],
            ['title' => 'Absent Days', 'key' => 'absent_days'],
            ['title' => 'Late Days', 'key' => 'late_days'],
            ['title' => 'Early Out Days', 'key' => 'early_out_days'],
            ['title' => 'Total Hours', 'key' => 'total_hours'],
            ['title' => 'Overtime Hours', 'key' => 'overtime_hours'],
        ], $rows);
    }

    protected function attendanceDetail(string $reportKey, array $filters, array $meta): array
    {
        $rows = Attendance::query()->with('user')
            ->whereBetween('in_time', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get()->map(fn ($attendance) => [
                'date' => $attendance->in_time?->format('Y-m-d'),
                'employee' => $attendance->user?->display_name ?: $attendance->user?->name,
                'in_time' => $attendance->in_time?->format('H:i:s'),
                'out_time' => $attendance->out_time?->format('H:i:s'),
                'total_hour' => $this->toFloat($attendance->total_hour),
                'in_time_status' => $attendance->in_time_status,
                'out_time_status' => $attendance->out_time_status,
                'ip' => $attendance->ip,
                'comment' => $attendance->comment,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'In Time', 'key' => 'in_time'],
            ['title' => 'Out Time', 'key' => 'out_time'],
            ['title' => 'Total Hour', 'key' => 'total_hour'],
            ['title' => 'In Time Status', 'key' => 'in_time_status'],
            ['title' => 'Out Time Status', 'key' => 'out_time_status'],
            ['title' => 'IP', 'key' => 'ip'],
            ['title' => 'Comment', 'key' => 'comment'],
        ], $rows);
    }

    protected function lateAttendance(string $reportKey, array $filters, array $meta): array
    {
        $rows = Attendance::query()->with(['user.department', 'user.branch'])->where('in_time_status', 'late')
            ->whereBetween('in_time', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get()->map(fn ($attendance) => [
                'date' => $attendance->in_time?->format('Y-m-d'),
                'employee' => $attendance->user?->display_name ?: $attendance->user?->name,
                'shift_start' => $attendance->user?->shift?->start_time,
                'in_time' => $attendance->in_time?->format('H:i:s'),
                'late_by' => null,
                'department' => $attendance->user?->department?->name,
                'branch' => $attendance->user?->branch?->name,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'Shift Start', 'key' => 'shift_start'],
            ['title' => 'In Time', 'key' => 'in_time'],
            ['title' => 'Late By', 'key' => 'late_by'],
            ['title' => 'Department', 'key' => 'department'],
            ['title' => 'Branch', 'key' => 'branch'],
        ], $rows);
    }

    protected function absentReport(string $reportKey, array $filters, array $meta): array
    {
        $profiles = $this->employeeProfiles($filters)->get();
        $attendanceUserIds = Attendance::query()
            ->whereBetween('in_time', [$filters['date_from'].' 00:00:00', $filters['date_to'].' 23:59:59'])
            ->whereIn('user_id', $profiles->pluck('user_id'))
            ->pluck('user_id')
            ->unique();
        $leaveUsers = LeaveApplication::query()
            ->where('status', 'APPROVED')
            ->whereDate('leave_from', '<=', $filters['date_to'])
            ->whereDate('leave_to', '>=', $filters['date_from'])
            ->whereIn('user_id', $profiles->pluck('user_id'))
            ->pluck('user_id')
            ->unique();

        $rows = $profiles->filter(fn ($profile) => ! $attendanceUserIds->contains($profile->user_id))
            ->map(fn ($profile) => [
                'date' => $filters['date_from'].' - '.$filters['date_to'],
                'employee' => $profile->user?->display_name ?: $profile->user?->name,
                'department' => $profile->department?->name,
                'branch' => $profile->branch?->name,
                'leave_status' => $leaveUsers->contains($profile->user_id) ? 'Approved Leave' : 'Absent',
            ])->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'Department', 'key' => 'department'],
            ['title' => 'Branch', 'key' => 'branch'],
            ['title' => 'Leave Status', 'key' => 'leave_status'],
        ], $rows);
    }

    protected function leaveSummary(string $reportKey, array $filters, array $meta): array
    {
        $rows = LeaveApplication::query()->with('user')
            ->whereDate('leave_from', '<=', $filters['date_to'])
            ->whereDate('leave_to', '>=', $filters['date_from'])
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get()->groupBy(fn ($leave) => $leave->user_id.'|'.$leave->leave_type)
            ->map(function ($items) {
                $leave = $items->first();

                return [
                    'employee' => $leave->user?->display_name ?: $leave->user?->name,
                    'leave_type' => $leave->leave_type,
                    'applied_count' => $items->count(),
                    'approved_count' => $items->where('status', 'APPROVED')->count(),
                    'rejected_count' => $items->where('status', 'REJECTED')->count(),
                    'cancelled_count' => $items->where('status', 'CANCELLED')->count(),
                    'total_leave_days' => $items->sum('leave_duration'),
                ];
            })->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'Leave Type', 'key' => 'leave_type'],
            ['title' => 'Applied Count', 'key' => 'applied_count'],
            ['title' => 'Approved Count', 'key' => 'approved_count'],
            ['title' => 'Rejected Count', 'key' => 'rejected_count'],
            ['title' => 'Cancelled Count', 'key' => 'cancelled_count'],
            ['title' => 'Total Leave Days', 'key' => 'total_leave_days'],
        ], $rows);
    }

    protected function leaveBalance(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->employeeProfiles($filters)->get()->map(function ($profile) {
            $used = LeaveApplication::query()->where('user_id', $profile->user_id)->where('status', 'APPROVED')->sum('leave_duration');
            $entitlement = (float) ($profile->leavePolicy?->paid_leave_count ?? 0);
            $unpaidUsed = LeaveApplication::query()
                ->where('user_id', $profile->user_id)
                ->where('status', 'APPROVED')
                ->where(function ($query) {
                    $query->whereRaw('LOWER(leave_type) LIKE ?', ['%unpaid%'])
                        ->orWhereHas('leaveTypeRecord', fn ($type) => $type->where('is_paid', false));
                })->sum('leave_duration');

            return [
                'employee' => $profile->user?->display_name ?: $profile->user?->name,
                'leave_policy' => $profile->leavePolicy?->name,
                'paid_leave_entitlement' => $entitlement,
                'paid_leave_used' => $used,
                'paid_leave_balance' => round($entitlement - $used, 2),
                'unpaid_leave_used' => $unpaidUsed,
            ];
        })->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Employee', 'key' => 'employee'],
            ['title' => 'Leave Policy', 'key' => 'leave_policy'],
            ['title' => 'Paid Leave Entitlement', 'key' => 'paid_leave_entitlement'],
            ['title' => 'Paid Leave Used', 'key' => 'paid_leave_used'],
            ['title' => 'Paid Leave Balance', 'key' => 'paid_leave_balance'],
            ['title' => 'Unpaid Leave Used', 'key' => 'unpaid_leave_used'],
        ], $rows);
    }

    protected function payrollSummary(string $reportKey, array $filters, array $meta): array
    {
        return $this->payslipRegister($reportKey, $filters, $meta, true);
    }

    protected function payslipRegister(string $reportKey, array $filters, array $meta, bool $summaryMode = false): array
    {
        $payslips = Payslip::query()->with(['user', 'branch'])
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get()
            ->filter(fn ($payslip) => $this->payslipInPeriod($payslip, $filters));
        $rows = $payslips->map(fn ($payslip) => [
            'salary_month' => $payslip->salary_month,
            'salary_year' => $payslip->salary_year,
            'employee' => $payslip->user?->display_name ?: $payslip->user?->name,
            'branch' => $payslip->branch?->name,
            'basic_salary' => $this->toFloat($payslip->salary),
            'paid_leave' => $this->toFloat($payslip->paid_leave),
            'unpaid_leave' => $this->toFloat($payslip->unpaid_leave),
            'bonus' => $this->toFloat($payslip->bonus),
            'deduction' => $this->toFloat($payslip->deduction),
            'salary_payable' => $this->toFloat($payslip->salary_payable),
            'total_payable' => $this->toFloat($payslip->total_payable),
            'payment_status' => $payslip->payment_status,
            'work_days' => $payslip->work_day,
            'working_hour' => $this->toFloat($payslip->working_hour),
        ])->all();

        $columns = $summaryMode
            ? [
                ['title' => 'Salary Month', 'key' => 'salary_month'],
                ['title' => 'Salary Year', 'key' => 'salary_year'],
                ['title' => 'Employee', 'key' => 'employee'],
                ['title' => 'Branch', 'key' => 'branch'],
                ['title' => 'Basic Salary', 'key' => 'basic_salary'],
                ['title' => 'Paid Leave', 'key' => 'paid_leave'],
                ['title' => 'Unpaid Leave', 'key' => 'unpaid_leave'],
                ['title' => 'Bonus', 'key' => 'bonus'],
                ['title' => 'Deduction', 'key' => 'deduction'],
                ['title' => 'Salary Payable', 'key' => 'salary_payable'],
                ['title' => 'Total Payable', 'key' => 'total_payable'],
                ['title' => 'Payment Status', 'key' => 'payment_status'],
            ]
            : [
                ['title' => 'Payslip Month', 'key' => 'salary_month'],
                ['title' => 'Employee', 'key' => 'employee'],
                ['title' => 'Salary', 'key' => 'basic_salary'],
                ['title' => 'Work Days', 'key' => 'work_days'],
                ['title' => 'Working Hour', 'key' => 'working_hour'],
                ['title' => 'Salary Payable', 'key' => 'salary_payable'],
                ['title' => 'Bonus', 'key' => 'bonus'],
                ['title' => 'Deduction', 'key' => 'deduction'],
                ['title' => 'Total Payable', 'key' => 'total_payable'],
                ['title' => 'Payment Status', 'key' => 'payment_status'],
            ];

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, $columns, $rows, [
            ['label' => 'Total Salary', 'value' => $this->total($rows, 'basic_salary')],
            ['label' => 'Total Bonus', 'value' => $this->total($rows, 'bonus')],
            ['label' => 'Total Deduction', 'value' => $this->total($rows, 'deduction')],
            ['label' => 'Total Payable', 'value' => $this->total($rows, 'total_payable')],
            ['label' => 'Paid', 'value' => collect($rows)->where('payment_status', 'paid')->sum('total_payable')],
            ['label' => 'Unpaid', 'value' => collect($rows)->where('payment_status', '!=', 'paid')->sum('total_payable')],
        ]);
    }

    protected function departmentWiseCost(string $reportKey, array $filters, array $meta): array
    {
        $rows = Payslip::query()->with('user.department')
            ->whereIn('user_id', $this->employeeUserIds($filters))
            ->get()
            ->filter(fn ($payslip) => $this->payslipInPeriod($payslip, $filters))
            ->groupBy(fn ($payslip) => $payslip->user?->department?->name ?: 'Unassigned')
            ->map(fn ($items, $department) => [
                'department' => $department,
                'employee_count' => $items->pluck('user_id')->unique()->count(),
                'gross_salary' => round($items->sum('salary'), 2),
                'bonus' => round($items->sum('bonus'), 2),
                'deduction' => round($items->sum('deduction'), 2),
                'net_payable' => round($items->sum('total_payable'), 2),
            ])->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Department', 'key' => 'department'],
            ['title' => 'Employee Count', 'key' => 'employee_count'],
            ['title' => 'Gross Salary', 'key' => 'gross_salary'],
            ['title' => 'Bonus', 'key' => 'bonus'],
            ['title' => 'Deduction', 'key' => 'deduction'],
            ['title' => 'Net Payable', 'key' => 'net_payable'],
        ], $rows);
    }

    protected function employeeTurnover(string $reportKey, array $filters, array $meta): array
    {
        $from = Carbon::parse($filters['date_from'])->startOfMonth();
        $to = Carbon::parse($filters['date_to'])->endOfMonth();
        $rows = [];
        while ($from <= $to) {
            $monthStart = $from->copy()->startOfMonth();
            $monthEnd = $from->copy()->endOfMonth();
            $base = $this->employeeProfiles($filters);
            $opening = (clone $base)->whereDate('join_date', '<', $monthStart)->where(function ($query) use ($monthStart) {
                $query->whereNull('leave_date')->orWhereDate('leave_date', '>=', $monthStart);
            })->count();
            $joined = (clone $base)->whereBetween('join_date', [$monthStart, $monthEnd])->count();
            $left = (clone $base)->whereBetween('leave_date', [$monthStart, $monthEnd])->count();
            $closing = $opening + $joined - $left;
            $avg = ($opening + $closing) / 2;
            $rows[] = [
                'month' => $monthStart->format('Y-m'),
                'opening_employees' => $opening,
                'joined' => $joined,
                'left' => $left,
                'closing_employees' => $closing,
                'turnover_percent' => $avg > 0 ? round(($left / $avg) * 100, 2) : 0,
            ];
            $from->addMonth();
        }

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Month', 'key' => 'month'],
            ['title' => 'Opening Employees', 'key' => 'opening_employees'],
            ['title' => 'Joined', 'key' => 'joined'],
            ['title' => 'Left', 'key' => 'left'],
            ['title' => 'Closing Employees', 'key' => 'closing_employees'],
            ['title' => 'Turnover %', 'key' => 'turnover_percent'],
        ], $rows);
    }

    private function employeeUserIds(array $filters)
    {
        return $this->employeeProfiles($filters)->pluck('user_id')->filter()->values();
    }

    private function payslipInPeriod(Payslip $payslip, array $filters): bool
    {
        $month = Carbon::create((int) $payslip->salary_year, (int) $payslip->salary_month, 1);

        return $month->betweenIncluded(
            Carbon::parse($filters['date_from'])->startOfMonth(),
            Carbon::parse($filters['date_to'])->startOfMonth(),
        );
    }
}
