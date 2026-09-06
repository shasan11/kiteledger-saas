<?php

namespace App\Services\Payroll;

use App\Models\Account;
use App\Models\ApprovalLog;
use App\Models\AttendanceSummary;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\EmployeeAddition;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeReimbursement;
use App\Models\FiscalYear;
use App\Models\JournalVoucher;
use App\Models\Payroll;
use App\Models\PayrollAddition;
use App\Models\PayrollDeduction;
use App\Models\PayrollPeriod;
use App\Models\PayrollPayment;
use App\Models\PayrollSetting;
use App\Models\Payslip;
use App\Models\PayslipLine;
use App\Models\SalaryHistory;
use App\Models\SalaryStructure;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class PayrollService
{
    public function __construct(
        private readonly PayrollCalculationService $calculator,
        private readonly PayrollAccountSyncService $accountSync,
        private readonly AttendanceSummaryService $attendanceSummaryService,
    )
    {
    }

    public function preview(PayrollPeriod $period, ?string $branchId, array $employeeIds, array $options = []): array
    {
        $branchId ??= $period->branch_id;
        $settings = $this->settings($branchId);
        $strictAttendanceLock = (bool) ($options['strict_attendance_lock'] ?? false);

        $selected = User::query()
            ->with(['department', 'branch', 'payrollAccount.chartOfAccounts'])
            ->whereIn('id', $employeeIds)
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->orderBy('name')
            ->get();

        $eligible = [];
        $skipped = [];
        $totals = [
            'gross_earnings' => 0.0,
            'total_deductions' => 0.0,
            'employer_contributions' => 0.0,
            'net_payable' => 0.0,
        ];

        foreach ($selected as $employee) {
            $prepared = $this->prepareEmployeeCalculation($employee, $period, $settings, $strictAttendanceLock, $options);

            if ($prepared['reasons']) {
                $skipped[] = [
                    'employee_id' => $employee->id,
                    'employee_code' => $employee->employee_id,
                    'employee_name' => $employee->display_name,
                    'branch' => $employee->branch?->name,
                    'reasons' => $prepared['reasons'],
                ];
                continue;
            }

            $calculation = $prepared['calculation'];
            foreach ($totals as $key => $value) {
                $totals[$key] += (float) $calculation[$key];
            }

            $eligible[] = [
                'employee_id' => $employee->id,
                'employee_code' => $employee->employee_id,
                'employee_name' => $employee->display_name,
                'branch' => $employee->branch?->name,
                'salary' => (float) ($prepared['structure']?->basic_salary ?? 0),
                'total_working_days' => (float) ($calculation['total_working_days'] ?? 0),
                'present_days' => (float) ($calculation['attendance']['present_days'] ?? 0),
                'paid_leave' => (float) ($calculation['attendance']['paid_leave_days'] ?? 0),
                'unpaid_leave' => (float) ($calculation['attendance']['unpaid_leave_days'] ?? 0),
                'payable_days' => (float) ($calculation['payable_days'] ?? 0),
                'overtime_hours' => (float) ($calculation['overtime_hours'] ?? 0),
                'salary_payable' => (float) ($calculation['salary_payable'] ?? 0),
                'gross_earnings' => (float) $calculation['gross_earnings'],
                'total_deductions' => (float) $calculation['total_deductions'],
                'employer_contributions' => (float) $calculation['employer_contributions'],
                'net_payable' => (float) $calculation['net_payable'],
                'lines' => $calculation['lines'] ?? [],
                'calculation_snapshot' => $calculation['snapshot'] ?? [],
                'warnings' => $prepared['warnings'] ?? [],
            ];
        }

        $settingsErrors = $this->validatePayrollSettings($settings, 'generate');

        return [
            'period' => $period,
            'branch_id' => $branchId,
            'selected_employee_count' => $selected->count(),
            'eligible_employee_count' => count($eligible),
            'skipped_employee_count' => count($skipped),
            'eligible_employees' => $eligible,
            'skipped_employees' => $skipped,
            'totals' => array_map(fn ($amount) => round($amount, (int) $settings->currency_precision), $totals),
            'settings_checklist' => [
                'ready' => empty($settingsErrors),
                'errors' => $settingsErrors,
            ],
            'accounting_readiness' => [
                'process' => [
                    'ready' => empty($this->validatePayrollSettings($settings, 'process_preview')),
                    'errors' => $this->validatePayrollSettings($settings, 'process_preview'),
                ],
            ],
        ];
    }

    public function generate(PayrollPeriod $period, ?string $branchId, array $employeeIds, User $actor, array $options = []): Payroll
    {
        return DB::transaction(function () use ($period, $branchId, $employeeIds, $actor, $options) {
            $branchId ??= $period->branch_id;
            if (! in_array($period->status, ['open', 'processing'], true)) {
                abort(422, 'Payroll can only be generated for an open payroll period.');
            }

            $strict = filter_var($options['strict'] ?? true, FILTER_VALIDATE_BOOLEAN);
            $preview = $this->preview($period, $branchId, $employeeIds, $options);
            if ($preview['settings_checklist']['errors']) {
                throw ValidationException::withMessages(['settings' => $preview['settings_checklist']['errors']]);
            }
            if ($strict && $preview['skipped_employee_count'] > 0) {
                throw ValidationException::withMessages([
                    'employees' => collect($preview['skipped_employees'])
                        ->map(fn ($row) => $row['employee_name'] . ': ' . implode(', ', $row['reasons']))
                        ->values()
                        ->all(),
                ]);
            }
            if ($preview['eligible_employee_count'] === 0) {
                abort(422, 'No eligible employees were found for this payroll.');
            }

            $idempotencyKey = $options['idempotency_key'] ?? null;

            if ($idempotencyKey) {
                $existing = Payroll::query()->where('idempotency_key', $idempotencyKey)->first();
                if ($existing) {
                    return $this->loadPayroll($existing);
                }
            }

            $settings = $this->settings($branchId);
            $fiscalYearId = $this->fiscalYearForDate($period->end_date)?->id;

            if (! $settings->allow_multiple_runs) {
                $existing = Payroll::query()
                    ->where('payroll_period_id', $period->id)
                    ->where('branch_id', $branchId)
                    ->first();

                if ($existing && ! $this->isEditable($existing)) {
                    abort(422, 'A non-editable payroll already exists for this period and branch.');
                }

                if ($existing) {
                    $existing->payslips()->delete();
                    $payroll = $existing;
                    $payroll->additions()->delete();
                    $payroll->deductions()->delete();
                }
            }

            $number = $this->payrollNumber($period);
            $payroll ??= Payroll::query()->create([
                'payroll_period_id' => $period->id,
                'branch_id' => $branchId,
                'payroll_number' => $number,
                'run_number' => $number,
                'status' => 'draft',
                'fiscal_year_id' => $fiscalYearId,
                'currency_id' => $options['currency_id'] ?? $settings->currency_id,
                'exchange_rate' => $options['exchange_rate'] ?? 1,
                'source_account_id' => $options['source_account_id'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'preview_snapshot' => $preview,
            ]);

            if (isset($payroll) && $payroll->exists) {
                $payroll->forceFill([
                    'preview_snapshot' => $preview,
                    'fiscal_year_id' => $fiscalYearId,
                    'currency_id' => $options['currency_id'] ?? $settings->currency_id,
                    'exchange_rate' => $options['exchange_rate'] ?? 1,
                    'source_account_id' => $options['source_account_id'] ?? $payroll->source_account_id,
                ])->save();
            }

            $employees = User::query()
                ->with(['department', 'branch', 'payrollAccount.chartOfAccounts'])
                ->whereIn('id', collect($preview['eligible_employees'])->pluck('employee_id')->all())
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
                ->get();

            foreach ($employees as $employee) {
                $prepared = $this->prepareEmployeeCalculation($employee, $period, $settings, false, $options);
                $structure = $prepared['structure'];
                $attendance = $prepared['attendance'];
                $calculation = $prepared['calculation'];
                $additions = $prepared['additions'];
                $deductions = $prepared['deductions'];
                $reimbursements = $prepared['reimbursements'];

                $payslip = Payslip::query()->create([
                    'payroll_id' => $payroll->id,
                    'payroll_run_id' => $payroll->id,
                    'employee_id' => $employee->id,
                    'user_id' => $employee->id,
                    'branch_id' => $branchId ?: $employee->branch_id,
                    'fiscal_year_id' => $fiscalYearId,
                    'payslip_number' => $this->payslipNumber($period, $employee),
                    'status' => 'generated',
                    'salary_month' => $period->month,
                    'salary_year' => $period->year,
                    'salary' => $structure->basic_salary,
                    'paid_leave' => (float) $attendance->paid_leave_days,
                    'unpaid_leave' => (float) $attendance->unpaid_leave_days,
                    'monthly_holiday' => (float) ($calculation['attendance']['weekly_holiday'] ?? 0),
                    'public_holiday' => (float) ($calculation['attendance']['public_holiday'] ?? 0),
                    'work_day' => (int) $attendance->present_days,
                    'shift_wise_work_hour' => (float) ($calculation['attendance']['shift_hours'] ?? 0),
                    'monthly_work_hour' => (float) ($calculation['attendance']['monthly_work_hour'] ?? 0),
                    'hourly_salary' => (float) ($calculation['hourly_salary'] ?? 0),
                    'working_hour' => (float) ($calculation['attendance']['working_hour'] ?? 0),
                    'salary_payable' => $calculation['salary_payable'] ?? $calculation['gross_earnings'],
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
                    'currency_id' => $structure->currency_id ?: $payroll->currency_id ?: $settings->currency_id,
                    'exchange_rate' => $structure->exchange_rate ?: $payroll->exchange_rate ?: 1,
                    'base_currency_amount' => $calculation['base_currency_amount'],
                    'calculation_snapshot' => $calculation['snapshot'] ?? $calculation,
                    'payable_days' => $calculation['payable_days'],
                    'total_working_days' => $calculation['total_working_days'],
                    'unpaid_leave_days' => $calculation['unpaid_leave_days'],
                    'overtime_hours' => $calculation['overtime_hours'],
                    'remarks' => null,
                    'payment_reference' => $options['payment_reference'] ?? null,
                ]);

                $payslip->lines()->createMany($calculation['lines']);
                $additions->where('recurring', false)->each->update(['consumed_payslip_id' => $payslip->id]);
                $deductions->where('recurring', false)->each->update(['consumed_payslip_id' => $payslip->id]);
                $reimbursements->each->update(['payroll_run_id' => $payroll->id, 'payslip_id' => $payslip->id]);
            }

            $payroll->update([
                'status' => 'generated',
                'generated_by' => $actor->id,
                'generated_at' => now(),
            ]);

            $this->recalculatePayroll($payroll);
            $this->log($payroll, 'draft', 'generated', 'generate', null, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    public function addPayrollAdjustment(Payroll $payroll, string $kind, array $data, User $actor): Payroll
    {
        return DB::transaction(function () use ($payroll, $kind, $data, $actor) {
            $payroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);
            $this->assertEditable($payroll);
            $this->assertSelectedEmployeesBelongToPayroll($payroll, $data);

            $model = $kind === 'addition' ? PayrollAddition::class : PayrollDeduction::class;
            $adjustment = $model::query()->create([
                'payroll_id' => $payroll->id,
                'component_id' => $data['component_id'] ?? null,
                'name' => $data['name'],
                'amount' => $data['amount'],
                'calculation_type' => $data['calculation_type'],
                'applicability_type' => $data['applicability_type'],
                'selected_employee_ids' => $data['applicability_type'] === 'selected_employees'
                    ? array_values($data['selected_employee_ids'] ?? [])
                    : null,
                'remarks' => $data['remarks'] ?? null,
            ]);

            $this->applyPayrollAdjustmentToPayslips($payroll, $adjustment, $kind);
            $this->recalculatePayroll($payroll);
            $this->log($payroll, $payroll->status, $payroll->status, "payroll_{$kind}_added", $adjustment->name, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    public function deletePayrollAdjustment(Payroll $payroll, string $kind, string $adjustmentId, User $actor): Payroll
    {
        return DB::transaction(function () use ($payroll, $kind, $adjustmentId, $actor) {
            $payroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);
            $this->assertEditable($payroll);

            $model = $kind === 'addition' ? PayrollAddition::class : PayrollDeduction::class;
            $adjustment = $model::query()->where('payroll_id', $payroll->id)->findOrFail($adjustmentId);
            $source = $kind === 'addition' ? 'payroll_addition' : 'payroll_deduction';

            PayslipLine::query()
                ->whereIn('payslip_id', $payroll->payslips()->pluck('id'))
                ->where('source', $source)
                ->where('remarks', 'like', "%Adjustment:{$adjustment->id}%")
                ->delete();

            $name = $adjustment->name;
            $adjustment->delete();
            $this->recalculatePayroll($payroll);
            $this->log($payroll, $payroll->status, $payroll->status, "payroll_{$kind}_deleted", $name, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    public function addPayslipLine(Payslip $payslip, array $data, User $actor): Payslip
    {
        return DB::transaction(function () use ($payslip, $data, $actor) {
            $payslip = Payslip::query()->with('payroll')->lockForUpdate()->findOrFail($payslip->id);
            $this->assertEditable($payslip->payroll);

            $payslip->lines()->create([
                'component_id' => $data['component_id'] ?? null,
                'type' => $data['type'],
                'name' => $data['name'],
                'amount' => $data['amount'],
                'base_currency_amount' => $this->baseAmount($data['amount'], $payslip->exchange_rate),
                'calculation_type' => $data['calculation_type'],
                'source' => $data['source'],
                'meta' => [
                    'affects_net_salary' => $data['component_id']
                        ? (bool) SalaryComponent::query()->whereKey($data['component_id'])->value('affects_net_salary')
                        : true,
                ],
                'remarks' => $data['remarks'] ?? null,
            ]);

            $this->recalculatePayslip($payslip);
            $this->recalculatePayroll($payslip->payroll);
            $this->log($payslip->payroll, $payslip->payroll->status, $payslip->payroll->status, 'payslip_line_added', $data['name'], $actor);

            return $payslip->fresh(['employee.payrollAccount', 'lines.component', 'payroll']);
        });
    }

    public function deletePayslipLine(PayslipLine $line, User $actor): Payslip
    {
        return DB::transaction(function () use ($line, $actor) {
            $line = PayslipLine::query()->with('payslip.payroll')->lockForUpdate()->findOrFail($line->id);
            $payroll = $line->payslip->payroll;
            $this->assertEditable($payroll);

            if (in_array($line->source, ['salary_structure', 'payroll_addition', 'payroll_deduction', 'attendance', 'overtime', 'tax', 'benefit', 'reimbursement'], true)) {
                abort(422, 'Only manual payslip lines can be deleted here.');
            }

            $payslip = $line->payslip;
            $name = $line->name;
            $line->delete();
            $this->recalculatePayslip($payslip);
            $this->recalculatePayroll($payroll);
            $this->log($payroll, $payroll->status, $payroll->status, 'payslip_line_deleted', $name, $actor);

            return $payslip->fresh(['employee.payrollAccount', 'lines.component', 'payroll']);
        });
    }

    public function transition(Payroll $payroll, string $toStatus, string $action, User $actor, ?string $reason = null, array $context = []): Payroll
    {
        $allowed = [
            'draft' => ['generated', 'voided'],
            'generated' => ['approved', 'processed', 'reopened', 'voided'],
            'approved' => ['processed', 'reopened', 'voided'],
            'processed' => ['paid', 'reopened', 'voided'],
            'paid' => ['locked'],
            'locked' => [],
            'void' => [],
            'voided' => [],
            'reopened' => ['generated', 'voided'],
        ];

        if (! in_array($toStatus, $allowed[$payroll->status] ?? [], true)) {
            abort(422, "Cannot move payroll from {$payroll->status} to {$toStatus}.");
        }

        if (in_array($toStatus, ['void', 'voided', 'reopened'], true) && ! $reason) {
            abort(422, 'A reason is required.');
        }

        return DB::transaction(function () use ($payroll, $toStatus, $action, $actor, $reason, $context, $allowed) {
            $payroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);
            $from = $payroll->status;

            if (! in_array($toStatus, $allowed[$from] ?? [], true)) {
                abort(422, "Payroll changed while this action was running. Refresh and try again from {$from}.");
            }

            $autoProcessed = false;

            if ($toStatus === 'approved') {
                $this->assertHasPayslips($payroll);
                $payroll->update(['status' => 'approved', 'approved_by' => $actor->id, 'approved_at' => now()]);
                $payroll->payslips()->update(['status' => 'approved']);
                $this->lockAttendance($payroll, $actor);
                $this->log($payroll, $from, 'approved', $action, $reason, $actor);

                if ($this->settings($payroll->branch_id)->auto_post_journal_voucher) {
                    $this->process($payroll->fresh(), $actor);
                    $autoProcessed = true;
                    $this->log($payroll, 'approved', 'processed', 'auto_post', 'Automatically posted after approval.', $actor);
                }
            } elseif ($toStatus === 'processed') {
                $this->process($payroll, $actor);
            } elseif ($toStatus === 'paid') {
                $this->pay($payroll, $actor, $context);
            } elseif ($toStatus === 'locked') {
                $payroll->update(['status' => 'locked', 'locked_by' => $actor->id, 'locked_at' => now()]);
                $payroll->payslips()->update(['status' => 'locked']);
            } elseif ($toStatus === 'reopened') {
                if (in_array($from, ['paid', 'locked'], true)) {
                    abort(422, 'Paid or locked payroll must be reversed before reopening.');
                }
                $payroll->update(['status' => 'reopened', 'reopened_by' => $actor->id, 'reopened_at' => now(), 'void_reason' => $reason]);
                $payroll->payslips()->update(['status' => 'draft']);
                $this->unlockAttendance($payroll, $actor);
            } elseif (in_array($toStatus, ['void', 'voided'], true)) {
                if (in_array($from, ['paid', 'locked'], true) && ! $payroll->reversal_journal_voucher_id && ! $payroll->payment_reversal_journal_voucher_id) {
                    abort(422, 'Paid payroll must be reversed before voiding.');
                }
                $payroll->update(['status' => 'voided', 'voided_by' => $actor->id, 'voided_at' => now(), 'void_reason' => $reason]);
                $payroll->payslips()->update(['status' => 'voided']);
                $this->unlockAttendance($payroll, $actor);
            }

            if ($toStatus !== 'approved') {
                $this->log($payroll, $from, $toStatus, $action, $reason, $actor);
            }

            return $this->loadPayroll($autoProcessed ? $payroll->fresh() : $payroll);
        });
    }

    public function process(Payroll $payroll, User $actor): JournalVoucher
    {
        $this->assertReadyToProcess($payroll);
        if ($payroll->status === 'generated') {
            $this->lockAttendance($payroll, $actor);
        }
        $voucher = $this->generateAccrualJournalVoucher($payroll, $actor);

        $payroll->update([
            'status' => 'processed',
            'processed_by' => $actor->id,
            'processed_at' => now(),
            'journal_voucher_id' => $voucher->id,
        ]);
        $payroll->payslips()->update(['status' => 'processed', 'journal_voucher_id' => $voucher->id]);

        return $voucher;
    }

    public function generateJournalVoucher(Payroll $payroll, User $actor): JournalVoucher
    {
        return $this->generateAccrualJournalVoucher($payroll, $actor);
    }

    public function generateAccrualJournalVoucher(Payroll $payroll, User $actor): JournalVoucher
    {
        return DB::transaction(function () use ($payroll, $actor) {
            $payroll = Payroll::query()->with(['payslips.employee.payrollAccount', 'payslips.lines.component'])->lockForUpdate()->findOrFail($payroll->id);

            if ($payroll->journal_voucher_id) {
                return $payroll->journalVoucher;
            }

            $existingVoucher = JournalVoucher::query()
                ->where('source_type', Payroll::class)
                ->where('source_id', $payroll->id)
                ->first();

            if ($existingVoucher) {
                $payroll->update(['journal_voucher_id' => $existingVoucher->id]);
                $payroll->payslips()->update(['journal_voucher_id' => $existingVoucher->id]);

                return $existingVoucher->fresh('items.account');
            }

            $settings = $this->settings($payroll->branch_id);
            $canPostWithoutApproval = $payroll->status === 'generated' && ! $settings->require_approval_before_payment;
            if (! in_array($payroll->status, ['approved', 'processed'], true) && ! $canPostWithoutApproval) {
                abort(422, 'Journal voucher can only be generated after payroll approval.');
            }

            $this->syncPayrollEmployeeAccounts($payroll);
            $payroll = Payroll::query()->with(['payslips.employee.payrollAccount.chartOfAccounts', 'payslips.lines.component'])->lockForUpdate()->findOrFail($payroll->id);

            $errors = $this->validatePayrollReadiness($payroll, 'process');
            if ($errors) {
                throw ValidationException::withMessages(['readiness' => $errors]);
            }

            $this->assertPayrollAccountsReady($payroll);

            $items = [];

            $expenseByChartAccount = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'earning')
                ->filter(fn (PayslipLine $line) => (($line->meta['affects_net_salary'] ?? true) !== false))
                ->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id ?: $settings->salary_expense_account_id);

            foreach ($expenseByChartAccount as $chartAccountId => $lines) {
                $amount = $this->sumAmounts($lines->pluck('base_currency_amount'));
                if ($this->compareAmounts($amount, '0') <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId, $payroll->branch_id),
                    'description' => "Payroll expense {$payroll->payroll_number}",
                    'debit' => $this->formatAmount($amount),
                    'credit' => 0,
                ];
            }

            $employerExpenseByChartAccount = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'employer_contribution')
                ->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id ?: $settings->salary_expense_account_id);

            foreach ($employerExpenseByChartAccount as $chartAccountId => $lines) {
                $amount = $this->sumAmounts($lines->pluck('base_currency_amount'));
                if ($this->compareAmounts($amount, '0') <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId, $payroll->branch_id),
                    'description' => "Employer contribution expense {$payroll->payroll_number}",
                    'debit' => $this->formatAmount($amount),
                    'credit' => 0,
                ];
            }

            $taxTotal = $this->sumAmounts($payroll->payslips
                ->flatMap->lines
                ->where('source', 'tax')
                ->pluck('base_currency_amount'));

            if ($this->compareAmounts($taxTotal, '0') > 0) {
                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($settings->tax_payable_account_id, $payroll->branch_id),
                    'description' => "Payroll tax payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->formatAmount($taxTotal),
                ];
            }

            $benefitLines = $payroll->payslips
                ->flatMap->lines
                ->filter(fn (PayslipLine $line) => $line->source === 'benefit' || $line->type === 'employer_contribution');

            foreach ($benefitLines->groupBy(fn (PayslipLine $line) => $line->meta['payable_account_id'] ?? $line->component?->accounting_account_id ?? $settings->benefit_payable_account_id) as $chartAccountId => $lines) {
                $amount = $this->sumAmounts($lines->pluck('base_currency_amount'));
                if ($this->compareAmounts($amount, '0') <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId, $payroll->branch_id),
                    'description' => "Payroll benefits payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->formatAmount($amount),
                ];
            }

            $otherDeductions = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'deduction')
                ->filter(fn (PayslipLine $line) => (($line->meta['affects_net_salary'] ?? true) !== false))
                ->reject(fn (PayslipLine $line) => in_array($line->source, ['tax', 'benefit'], true));

            foreach ($otherDeductions->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id) as $chartAccountId => $lines) {
                $amount = $this->sumAmounts($lines->pluck('base_currency_amount'));
                if ($this->compareAmounts($amount, '0') <= 0) {
                    continue;
                }
                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId ?: null, $payroll->branch_id),
                    'description' => "{$lines->first()->name} payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->formatAmount($amount),
                ];
            }

            foreach ($payroll->payslips as $payslip) {
                $items[] = [
                    'account_id' => $payslip->employee->payrollAccount->id,
                    'description' => "Net salary payable - {$payslip->employee->display_name}",
                    'debit' => 0,
                    'credit' => $this->formatAmount($payslip->base_currency_amount),
                ];
            }

            $items = $this->balanceJournalItems($items);
            $totalDebit = $this->sumAmounts(collect($items)->pluck('debit'));

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $payroll->branch_id,
                'voucher_no' => 'JV-PAY-' . $payroll->payroll_number,
                'voucher_date' => $payroll->payrollPeriod->end_date->toDateString(),
                'fiscal_year_id' => $payroll->fiscal_year_id,
                'currency_id' => $payroll->currency_id,
                'exchange_rate' => $payroll->exchange_rate ?: 1,
                'reference' => $payroll->payroll_number,
                'narration' => "Payroll accrual journal voucher for {$payroll->payroll_number}",
                'source_type' => Payroll::class,
                'source_id' => $payroll->id,
                'source_no' => $payroll->payroll_number,
                'source_module' => 'payroll',
                'is_auto_generated' => true,
                'status' => 'posted',
                'active' => true,
                'approved' => true,
                'approved_at' => now(),
                'approved_by_id' => $actor->id,
                'total' => $this->formatAmount($totalDebit),
            ]);

            $voucher->items()->createMany($items);
            $payroll->update(['journal_voucher_id' => $voucher->id]);
            $payroll->payslips()->update(['journal_voucher_id' => $voucher->id]);
            $this->log($payroll, $payroll->status, $payroll->status, 'journal_voucher_created', $voucher->voucher_no, $actor);

            return $voucher->fresh('items.account');
        });
    }

    public function pay(Payroll $payroll, User $actor, array $context = []): JournalVoucher
    {
        $this->assertReadyToPay($payroll);

        return DB::transaction(function () use ($payroll, $actor, $context) {
            $payroll = Payroll::query()->with(['sourceAccount', 'payrollPeriod', 'payslips.employee.payrollAccount'])->lockForUpdate()->findOrFail($payroll->id);

            if ($payroll->payment_journal_voucher_id) {
                return $payroll->paymentJournalVoucher;
            }

            $settings = $this->settings($payroll->branch_id);
            $this->assertSourceAccountReady($payroll->sourceAccount, $payroll->branch_id);

            $items = $payroll->payslips->map(fn (Payslip $payslip) => [
                    'account_id' => $payslip->employee->payrollAccount->id,
                    'description' => "Salary payable cleared - {$payslip->employee->display_name}",
                    'debit' => $this->formatAmount($payslip->base_currency_amount),
                    'credit' => 0,
                ])->all();
            $items[] = $this->accountLine(
                $payroll->sourceAccount,
                "Payroll payment {$payroll->payroll_number}",
                0,
                $this->sumAmounts($payroll->payslips->pluck('base_currency_amount')),
                1,
                $payroll->branch_id,
            );

            $items = $this->balanceJournalItems($items);
            $totalDebit = $this->sumAmounts(collect($items)->pluck('debit'));

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $payroll->branch_id,
                'voucher_no' => 'JV-PAYMENT-' . $payroll->payroll_number,
                'voucher_date' => $context['payment_date'] ?? now()->toDateString(),
                'fiscal_year_id' => $payroll->fiscal_year_id,
                'currency_id' => $payroll->currency_id,
                'exchange_rate' => $payroll->exchange_rate ?: 1,
                'reference' => $payroll->payroll_number,
                'narration' => "Payroll payment journal voucher for {$payroll->payroll_number}",
                'source_type' => Payroll::class,
                'source_id' => $payroll->id,
                'source_no' => $payroll->payroll_number,
                'source_module' => 'payroll_payment',
                'is_auto_generated' => true,
                'status' => 'posted',
                'active' => true,
                'approved' => true,
                'approved_at' => now(),
                'approved_by_id' => $actor->id,
                'total' => $this->formatAmount($totalDebit),
            ]);

            $voucher->items()->createMany($items);
            $payroll->update([
                'status' => 'paid',
                'paid_by' => $actor->id,
                'paid_at' => now(),
                'payment_journal_voucher_id' => $voucher->id,
            ]);
            $payroll->payslips()->update(['status' => 'paid', 'payment_status' => 'PAID']);
            foreach ($payroll->payslips as $payslip) {
                PayrollPayment::query()->updateOrCreate(
                    ['idempotency_key' => "payroll-payment:{$payroll->id}:{$payslip->id}"],
                    [
                        'payroll_run_id' => $payroll->id,
                        'payroll_id' => $payroll->id,
                        'payslip_id' => $payslip->id,
                        'employee_id' => $payslip->employee_id,
                        'fiscal_year_id' => $payroll->fiscal_year_id,
                        'amount' => $payslip->net_payable,
                        'currency_id' => $payslip->currency_id,
                        'exchange_rate' => $payslip->exchange_rate,
                        'base_currency_amount' => $payslip->base_currency_amount,
                        'payment_method' => $payroll->sourceAccount->nature,
                        'payment_date' => $context['payment_date'] ?? now()->toDateString(),
                        'reference_number' => $context['payment_reference'] ?? $payslip->payment_reference,
                        'status' => 'paid',
                        'remarks' => "Paid through {$voucher->voucher_no}",
                    ],
                );
            }
            $this->log($payroll, 'processed', 'paid', 'payment_journal_voucher_created', $voucher->voucher_no, $actor);

            return $voucher->fresh('items.account');
        });
    }

    public function reverse(Payroll $payroll, User $actor, string $reason): Payroll
    {
        if (! $reason) {
            abort(422, 'Reversal reason is required.');
        }

        return DB::transaction(function () use ($payroll, $actor, $reason) {
            $payroll = Payroll::query()
                ->with(['journalVoucher.items', 'paymentJournalVoucher.items'])
                ->lockForUpdate()
                ->findOrFail($payroll->id);

            if (! in_array($payroll->status, ['processed', 'paid', 'locked'], true)) {
                abort(422, 'Only processed, paid, or locked payroll can be reversed.');
            }

            if ($payroll->journal_voucher_id && ! $payroll->reversal_journal_voucher_id) {
                $reversal = $this->reverseVoucher($payroll->journalVoucher, $payroll, $actor, $reason, 'payroll_reversal');
                $payroll->update(['reversal_journal_voucher_id' => $reversal->id]);
            }

            if ($payroll->payment_journal_voucher_id && ! $payroll->payment_reversal_journal_voucher_id) {
                $paymentReversal = $this->reverseVoucher($payroll->paymentJournalVoucher, $payroll, $actor, $reason, 'payroll_payment_reversal');
                $payroll->update(['payment_reversal_journal_voucher_id' => $paymentReversal->id]);
                PayrollPayment::query()->where('payroll_id', $payroll->id)->update([
                    'status' => 'reversed',
                    'remarks' => $reason,
                ]);
            }

            $from = $payroll->status;
            $payroll->update([
                'status' => 'reopened',
                'reopened_by' => $actor->id,
                'reopened_at' => now(),
                'void_reason' => $reason,
            ]);
            $payroll->payslips()->update(['status' => 'draft', 'payment_status' => 'UNPAID']);
            $this->unlockAttendance($payroll, $actor);
            $this->log($payroll, $from, 'reopened', 'payroll.reversed', $reason, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    protected function reverseVoucher(?JournalVoucher $voucher, Payroll $payroll, User $actor, string $reason, string $module): JournalVoucher
    {
        if (! $voucher) {
            abort(422, 'Original journal voucher was not found.');
        }

        $reversal = JournalVoucher::query()->create([
            'branch_id' => $voucher->branch_id,
            'voucher_no' => 'REV-' . $voucher->voucher_no,
            'voucher_date' => now()->toDateString(),
            'currency_id' => $voucher->currency_id,
            'exchange_rate' => $voucher->exchange_rate ?: 1,
            'reference' => $payroll->payroll_number,
            'narration' => "Reversal for {$voucher->voucher_no}: {$reason}",
            'source_type' => Payroll::class,
            'source_id' => $payroll->id,
            'source_no' => $payroll->payroll_number,
            'source_module' => $module,
            'is_auto_generated' => true,
            'is_system_generated' => true,
            'reversed_journal_voucher_id' => $voucher->id,
            'reversal_reason' => $reason,
            'reversed_at' => now(),
            'status' => 'posted',
            'active' => true,
            'approved' => true,
            'approved_at' => now(),
            'approved_by_id' => $actor->id,
            'total' => $voucher->total,
        ]);

        $reversal->items()->createMany($voucher->items->map(fn ($line) => [
            'account_id' => $line->account_id,
            'chart_of_account_id' => $line->chart_of_account_id,
            'description' => 'Reversal: ' . $line->description,
            'debit' => $line->credit,
            'credit' => $line->debit,
            'foreign_debit' => $line->foreign_credit,
            'foreign_credit' => $line->foreign_debit,
            'currency_id' => $line->currency_id,
            'exchange_rate' => $line->exchange_rate,
        ])->all());

        return $reversal->fresh('items');
    }

    public function recalculatePayslip(Payslip $payslip): void
    {
        $payslip = $payslip->fresh(['lines', 'payroll']);
        $precision = (int) $this->settings($payslip->payroll?->branch_id ?: $payslip->branch_id)->currency_precision;
        $netLines = $payslip->lines->filter(fn (PayslipLine $line) => (($line->meta['affects_net_salary'] ?? true) !== false));
        $earnings = $this->sumAmounts($netLines->where('type', 'earning')->pluck('amount'));
        $deductions = $this->sumAmounts($netLines->where('type', 'deduction')->pluck('amount'));
        $employer = $this->sumAmounts($netLines->where('type', 'employer_contribution')->pluck('amount'));
        $net = $this->subtractAmounts($earnings, $deductions);

        if ($this->compareAmounts($net, '0') < 0) {
            abort(422, 'Payslip net payable cannot be negative.');
        }

        $payslip->update([
            'gross_earnings' => $this->formatAmount($earnings, $precision),
            'salary_payable' => $this->formatAmount($earnings, $precision),
            'total_deductions' => $this->formatAmount($deductions, $precision),
            'deduction' => $this->formatAmount($deductions, $precision),
            'employer_contributions' => $this->formatAmount($employer, $precision),
            'net_payable' => $this->formatAmount($net, $precision),
            'total_payable' => $this->formatAmount($net, $precision),
            'base_currency_amount' => $this->baseAmount($net, $payslip->exchange_rate),
        ]);
    }

    public function recalculatePayroll(Payroll $payroll): void
    {
        $precision = (int) $this->settings($payroll->branch_id)->currency_precision;
        $payroll->payslips()->with('lines')->get()->each(fn (Payslip $payslip) => $this->recalculatePayslip($payslip));

        $payroll->refresh();
        $payslips = $payroll->payslips()->get([
            'gross_earnings',
            'total_deductions',
            'net_payable',
            'base_currency_amount',
        ]);
        $totalEarnings = $this->sumAmounts($payslips->pluck('gross_earnings'));
        $totalDeductions = $this->sumAmounts($payslips->pluck('total_deductions'));
        $totalNet = $this->sumAmounts($payslips->pluck('net_payable'));
        $totalBase = $this->sumAmounts($payslips->pluck('base_currency_amount'));
        $payroll->update([
            'total_employees' => $payslips->count(),
            'total_earnings' => $this->formatAmount($totalEarnings, $precision),
            'total_gross' => $this->formatAmount($totalEarnings, $precision),
            'total_deductions' => $this->formatAmount($totalDeductions, $precision),
            'total_net_payable' => $this->formatAmount($totalNet, $precision),
            'total_base_currency_amount' => $this->formatAmount($totalBase, $precision),
        ]);
    }

    protected function prepareEmployeeCalculation(User $employee, PayrollPeriod $period, PayrollSetting $settings, bool $strictAttendanceLock = false, array $options = []): array
    {
        $attendanceResult = $this->ensureEmployeePayrollPrerequisites($employee, $period, $settings);
        $employee->loadMissing('payrollAccount.chartOfAccounts');

        $reasons = [];
        $warnings = $attendanceResult['warnings'] ?? [];

        if (! $employee->active) {
            $reasons[] = 'inactive employee';
        }

        if (! $employee->branch_id && ! $period->branch_id) {
            $reasons[] = 'missing branch';
        }

        if (! $this->accountSync->shouldSyncPayrollAccount($employee)) {
            $reasons[] = 'not marked as an employee';
        } elseif (! $employee->payrollAccount || ! $employee->payrollAccount->active || $employee->payrollAccount->chartOfAccounts->isEmpty()) {
            $reasons[] = 'missing payroll account';
        }

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
            $reasons[] = 'missing active salary structure';
        }

        $attendance = AttendanceSummary::query()
            ->where('employee_id', $employee->id)
            ->where('payroll_period_id', $period->id)
            ->first();

        if (! $attendance) {
            $reasons[] = 'missing attendance summary';
        } elseif ($strictAttendanceLock && ! $attendance->locked) {
            $reasons[] = 'attendance summary is not locked';
        } elseif (($attendanceResult['attendance_complete'] ?? true) === false && ! ($options['allow_incomplete_attendance'] ?? false)) {
            $reasons[] = 'attendance is incomplete; review missing days before payroll';
        } elseif ((float) $attendance->payable_days <= 0) {
            $reasons[] = 'no payable days';
        }

        $currencyId = $structure?->currency_id ?: $settings->currency_id;
        $expectedCurrencyId = $options['currency_id'] ?? $settings->currency_id;
        $exchangeRate = (float) ($options['exchange_rate'] ?? ($structure?->exchange_rate ?: 1));
        if (! $currencyId) {
            $reasons[] = 'invalid currency';
        } elseif ($expectedCurrencyId && (string) $currencyId !== (string) $expectedCurrencyId) {
            $reasons[] = 'salary structure currency does not match this payroll run';
        }
        if ($exchangeRate <= 0) {
            $reasons[] = 'invalid exchange rate';
        }

        $additions = collect();
        $deductions = collect();
        $reimbursements = collect();
        $calculation = null;

        if (! $reasons && $structure && $attendance) {
            $structure->setAttribute('exchange_rate', $exchangeRate);
            $additions = $this->employeeAdditions($employee, $period);
            $deductions = $this->employeeDeductions($employee, $period);
            $reimbursements = $this->employeeReimbursements($employee);
            $calculation = $this->calculator->calculate($employee, $structure, $attendance, $settings, $additions, $deductions, $reimbursements, $period);
        }

        return compact('reasons', 'warnings', 'structure', 'attendance', 'additions', 'deductions', 'reimbursements', 'calculation');
    }

    protected function ensureEmployeePayrollPrerequisites(User $employee, PayrollPeriod $period, PayrollSetting $settings): array
    {
        if (! $employee->active || ! $this->accountSync->shouldSyncPayrollAccount($employee)) {
            return [];
        }

        if (! $employee->payrollAccount || ! $employee->payrollAccount->active || $employee->payrollAccount->chartOfAccounts->isEmpty()) {
            $this->accountSync->syncEmployeePayrollAccount($employee);
            $employee->refresh();
        }

        $this->ensureSalaryStructure($employee, $period, $settings);
        return $this->ensureAttendanceSummary($employee, $period, $settings);
    }

    protected function ensureSalaryStructure(User $employee, PayrollPeriod $period, PayrollSetting $settings): void
    {
        $exists = SalaryStructure::query()
            ->where('employee_id', $employee->id)
            ->where('active', true)
            ->whereDate('effective_from', '<=', $period->end_date)
            ->where(fn ($query) => $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date))
            ->exists();

        if ($exists) {
            return;
        }

        $salary = $this->employeeBaseSalary($employee, $period);
        if ($salary <= 0) {
            return;
        }

        SalaryStructure::query()->create([
            'employee_id' => $employee->id,
            'branch_id' => $employee->branch_id ?: $period->branch_id,
            'effective_from' => $period->start_date,
            'basic_salary' => number_format($salary, 2, '.', ''),
            'gross_salary' => number_format($salary, 2, '.', ''),
            'currency_id' => $settings->currency_id,
            'exchange_rate' => 1,
            'active' => true,
            'remarks' => 'Auto-created from HR salary record during payroll generation.',
        ]);
    }

    protected function ensureAttendanceSummary(User $employee, PayrollPeriod $period, PayrollSetting $settings): array
    {
        $existing = AttendanceSummary::query()
            ->where('employee_id', $employee->id)
            ->where('payroll_period_id', $period->id)
            ->first();

        if ($existing?->locked) {
            return ['summary' => $existing, 'warnings' => [], 'attendance_complete' => true, 'missing_working_dates' => []];
        }

        if ($existing && $this->attendanceSummaryIsComplete($existing)) {
            return ['summary' => $existing, 'warnings' => [], 'attendance_complete' => true, 'missing_working_dates' => []];
        }

        $employee->loadMissing('shift', 'weeklyHoliday');
        return $this->attendanceSummaryService->calculate($employee, $period, $settings, true);
    }

    protected function attendanceSummaryIsComplete(AttendanceSummary $summary): bool
    {
        $accountedDays = (float) $summary->present_days
            + (float) $summary->paid_leave_days
            + (float) $summary->unpaid_leave_days;

        return (float) $summary->total_working_days > 0
            && abs($accountedDays - (float) $summary->total_working_days) <= 0.01
            && ((float) $summary->present_days + (float) $summary->paid_leave_days) > 0
            && (float) $summary->payable_days >= 0;
    }

    protected function employeeBaseSalary(User $employee, PayrollPeriod $period): float
    {
        $historySalary = SalaryHistory::query()
            ->where('user_id', $employee->id)
            ->where('active', true)
            ->whereDate('start_date', '<=', $period->end_date)
            ->where(fn ($query) => $query->whereNull('end_date')->orWhereDate('end_date', '>=', $period->start_date))
            ->latest('start_date')
            ->value('salary');

        if ((float) $historySalary > 0) {
            return (float) $historySalary;
        }

        $profileSalary = $employee->employeeProfile()->value('salary');

        return (float) ($profileSalary ?: 0);
    }

    public function validatePayrollReadiness(Payroll $payroll, string $stage): array
    {
        $settings = $this->settings($payroll->branch_id);
        $errors = $this->validatePayrollSettings($settings, $stage);

        if ($stage === 'process') {
            $payroll->loadMissing('payslips.employee.payrollAccount.chartOfAccounts', 'payslips.lines.component');

            foreach ($payroll->payslips as $payslip) {
                $employee = $payslip->employee;
                $hasScopedChart = $employee?->payrollAccount?->chartOfAccounts
                    ?->contains(fn (ChartOfAccount $chart) => $chart->active && (! $payroll->branch_id || ! $chart->branch_id || $chart->branch_id === $payroll->branch_id));
                if (! $employee?->payrollAccount || ! $employee->payrollAccount->active || ! $hasScopedChart) {
                    $errors[] = ($employee?->display_name ?: "Employee #{$payslip->employee_id}") . ' is missing an active payroll payable account.';
                }
            }

            if ($payroll->payslips->flatMap->lines->where('source', 'tax')->sum('amount') > 0 && ! $settings->tax_payable_account_id) {
                $errors[] = 'Tax payable account is required because this payroll has tax deductions.';
            }

            $unmappedDeductions = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'deduction')
                ->reject(fn (PayslipLine $line) => in_array($line->source, ['tax', 'benefit'], true))
                ->filter(fn (PayslipLine $line) => ! $line->component?->accounting_account_id)
                ->pluck('name')
                ->unique()
                ->values();
            if ($unmappedDeductions->isNotEmpty()) {
                $errors[] = 'Assign a payable Chart of Account to these deduction components: '.$unmappedDeductions->implode(', ').'.';
            }

            $benefitLinesMissingPayable = $payroll->payslips
                ->flatMap->lines
                ->filter(fn (PayslipLine $line) => $line->source === 'benefit' || $line->type === 'employer_contribution')
                ->filter(fn (PayslipLine $line) => ! ($line->meta['payable_account_id'] ?? $line->component?->accounting_account_id ?? $settings->benefit_payable_account_id))
                ->isNotEmpty();

            if ($benefitLinesMissingPayable) {
                $errors[] = 'Benefit payable account is required because this payroll has benefits or employer contributions.';
            }
        }

        if ($stage === 'pay') {
            if (! $payroll->source_account_id) {
                $errors[] = 'Payment From Account is required before payment.';
            } else {
                try {
                    $this->assertSourceAccountReady(Account::query()->with('chartOfAccounts')->find($payroll->source_account_id), $payroll->branch_id);
                } catch (\Throwable $e) {
                    $errors[] = $e->getMessage();
                }
            }
        }

        return array_values(array_unique(array_filter($errors)));
    }

    protected function validatePayrollSettings(PayrollSetting $settings, string $stage): array
    {
        $errors = [];

        if (! $settings->currency_id) {
            $errors[] = 'Payroll currency is not configured.';
        }
        if (! in_array($settings->rounding_method, ['nearest', 'floor', 'ceil'], true)) {
            $errors[] = 'Payroll rounding method is invalid.';
        }
        if ($settings->currency_precision < 0 || $settings->currency_precision > 6) {
            $errors[] = 'Payroll currency precision must be between 0 and 6.';
        }
        if (! in_array($settings->daily_rate_basis, ['working_days', 'calendar_days', 'fixed_days'], true)) {
            $errors[] = 'Payroll daily rate basis is invalid.';
        }
        if ((float) $settings->default_overtime_rate < 0) {
            $errors[] = 'Default overtime rate cannot be negative.';
        }
        if ((float) $settings->late_deduction_per_day < 0) {
            $errors[] = 'Late deduction per day cannot be negative.';
        }
        if ($settings->daily_rate_basis === 'fixed_days' && (int) $settings->default_monthly_working_days < 1) {
            $errors[] = 'Fixed daily-rate basis requires at least one monthly working day.';
        }

        if (in_array($stage, ['process', 'process_preview'], true)) {
            foreach ([
                'salary_expense_account_id' => 'Salary expense account is not configured.',
            ] as $field => $message) {
                if (! $settings->{$field}) {
                    $errors[] = $message;
                    continue;
                }

                if (! ChartOfAccount::query()
                    ->whereKey($settings->{$field})
                    ->where('active', true)
                    ->when($settings->branch_id, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $settings->branch_id)))
                    ->exists()) {
                    $errors[] = str_replace('not configured', 'not active', $message);
                }
            }
        }

        return $errors;
    }

    protected function lockAttendance(Payroll $payroll, User $actor): void
    {
        $payroll->loadMissing('payrollPeriod', 'payslips');

        AttendanceSummary::query()
            ->where('payroll_period_id', $payroll->payroll_period_id)
            ->whereIn('employee_id', $payroll->payslips->pluck('employee_id')->filter()->all())
            ->update(['locked' => true]);

        $this->log($payroll, $payroll->status, $payroll->status, 'attendance_locked', null, $actor);
    }

    protected function unlockAttendance(Payroll $payroll, User $actor): void
    {
        $payroll->loadMissing('payslips');

        AttendanceSummary::query()
            ->where('payroll_period_id', $payroll->payroll_period_id)
            ->whereIn('employee_id', $payroll->payslips->pluck('employee_id')->filter()->all())
            ->update(['locked' => false]);

        $this->log($payroll, $payroll->status, $payroll->status, 'attendance_unlocked', null, $actor);
    }

    protected function applyPayrollAdjustmentToPayslips(Payroll $payroll, Model $adjustment, string $kind): void
    {
        $employeeIds = $adjustment->applicability_type === 'selected_employees'
            ? collect($adjustment->selected_employee_ids)->map(fn ($id) => (int) $id)->all()
            : null;

        $payroll->payslips()
            ->when($employeeIds, fn ($query) => $query->whereIn('employee_id', $employeeIds))
            ->get()
            ->each(function (Payslip $payslip) use ($adjustment, $kind) {
                $base = (float) $payslip->gross_earnings;
                $amount = $adjustment->calculation_type === 'percentage'
                    ? $base * ((float) $adjustment->amount / 100)
                    : (float) $adjustment->amount;

                $payslip->lines()->create([
                    'component_id' => $adjustment->component_id,
                    'type' => $kind === 'addition' ? 'earning' : 'deduction',
                    'name' => $adjustment->name,
                    'amount' => number_format($amount, (int) $this->settings($payslip->branch_id)->currency_precision, '.', ''),
                    'base_currency_amount' => $this->baseAmount($amount, $payslip->exchange_rate),
                    'calculation_type' => $adjustment->calculation_type,
                    'source' => $kind === 'addition' ? 'payroll_addition' : 'payroll_deduction',
                    'meta' => [
                        'affects_net_salary' => $adjustment->component_id
                            ? (bool) SalaryComponent::query()->whereKey($adjustment->component_id)->value('affects_net_salary')
                            : true,
                    ],
                    'remarks' => trim(($adjustment->remarks ? $adjustment->remarks . ' ' : '') . "Adjustment:{$adjustment->id}"),
                ]);
            });
    }

    protected function assertSelectedEmployeesBelongToPayroll(Payroll $payroll, array $data): void
    {
        if (($data['applicability_type'] ?? null) !== 'selected_employees') {
            return;
        }

        $ids = array_values($data['selected_employee_ids'] ?? []);
        if (! $ids) {
            abort(422, 'Select at least one employee.');
        }

        $count = $payroll->payslips()->whereIn('employee_id', $ids)->distinct('employee_id')->count('employee_id');
        if ($count !== count(array_unique($ids))) {
            abort(422, 'Selected employees must belong to this payroll.');
        }
    }

    protected function assertReadyToProcess(Payroll $payroll): void
    {
        $settings = $this->settings($payroll->branch_id);
        $canProcessWithoutApproval = $payroll->status === 'generated' && ! $settings->require_approval_before_payment;
        if ($payroll->status !== 'approved' && ! $canProcessWithoutApproval) {
            abort(422, 'Approve payroll before processing, or disable the approval requirement in payroll settings.');
        }

        $this->assertHasPayslips($payroll);

        $this->syncPayrollEmployeeAccounts($payroll);

        $payroll->load('payslips.employee.payrollAccount.chartOfAccounts');
        $this->assertPayrollAccountsReady($payroll);

        $errors = $this->validatePayrollReadiness($payroll, 'process');
        if ($errors) {
            throw ValidationException::withMessages(['readiness' => $errors]);
        }
    }

    protected function assertReadyToPay(Payroll $payroll): void
    {
        if ($payroll->status !== 'processed' || ! $payroll->journal_voucher_id) {
            abort(422, 'Payroll must be processed and posted before payment.');
        }

        $errors = $this->validatePayrollReadiness($payroll, 'pay');
        if ($errors) {
            throw ValidationException::withMessages(['readiness' => $errors]);
        }
    }

    protected function assertHasPayslips(Payroll $payroll): void
    {
        if ($payroll->payslips()->count() === 0) {
            abort(422, 'Cannot process payroll with zero payslips.');
        }
    }

    protected function assertEditable(?Payroll $payroll): void
    {
        if (! $payroll || ! $this->isEditable($payroll)) {
            abort(422, 'Cannot edit approved, processed, paid, locked, or voided payroll unless it is reopened.');
        }
    }

    protected function isEditable(Payroll $payroll): bool
    {
        return in_array($payroll->status, ['draft', 'previewed', 'generated', 'reopened'], true);
    }

    protected function accountLine(Account $account, string $description, float|string $debit, float|string $credit, float|string|null $exchangeRate = 1, ?string $branchId = null): array
    {
        $chart = ChartOfAccount::query()
            ->where('account_id', $account->id)
            ->where('active', true)
            ->when($branchId, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $branchId)))
            ->first();

        if (! $chart) {
            abort(422, "Account {$account->name} must be linked to a chart account before journal posting.");
        }

        return [
            'account_id' => $account->id,
            'description' => $description,
            'debit' => $this->baseAmount($debit, $exchangeRate),
            'credit' => $this->baseAmount($credit, $exchangeRate),
        ];
    }

    protected function resolvePostingAccountId(?string $accountOrChartId, ?string $branchId = null): string
    {
        if ($accountOrChartId && Account::query()->whereKey($accountOrChartId)->where('active', true)->exists()) {
            $hasScopedChart = ChartOfAccount::query()
                ->where('account_id', $accountOrChartId)
                ->where('active', true)
                ->when($branchId, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $branchId)))
                ->exists();
            if ($hasScopedChart) {
                return $accountOrChartId;
            }
        }

        if ($accountOrChartId) {
            $accountId = ChartOfAccount::query()
                ->whereKey($accountOrChartId)
                ->where('active', true)
                ->when($branchId, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $branchId)))
                ->value('account_id');

            if ($accountId) {
                return $accountId;
            }
        }

        abort(422, 'Payroll journal line posting account is required.');
    }

    protected function syncPayrollEmployeeAccounts(Payroll $payroll): void
    {
        $payroll->loadMissing('payslips.employee.payrollAccount.chartOfAccounts');

        foreach ($payroll->payslips as $payslip) {
            if ($payslip->employee) {
                $this->accountSync->syncEmployeePayrollAccount($payslip->employee);
            }
        }
    }

    protected function assertSourceAccountReady(?Account $source, ?string $branchId = null): void
    {
        if (! $source) {
            abort(422, 'Payment From Account is required before payroll journal posting.');
        }

        if (! $source->active || ! in_array($source->nature, ['cash', 'bank'], true)) {
            abort(422, 'Payment From Account must be an active cash or bank account.');
        }

        if (! ChartOfAccount::query()
            ->where('account_id', $source->id)
            ->where('active', true)
            ->when($branchId, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('branch_id')->orWhere('branch_id', $branchId)))
            ->exists()) {
            abort(422, 'Payment From Account must be linked to a Chart of Account.');
        }
    }

    protected function assertPayrollAccountsReady(Payroll $payroll): void
    {
        $missing = [];

        foreach ($payroll->payslips as $payslip) {
            $employee = $payslip->employee;
            $account = $employee?->payrollAccount;

            $hasScopedChart = $account?->chartOfAccounts
                ?->contains(fn (ChartOfAccount $chart) => $chart->active && (! $payroll->branch_id || ! $chart->branch_id || $chart->branch_id === $payroll->branch_id));
            if (! $employee || ! $account || ! $account->active || ! $hasScopedChart) {
                $missing[] = $employee?->display_name ?: "Employee #{$payslip->employee_id}";
            }
        }

        if ($missing) {
            abort(422, 'Payroll account sync failed for: ' . implode(', ', $missing));
        }
    }

    protected function balanceJournalItems(array $items): array
    {
        $totalDebit = $this->sumAmounts(collect($items)->pluck('debit'));
        $totalCredit = $this->sumAmounts(collect($items)->pluck('credit'));
        $difference = $this->subtractAmounts($totalDebit, $totalCredit);
        $absoluteDifference = ltrim($difference, '-');

        if ($this->compareAmounts($absoluteDifference, '0.000001') <= 0 && $this->compareAmounts($absoluteDifference, '0') > 0) {
            $index = collect($items)
                ->keys()
                ->sortByDesc(fn ($key) => max((float) $items[$key]['debit'], (float) $items[$key]['credit']))
                ->first();

            if ((float) $items[$index]['debit'] > 0) {
                $items[$index]['debit'] = $this->subtractAmounts((string) $items[$index]['debit'], $difference);
            } else {
                $items[$index]['credit'] = $this->addAmounts((string) $items[$index]['credit'], $difference);
            }

            return $items;
        }

        if ($this->compareAmounts($absoluteDifference, '0.000001') > 0) {
            abort(422, "Payroll journal voucher is not balanced. Debit {$totalDebit}, credit {$totalCredit}.");
        }

        return $items;
    }

    protected function settings(?string $branchId): PayrollSetting
    {
        $settings = PayrollSetting::query()
            ->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)->orWhereNull('branch_id');
            })
            ->orderByRaw('branch_id is null')
            ->firstOrCreate(
                ['branch_id' => $branchId],
                [
                    'currency_id' => $this->defaultPayrollCurrencyId(),
                    'daily_rate_basis' => 'working_days',
                    'rounding_method' => 'nearest',
                    'currency_precision' => 2,
                ]
            );

        if (! $settings->currency_id && $currencyId = $this->defaultPayrollCurrencyId()) {
            $settings->forceFill([
                'currency_id' => $currencyId,
                'currency_precision' => $settings->currency_precision ?? $this->currencyPrecision($currencyId),
            ])->save();
        }

        return $settings->refresh();
    }

    protected function defaultPayrollCurrencyId(): ?string
    {
        return Currency::query()
            ->where('active', true)
            ->where('is_base', true)
            ->value('id')
            ?: Currency::query()
                ->where('active', true)
                ->orderBy('code')
                ->value('id')
            ?: Currency::query()
                ->orderBy('code')
                ->value('id');
    }

    protected function currencyPrecision(?string $currencyId): int
    {
        return (int) (Currency::query()->whereKey($currencyId)->value('decimal_places') ?? 2);
    }

    protected function employeeAdditions(User $employee, PayrollPeriod $period): Collection
    {
        return EmployeeAddition::query()
            ->with('component')
            ->where('employee_id', $employee->id)
            ->where('active', true)
            ->whereDate('effective_from', '<=', $period->end_date)
            ->where(fn ($query) => $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date))
            ->where(fn ($query) => $query->where('recurring', true)->orWhereNull('consumed_payslip_id'))
            ->get();
    }

    protected function employeeDeductions(User $employee, PayrollPeriod $period): Collection
    {
        return EmployeeDeduction::query()
            ->with('component')
            ->where('employee_id', $employee->id)
            ->where('active', true)
            ->whereDate('effective_from', '<=', $period->end_date)
            ->where(fn ($query) => $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $period->start_date))
            ->where(fn ($query) => $query->where('recurring', true)->orWhereNull('consumed_payslip_id'))
            ->get();
    }

    protected function employeeReimbursements(User $employee): Collection
    {
        return EmployeeReimbursement::query()
            ->where('employee_id', $employee->id)
            ->where('status', 'approved')
            ->where('include_in_payroll', true)
            ->whereNull('payslip_id')
            ->get();
    }

    protected function payrollNumber(PayrollPeriod $period): string
    {
        return 'PAY-' . $period->year . str_pad((string) $period->month, 2, '0', STR_PAD_LEFT) . '-' . Str::upper(Str::random(5));
    }

    protected function payslipNumber(PayrollPeriod $period, User $employee): string
    {
        return 'PS-' . $period->year . str_pad((string) $period->month, 2, '0', STR_PAD_LEFT) . '-' . $employee->id;
    }

    protected function baseAmount(float|string $amount, float|string|null $exchangeRate): string
    {
        $rate = (string) ($exchangeRate ?: 1);
        $base = function_exists('bcmul')
            ? bcmul((string) $amount, $rate, 6)
            : ((float) $amount * (float) $rate);

        return $this->formatAmount($base);
    }

    protected function formatAmount(float|string $amount, int $precision = 6): string
    {
        return number_format((float) $amount, $precision, '.', '');
    }

    protected function sumAmounts(iterable $amounts): string
    {
        $total = '0.000000';

        foreach ($amounts as $amount) {
            $total = $this->addAmounts($total, (string) ($amount ?: 0));
        }

        return $total;
    }

    protected function addAmounts(string $left, string $right): string
    {
        return function_exists('bcadd')
            ? bcadd($left, $right, 6)
            : number_format((float) $left + (float) $right, 6, '.', '');
    }

    protected function subtractAmounts(string $left, string $right): string
    {
        return function_exists('bcsub')
            ? bcsub($left, $right, 6)
            : number_format((float) $left - (float) $right, 6, '.', '');
    }

    protected function compareAmounts(string $left, string $right): int
    {
        return function_exists('bccomp')
            ? bccomp($left, $right, 6)
            : ((float) $left <=> (float) $right);
    }

    protected function fiscalYearForDate(mixed $date): ?FiscalYear
    {
        return FiscalYear::query()
            ->where('active', true)
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->first();
    }

    protected function loadPayroll(Payroll $payroll): Payroll
    {
        return $payroll->fresh([
            'payrollPeriod',
            'branch',
            'currency',
            'sourceAccount',
            'journalVoucher',
            'paymentJournalVoucher',
            'reversalJournalVoucher',
            'paymentReversalJournalVoucher',
            'additions.component',
            'deductions.component',
            'payslips.employee.payrollAccount.chartOfAccounts',
            'payslips.lines.component',
        ]);
    }

    protected function log(Payroll $payroll, ?string $from, string $to, string $action, ?string $reason, User $actor): void
    {
        ApprovalLog::query()->create([
            'approvable_type' => Payroll::class,
            'approvable_id' => $payroll->id,
            'from_status' => $from,
            'to_status' => $to,
            'action' => $action,
            'reason' => $reason,
            'user_id' => $actor->id,
        ]);
    }
}
