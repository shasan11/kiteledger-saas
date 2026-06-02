<?php

namespace App\Services\Payroll;

use App\Models\Attendance;
use App\Models\AttendanceSummary;
use App\Models\LeaveApplication;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\PublicHoliday;
use App\Models\User;
use Carbon\CarbonImmutable;
use Carbon\CarbonPeriod;
use Illuminate\Support\Collection;

class AttendanceSummaryService
{
    public function calculate(User $employee, PayrollPeriod $period, ?PayrollSetting $settings = null, bool $persist = true): array
    {
        $settings ??= PayrollSetting::query()
            ->where(fn ($query) => $query->where('branch_id', $employee->branch_id ?: $period->branch_id)->orWhereNull('branch_id'))
            ->orderByRaw('branch_id is null')
            ->first();

        $start = CarbonImmutable::parse($period->start_date)->startOfDay();
        $end = CarbonImmutable::parse($period->end_date)->startOfDay();
        $dates = collect(iterator_to_array(CarbonPeriod::create($start, $end)));
        $calendarDays = $dates->count();
        $warnings = [];

        $shiftHours = (float) ($employee->shift?->work_hour ?: 8);
        if ($shiftHours <= 0) {
            $shiftHours = 8;
            $warnings[] = 'Employee has no valid shift. Default 8 working hours was used.';
        }

        $weeklyHolidayDates = $this->weeklyHolidayDates($employee, $dates);
        $publicHolidayDates = $this->publicHolidayDates($start, $end);
        $holidayDates = $weeklyHolidayDates->merge($publicHolidayDates)->unique()->values();
        $workingDates = $dates
            ->reject(fn ($date) => $holidayDates->contains($date->toDateString()))
            ->values();

        $attendanceByDate = $this->attendanceByDate($employee, $start, $end);
        $leaveByDate = $this->leaveByDate($employee, $start, $end);
        $hasAttendanceInputs = ! empty($attendanceByDate) || ! empty($leaveByDate);

        $presentDays = 0.0;
        $halfDays = 0.0;
        $paidLeaveDays = 0.0;
        $unpaidLeaveDays = 0.0;
        $absentDays = 0.0;
        $lateDays = 0;
        $overtimeHours = 0.0;
        $workingHours = 0.0;

        foreach ($workingDates as $date) {
            $key = $date->toDateString();
            $attendanceHours = (float) ($attendanceByDate[$key] ?? 0);
            $leave = $leaveByDate[$key] ?? null;

            if (! $hasAttendanceInputs) {
                $presentDays += 1;
                $workingHours += $shiftHours;
                continue;
            }

            if ($attendanceHours > 0) {
                $workingHours += $attendanceHours;
                $dayValue = $attendanceHours >= ($shiftHours / 2) ? 1.0 : 0.5;
                $presentDays += $dayValue;
                if ($dayValue < 1) {
                    $halfDays += 1;
                }
                $overtimeHours += max(0, $attendanceHours - $shiftHours);
                continue;
            }

            if ($leave) {
                if ($leave['paid']) {
                    $paidLeaveDays += $leave['days'];
                } else {
                    $unpaidLeaveDays += $leave['days'];
                }
                continue;
            }

            $absentDays += 1;
            $unpaidLeaveDays += 1;
        }

        if ($workingDates->isEmpty()) {
            $warnings[] = 'Payroll period has zero working days after holidays.';
        }

        $totalWorkingDays = (float) $workingDates->count();
        $payableDays = max(0, $totalWorkingDays - $unpaidLeaveDays);
        $monthlyWorkHour = $totalWorkingDays * $shiftHours;

        $payload = [
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'branch_id' => $employee->branch_id ?: $period->branch_id,
            'total_working_days' => round($totalWorkingDays, 2),
            'present_days' => round($presentDays, 2),
            'absent_days' => round($absentDays, 2),
            'paid_leave_days' => round($paidLeaveDays, 2),
            'unpaid_leave_days' => round($unpaidLeaveDays, 2),
            'half_days' => round($halfDays, 2),
            'late_days' => $lateDays,
            'overtime_hours' => round($overtimeHours, 2),
            'payable_days' => round($payableDays, 2),
            'locked' => false,
        ];

        if ($persist) {
            $summary = AttendanceSummary::query()->updateOrCreate([
                'employee_id' => $employee->id,
                'payroll_period_id' => $period->id,
            ], $payload);
        }

        return [
            'summary' => $persist ? $summary->fresh() : new AttendanceSummary($payload),
            'warnings' => $warnings,
            'calendar_days' => $calendarDays,
            'weekly_holiday' => $weeklyHolidayDates->count(),
            'public_holiday' => $publicHolidayDates->count(),
            'shift_hours' => $shiftHours,
            'monthly_work_hour' => round($monthlyWorkHour, 2),
            'working_hour' => round($workingHours, 2),
        ];
    }

