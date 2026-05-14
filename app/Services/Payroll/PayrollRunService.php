<?php

namespace App\Services\Payroll;

use App\Models\ApprovalLog;
use App\Models\AttendanceSummary;
use App\Models\EmployeeAddition;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeReimbursement;
use App\Models\JournalVoucher;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\PayrollSetting;
use App\Models\Payslip;
use App\Models\SalaryStructure;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollRunService
{
    public function __construct(private readonly PayrollCalculationService $calculator)
    {
    }

    public function generate(PayrollPeriod $period, ?string $branchId, array $employeeIds, User $actor, ?string $idempotencyKey = null): PayrollRun
    {
        return DB::transaction(function () use ($period, $branchId, $employeeIds, $actor, $idempotencyKey) {
            if ($idempotencyKey) {
                $existing = PayrollRun::query()->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $existing->load('payslips.lines');
                }
            }

            $settings = PayrollSetting::query()
                ->where(function ($query) use ($branchId) {
                    $query->where('branch_id', $branchId)->orWhereNull('branch_id');
                })
                ->orderByRaw('branch_id is null')
                ->firstOrCreate(
                    ['branch_id' => $branchId],
                    ['daily_rate_basis' => 'working_days', 'rounding_method' => 'nearest', 'currency_precision' => 2]
                );

            if (! $settings->allow_multiple_runs) {
                $existing = PayrollRun::query()
                    ->where('payroll_period_id', $period->id)
                    ->where('branch_id', $branchId)
                    ->first();

                if ($existing && ! in_array($existing->status, ['draft', 'generated'], true)) {
                    abort(422, 'A non-editable payroll run already exists for this period and branch.');
                }

                if ($existing) {
                    $existing->payslips()->delete();
                    $run = $existing;
                }
            }

            $run ??= PayrollRun::query()->create([
                'payroll_period_id' => $period->id,
                'branch_id' => $branchId,
                'run_number' => $this->runNumber($period),
                'status' => 'draft',
                'currency_id' => $settings->currency_id,
                'exchange_rate' => 1,
                'idempotency_key' => $idempotencyKey,
            ]);

            $employees = User::query()
                ->with(['department', 'branch'])
                ->whereIn('id', $employeeIds)
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
                ->get();

            $totals = ['gross' => '0', 'deductions' => '0', 'net' => '0'];

            foreach ($employees as $employee) {
                $structure = SalaryStructure::query()
                    ->with('lines.component')
                    ->where('employee_id', $employee->id)
                    ->where('active', true)
                    ->whereDate('effective_from', '<=', $period->end_date)
                    ->where(function ($query) use ($period) {
                        $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date);
                    })
                    ->latest('effective_from')
                    ->first();

                if (! $structure) {
                    continue;
                }

                $attendance = AttendanceSummary::query()
                    ->where('employee_id', $employee->id)
                    ->where('payroll_period_id', $period->id)
                    ->first();

                if (! $attendance) {
                    continue;
                }

                $additions = EmployeeAddition::query()
                    ->with('component')
                    ->where('employee_id', $employee->id)
                    ->where('active', true)
                    ->whereDate('effective_from', '<=', $period->end_date)
                    ->where(function ($query) use ($period) {
                        $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date);
                    })
                    ->where(function ($query) {
                        $query->where('recurring', true)->orWhereNull('consumed_payslip_id');
                    })
                    ->get();

                $deductions = EmployeeDeduction::query()
                    ->with('component')
                    ->where('employee_id', $employee->id)
                    ->where('active', true)
                    ->whereDate('effective_from', '<=', $period->end_date)
                    ->where(function ($query) use ($period) {
                        $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date);
                    })
                    ->where(function ($query) {
                        $query->where('recurring', true)->orWhereNull('consumed_payslip_id');
                    })
                    ->get();

                $reimbursements = EmployeeReimbursement::query()
                    ->where('employee_id', $employee->id)
                    ->where('status', 'approved')
                    ->where('include_in_payroll', true)
                    ->whereNull('payslip_id')
                    ->get();

                $calculation = $this->calculator->calculate($employee, $structure, $attendance, $settings, $additions, $deductions, $reimbursements);

                $payslip = Payslip::query()->create([
                    'payroll_run_id' => $run->id,
                    'employee_id' => $employee->id,
                    'user_id' => $employee->id,
                    'branch_id' => $branchId ?: $employee->branch_id,
                    'payslip_number' => $this->payslipNumber($period, $employee),
                    'status' => 'generated',
                    'salary_month' => $period->month,
                    'salary_year' => $period->year,
                    'salary' => $structure->basic_salary,
                    'paid_leave' => (int) $attendance->paid_leave_days,
                    'unpaid_leave' => (int) $attendance->unpaid_leave_days,
                    'monthly_holiday' => 0,
                    'public_holiday' => 0,
                    'work_day' => (int) $attendance->present_days,
                    'shift_wise_work_hour' => 0,
                    'monthly_work_hour' => 0,
                    'hourly_salary' => 0,
                    'working_hour' => 0,
                    'salary_payable' => $calculation['gross_earnings'],
                    'bonus' => 0,
                    'deduction' => $calculation['total_deductions'],
                    'total_payable' => $calculation['net_payable'],
                    'payment_status' => 'UNPAID',
                    'active' => true,
                    'is_system_generated' => true,
                    'gross_earnings' => $calculation['gross_earnings'],
                    'total_deductions' => $calculation['total_deductions'],
                    'employer_contributions' => $calculation['employer_contributions'],
                    'net_payable' => $calculation['net_payable'],
                    'currency_id' => $structure->currency_id ?: $settings->currency_id,
                    'exchange_rate' => $structure->exchange_rate ?: 1,
                    'base_currency_amount' => $calculation['base_currency_amount'],
                    'payable_days' => $calculation['payable_days'],
                    'total_working_days' => $calculation['total_working_days'],
                    'unpaid_leave_days' => $calculation['unpaid_leave_days'],
                    'overtime_hours' => $calculation['overtime_hours'],
                ]);

                $payslip->lines()->createMany($calculation['lines']);

                $additions->where('recurring', false)->each->update(['consumed_payslip_id' => $payslip->id]);
                $deductions->where('recurring', false)->each->update(['consumed_payslip_id' => $payslip->id]);
                $reimbursements->each->update(['payroll_run_id' => $run->id, 'payslip_id' => $payslip->id]);

                $totals['gross'] = $this->add($totals['gross'], $calculation['gross_earnings']);
                $totals['deductions'] = $this->add($totals['deductions'], $calculation['total_deductions']);
                $totals['net'] = $this->add($totals['net'], $calculation['net_payable']);
            }

            $run->update([
                'status' => 'generated',
                'total_employees' => $run->payslips()->count(),
                'total_gross' => $totals['gross'],
                'total_deductions' => $totals['deductions'],
                'total_net_payable' => $totals['net'],
                'generated_by' => $actor->id,
                'generated_at' => now(),
            ]);

            $this->log($run, 'draft', 'generated', 'generate', null, $actor);

            return $run->fresh(['payrollPeriod', 'branch', 'payslips.lines', 'payslips.employee']);
        });
    }

    public function transition(PayrollRun $run, string $toStatus, string $action, User $actor, ?string $reason = null): PayrollRun
    {
        $allowed = [
            'generated' => ['reviewed', 'void'],
            'reviewed' => ['approved', 'generated', 'void'],
            'approved' => ['paid', 'void'],
            'paid' => ['locked'],
        ];

        if (! in_array($toStatus, $allowed[$run->status] ?? [], true)) {
            abort(422, "Cannot move payroll run from {$run->status} to {$toStatus}.");
        }

        if ($toStatus === 'void' && ! $reason) {
            abort(422, 'Void reason is required.');
        }

        return DB::transaction(function () use ($run, $toStatus, $action, $actor, $reason) {
            $from = $run->status;
            $payload = ['status' => $toStatus];

            if ($toStatus === 'approved') {
                $payload['approved_by'] = $actor->id;
                $payload['approved_at'] = now();
                AttendanceSummary::query()
                    ->where('payroll_period_id', $run->payroll_period_id)
                    ->where('branch_id', $run->branch_id)
                    ->update(['locked' => true]);
            }

            if ($toStatus === 'paid') {
                $payload['paid_by'] = $actor->id;
                $payload['paid_at'] = now();
                $run->payslips()->update(['status' => 'paid', 'payment_status' => 'PAID']);
            }

            if ($toStatus === 'locked') {
                $payload['locked_by'] = $actor->id;
                $payload['locked_at'] = now();
                $run->payslips()->update(['status' => 'locked']);
            }

            if ($toStatus === 'void') {
                $payload['voided_by'] = $actor->id;
                $payload['voided_at'] = now();
                $payload['void_reason'] = $reason;
                $run->payslips()->update(['status' => 'void']);
            }

            $run->update($payload);
            $this->log($run, $from, $toStatus, $action, $reason, $actor);

            return $run->fresh(['payrollPeriod', 'branch', 'payslips.lines']);
        });
    }

    public function generateJournalVoucher(PayrollRun $run, User $actor): JournalVoucher
    {
        return DB::transaction(function () use ($run) {
            if ($run->journal_voucher_id) {
                return $run->journalVoucher;
            }

            if ($run->status !== 'approved') {
                abort(422, 'Journal voucher can only be generated for approved payroll runs.');
            }

            $settings = PayrollSetting::query()->where('branch_id', $run->branch_id)->first()
                ?: PayrollSetting::query()->whereNull('branch_id')->first();

            if (! $settings?->salary_expense_account_id || ! $settings?->salary_payable_account_id) {
                abort(422, 'Payroll accounting accounts are not configured.');
            }

            $taxPayableAccountId = $settings->tax_payable_account_id ?: $settings->salary_payable_account_id;
            $benefitPayableAccountId = $settings->benefit_payable_account_id ?: $settings->salary_payable_account_id;
            $employerContributionExpenseAccountId = $settings->salary_expense_account_id;

            $taxPayable = (string) $run->payslips()
                ->join('payslip_lines', 'payslips.id', '=', 'payslip_lines.payslip_id')
                ->where('payslip_lines.source', 'tax')
                ->sum('payslip_lines.amount');

            $benefitEmployeePayable = (string) $run->payslips()
                ->join('payslip_lines', 'payslips.id', '=', 'payslip_lines.payslip_id')
                ->where('payslip_lines.source', 'benefit')
                ->where('payslip_lines.type', 'deduction')
                ->sum('payslip_lines.amount');

            $benefitEmployerPayable = (string) $run->payslips()
                ->join('payslip_lines', 'payslips.id', '=', 'payslip_lines.payslip_id')
                ->where('payslip_lines.source', 'benefit')
                ->where('payslip_lines.type', 'employer_contribution')
                ->sum('payslip_lines.amount');

            $deductionPayable = max(0, (float) $run->total_deductions - (float) $taxPayable - (float) $benefitEmployeePayable);
            $employerContributions = (float) $run->payslips()->sum('employer_contributions');
            $debitTotal = (float) $run->total_gross + $employerContributions;

            $items = [[
                'chart_of_account_id' => $settings->salary_expense_account_id,
                'description' => "Payroll expense {$run->run_number}",
                'debit' => $run->total_gross,
                'credit' => 0,
            ]];

            if ($employerContributions > 0) {
                $items[] = [
                    'chart_of_account_id' => $employerContributionExpenseAccountId,
                    'description' => "Employer contribution expense {$run->run_number}",
                    'debit' => number_format($employerContributions, 2, '.', ''),
                    'credit' => 0,
                ];
            }

            $items[] = [
                'chart_of_account_id' => $settings->salary_payable_account_id,
                'description' => "Salary payable {$run->run_number}",
                'debit' => 0,
                'credit' => $run->total_net_payable,
            ];

            if ((float) $taxPayable > 0) {
                $items[] = [
                    'chart_of_account_id' => $taxPayableAccountId,
                    'description' => "Payroll tax payable {$run->run_number}",
                    'debit' => 0,
                    'credit' => $taxPayable,
                ];
            }

            if ((float) $deductionPayable > 0) {
                $items[] = [
                    'chart_of_account_id' => $settings->salary_payable_account_id,
                    'description' => "Other payroll deductions payable {$run->run_number}",
                    'debit' => 0,
                    'credit' => number_format($deductionPayable, 2, '.', ''),
                ];
            }

            if ((float) $benefitEmployeePayable > 0 || (float) $benefitEmployerPayable > 0) {
                $items[] = [
                    'chart_of_account_id' => $benefitPayableAccountId,
                    'description' => "Payroll benefits payable {$run->run_number}",
                    'debit' => 0,
                    'credit' => number_format((float) $benefitEmployeePayable + (float) $benefitEmployerPayable, 2, '.', ''),
                ];
            }

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $run->branch_id,
                'voucher_no' => 'JV-PAY-' . $run->run_number,
                'voucher_date' => now()->toDateString(),
                'currency_id' => $run->currency_id,
                'exchange_rate' => $run->exchange_rate ?: 1,
                'reference' => $run->run_number,
                'narration' => "Payroll journal voucher for {$run->run_number}",
                'source_type' => PayrollRun::class,
                'source_id' => $run->id,
                'source_no' => $run->run_number,
                'source_module' => 'payroll',
                'is_auto_generated' => true,
                'status' => 'posted',
                'active' => true,
                'approved' => true,
                'approved_at' => now(),
                'total' => number_format($debitTotal, 2, '.', ''),
            ]);

            $voucher->items()->createMany($items);
            $run->update(['journal_voucher_id' => $voucher->id]);
            $run->payslips()->update(['journal_voucher_id' => $voucher->id]);

            return $voucher->fresh('items');
        });
    }

    protected function runNumber(PayrollPeriod $period): string
    {
        return 'PAY-' . $period->year . str_pad((string) $period->month, 2, '0', STR_PAD_LEFT) . '-' . Str::upper(Str::random(5));
    }

    protected function payslipNumber(PayrollPeriod $period, User $employee): string
    {
        return 'PS-' . $period->year . str_pad((string) $period->month, 2, '0', STR_PAD_LEFT) . '-' . $employee->id;
    }

    protected function log(PayrollRun $run, ?string $from, string $to, string $action, ?string $reason, User $actor): void
    {
        ApprovalLog::query()->create([
            'approvable_type' => PayrollRun::class,
            'approvable_id' => $run->id,
            'from_status' => $from,
            'to_status' => $to,
            'action' => $action,
            'reason' => $reason,
            'user_id' => $actor->id,
        ]);
    }

    protected function add(string $left, string $right): string
    {
        return function_exists('bcadd')
            ? bcadd($left, $right, 2)
            : number_format(((float) $left) + ((float) $right), 2, '.', '');
    }
}