    private function weeklyHolidayDates(User $employee, Collection $dates): Collection
    {
        $holiday = $employee->weeklyHoliday;
        if (! $holiday) {
            return collect();
        }

        $startDay = $this->normalizeDay($holiday->start_day);
        $endDay = $this->normalizeDay($holiday->end_day ?: $holiday->start_day);
        $days = $startDay === $endDay ? [$startDay] : [$startDay, $endDay];

        return $dates
            ->filter(fn ($date) => in_array(strtolower($date->format('l')), $days, true))
            ->map(fn ($date) => $date->toDateString())
            ->values();
    }

    private function publicHolidayDates(CarbonImmutable $start, CarbonImmutable $end): Collection
    {
        return PublicHoliday::query()
            ->where('active', true)
            ->whereDate('date', '>=', $start)
            ->whereDate('date', '<=', $end)
            ->pluck('date')
            ->map(fn ($date) => CarbonImmutable::parse($date)->toDateString())
            ->unique()
            ->values();
    }

    private function attendanceByDate(User $employee, CarbonImmutable $start, CarbonImmutable $end): array
    {
        return Attendance::query()
            ->where('user_id', $employee->id)
            ->where('active', true)
            ->whereBetween('in_time', [$start->startOfDay(), $end->endOfDay()])
            ->get()
            ->groupBy(fn (Attendance $attendance) => $attendance->in_time?->toDateString())
            ->map(fn ($items) => round($items->sum(fn (Attendance $attendance) => (float) ($attendance->total_hour ?: $this->hoursBetween($attendance))), 2))
            ->all();
    }

    private function leaveByDate(User $employee, CarbonImmutable $start, CarbonImmutable $end): array
    {
        $leaves = LeaveApplication::query()
            ->with('leaveTypeRecord')
            ->where('user_id', $employee->id)
            ->where('active', true)
            ->whereIn('status', ['approved', 'accepted', 'accept'])
            ->whereDate('leave_from', '<=', $end)
            ->whereDate('leave_to', '>=', $start)
            ->get();

        $map = [];
        foreach ($leaves as $leave) {
            $paid = ! str_contains(strtolower((string) ($leave->leave_type ?: $leave->leaveTypeRecord?->name)), 'unpaid');
            $from = CarbonImmutable::parse($leave->accept_leave_from ?: $leave->leave_from)->max($start);
            $to = CarbonImmutable::parse($leave->accept_leave_to ?: $leave->leave_to)->min($end);

            foreach (CarbonPeriod::create($from, $to) as $date) {
                $key = $date->toDateString();
                $map[$key] = ['paid' => $paid, 'days' => 1.0];
            }
        }

        return $map;
    }

    private function hoursBetween(Attendance $attendance): float
    {
        if (! $attendance->in_time || ! $attendance->out_time) {
            return 0;
        }

        return round($attendance->in_time->diffInMinutes($attendance->out_time) / 60, 2);
    }

    private function normalizeDay(mixed $day): string
    {
        if (is_numeric($day)) {
            return strtolower(CarbonImmutable::now()->startOfWeek()->addDays(((int) $day) % 7)->format('l'));
        }

        return strtolower(trim((string) $day));
    }
}
