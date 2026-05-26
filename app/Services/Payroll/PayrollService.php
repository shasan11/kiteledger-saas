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
use App\Models\JournalVoucher;
use App\Models\Payroll;
use App\Models\PayrollAddition;
use App\Models\PayrollDeduction;
use App\Models\PayrollPeriod;
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
        private readonly PayrollAccountSyncService $accountSync
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
            $prepared = $this->prepareEmployeeCalculation($employee, $period, $settings, $strictAttendanceLock);

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
                'gross_earnings' => (float) $calculation['gross_earnings'],
                'total_deductions' => (float) $calculation['total_deductions'],
                'employer_contributions' => (float) $calculation['employer_contributions'],
                'net_payable' => (float) $calculation['net_payable'],
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
            'totals' => array_map(fn ($amount) => round($amount, 2), $totals),
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
                'currency_id' => $options['currency_id'] ?? $settings->currency_id,
                'exchange_rate' => $options['exchange_rate'] ?? 1,
                'source_account_id' => $options['source_account_id'] ?? null,
                'idempotency_key' => $idempotencyKey,
                'preview_snapshot' => $preview,
            ]);

            if (isset($payroll) && $payroll->exists) {
                $payroll->forceFill(['preview_snapshot' => $preview])->save();
            }

            $employees = User::query()
                ->with(['department', 'branch', 'payrollAccount.chartOfAccounts'])
                ->whereIn('id', collect($preview['eligible_employees'])->pluck('employee_id')->all())
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
                ->get();

            foreach ($employees as $employee) {
                $prepared = $this->prepareEmployeeCalculation($employee, $period, $settings, false);
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
                    'currency_id' => $structure->currency_id ?: $payroll->currency_id ?: $settings->currency_id,
                    'exchange_rate' => $structure->exchange_rate ?: $payroll->exchange_rate ?: 1,
                    'base_currency_amount' => $calculation['base_currency_amount'],
                    'calculation_snapshot' => $calculation['snapshot'] ?? $calculation,
                    'payable_days' => $calculation['payable_days'],
                    'total_working_days' => $calculation['total_working_days'],
                    'unpaid_leave_days' => $calculation['unpaid_leave_days'],
                    'overtime_hours' => $calculation['overtime_hours'],
                    'remarks' => null,
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

    public function transition(Payroll $payroll, string $toStatus, string $action, User $actor, ?string $reason = null): Payroll
    {
        $allowed = [
            'generated' => ['approved', 'void'],
            'approved' => ['processed', 'void'],
            'processed' => ['paid', 'void'],
            'paid' => ['locked'],
            'locked' => [],
            'void' => [],
        ];

        if (! in_array($toStatus, $allowed[$payroll->status] ?? [], true)) {
            abort(422, "Cannot move payroll from {$payroll->status} to {$toStatus}.");
        }

        if ($toStatus === 'void' && ! $reason) {
            abort(422, 'Void reason is required.');
        }

        return DB::transaction(function () use ($payroll, $toStatus, $action, $actor, $reason) {
            $payroll = Payroll::query()->lockForUpdate()->findOrFail($payroll->id);
            $from = $payroll->status;

            if ($toStatus === 'approved') {
                $this->assertHasPayslips($payroll);
                $payroll->update(['status' => 'approved', 'approved_by' => $actor->id, 'approved_at' => now()]);
                $payroll->payslips()->update(['status' => 'approved']);
                $this->lockAttendance($payroll, $actor);
            } elseif ($toStatus === 'processed') {
                $this->process($payroll, $actor);
            } elseif ($toStatus === 'paid') {
                $this->pay($payroll, $actor);
            } elseif ($toStatus === 'locked') {
                $payroll->update(['status' => 'locked', 'locked_by' => $actor->id, 'locked_at' => now()]);
                $payroll->payslips()->update(['status' => 'locked']);
            } elseif ($toStatus === 'void') {
                if (in_array($from, ['processed', 'paid', 'locked'], true)) {
                    abort(422, 'Processed or paid payroll cannot be voided until reversal posting is implemented.');
                }
                $payroll->update(['status' => 'void', 'voided_by' => $actor->id, 'voided_at' => now(), 'void_reason' => $reason]);
                $payroll->payslips()->update(['status' => 'void']);
                $this->unlockAttendance($payroll, $actor);
            }

            $this->log($payroll, $from, $toStatus, $action, $reason, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    public function process(Payroll $payroll, User $actor): JournalVoucher
    {
        $this->assertReadyToProcess($payroll);
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

            if (! in_array($payroll->status, ['approved', 'processed'], true)) {
                abort(422, 'Journal voucher can only be generated for an approved payroll.');
            }

            $this->syncPayrollEmployeeAccounts($payroll);
            $payroll = Payroll::query()->with(['payslips.employee.payrollAccount.chartOfAccounts', 'payslips.lines.component'])->lockForUpdate()->findOrFail($payroll->id);

            $settings = $this->settings($payroll->branch_id);
            $errors = $this->validatePayrollReadiness($payroll, 'process');
            if ($errors) {
                throw ValidationException::withMessages(['readiness' => $errors]);
            }

            $this->assertPayrollAccountsReady($payroll);

            $items = [];

            $expenseByChartAccount = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'earning')
                ->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id ?: $settings->salary_expense_account_id);

            foreach ($expenseByChartAccount as $chartAccountId => $lines) {
                $amount = (float) $lines->sum('amount');
                if ($amount <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId),
                    'description' => "Payroll expense {$payroll->payroll_number}",
                    'debit' => $this->baseAmount($amount, $payroll->exchange_rate),
                    'credit' => 0,
                ];
            }

            $employerExpenseByChartAccount = $payroll->payslips
                ->flatMap->lines
                ->where('type', 'employer_contribution')
                ->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id ?: $settings->salary_expense_account_id);

            foreach ($employerExpenseByChartAccount as $chartAccountId => $lines) {
                $amount = (float) $lines->sum('amount');
                if ($amount <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId),
                    'description' => "Employer contribution expense {$payroll->payroll_number}",
                    'debit' => $this->baseAmount($amount, $payroll->exchange_rate),
                    'credit' => 0,
                ];
            }

            $taxTotal = (float) $payroll->payslips
                ->flatMap->lines
                ->where('source', 'tax')
                ->sum('amount');

            if ($taxTotal > 0) {
                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($settings->tax_payable_account_id),
                    'description' => "Payroll tax payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->baseAmount($taxTotal, $payroll->exchange_rate),
                ];
            }

            $benefitLines = $payroll->payslips
                ->flatMap->lines
                ->filter(fn (PayslipLine $line) => $line->source === 'benefit' || $line->type === 'employer_contribution');

            foreach ($benefitLines->groupBy(fn (PayslipLine $line) => $line->meta['payable_account_id'] ?? $line->component?->accounting_account_id ?? $settings->benefit_payable_account_id) as $chartAccountId => $lines) {
                $amount = (float) $lines->sum('amount');
                if ($amount <= 0) {
                    continue;
                }

                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($chartAccountId),
                    'description' => "Payroll benefits payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->baseAmount($amount, $payroll->exchange_rate),
                ];
            }

            $otherDeductionTotal = (float) $payroll->payslips
                ->flatMap->lines
                ->where('type', 'deduction')
                ->reject(fn (PayslipLine $line) => in_array($line->source, ['tax', 'benefit'], true))
                ->sum('amount');

            if ($otherDeductionTotal > 0) {
                $items[] = [
                    'account_id' => $this->resolvePostingAccountId($settings->tax_payable_account_id),
                    'description' => "Payroll deductions payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => $this->baseAmount($otherDeductionTotal, $payroll->exchange_rate),
                ];
            }

            $items[] = [
                'account_id' => $this->resolvePostingAccountId($settings->salary_payable_account_id),
                'description' => "Net salary payable {$payroll->payroll_number}",
                'debit' => 0,
                'credit' => $this->baseAmount((float) $payroll->total_net_payable, $payroll->exchange_rate),
            ];

            $items = $this->balanceJournalItems($items);
            $totalDebit = collect($items)->sum(fn ($item) => (float) $item['debit']);

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $payroll->branch_id,
                'voucher_no' => 'JV-PAY-' . $payroll->payroll_number,
                'voucher_date' => now()->toDateString(),
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
                'total' => number_format($totalDebit, 2, '.', ''),
            ]);

            $voucher->items()->createMany($items);
            $payroll->update(['journal_voucher_id' => $voucher->id]);
            $payroll->payslips()->update(['journal_voucher_id' => $voucher->id]);
            $this->log($payroll, $payroll->status, $payroll->status, 'journal_voucher_created', $voucher->voucher_no, $actor);

            return $voucher->fresh('items.account');
        });
    }

    public function pay(Payroll $payroll, User $actor): JournalVoucher
    {
        $this->assertReadyToPay($payroll);

        return DB::transaction(function () use ($payroll, $actor) {
            $payroll = Payroll::query()->with(['sourceAccount', 'payslips'])->lockForUpdate()->findOrFail($payroll->id);

            if ($payroll->payment_journal_voucher_id) {
                return $payroll->paymentJournalVoucher;
            }

            $settings = $this->settings($payroll->branch_id);
            $this->assertSourceAccountReady($payroll->sourceAccount);

            $items = [
                [
                    'account_id' => $this->resolvePostingAccountId($settings->salary_payable_account_id),
                    'description' => "Salary payable cleared {$payroll->payroll_number}",
                    'debit' => $this->baseAmount((float) $payroll->total_net_payable, $payroll->exchange_rate),
                    'credit' => 0,
                ],
                $this->accountLine($payroll->sourceAccount, "Payroll payment {$payroll->payroll_number}", 0, (float) $payroll->total_net_payable, (float) $payroll->exchange_rate),
            ];

            $items = $this->balanceJournalItems($items);
            $totalDebit = collect($items)->sum(fn ($item) => (float) $item['debit']);

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $payroll->branch_id,
                'voucher_no' => 'JV-PAYMENT-' . $payroll->payroll_number,
                'voucher_date' => now()->toDateString(),
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
                'total' => number_format($totalDebit, 2, '.', ''),
            ]);

            $voucher->items()->createMany($items);
            $payroll->update([
                'status' => 'paid',
                'paid_by' => $actor->id,
                'paid_at' => now(),
                'payment_journal_voucher_id' => $voucher->id,
            ]);
            $payroll->payslips()->update(['status' => 'paid', 'payment_status' => 'PAID']);
            $this->log($payroll, 'processed', 'paid', 'payment_journal_voucher_created', $voucher->voucher_no, $actor);

            return $voucher->fresh('items.account');
        });
    }

    public function recalculatePayslip(Payslip $payslip): void
    {
        $payslip = $payslip->fresh('lines');
        $earnings = (float) $payslip->lines()->where('type', 'earning')->sum('amount');
        $deductions = (float) $payslip->lines()->where('type', 'deduction')->sum('amount');
        $employer = (float) $payslip->lines()->where('type', 'employer_contribution')->sum('amount');
        $net = $earnings - $deductions;

        if ($net < 0) {
            abort(422, 'Payslip net payable cannot be negative.');
        }

        $payslip->update([
            'gross_earnings' => number_format($earnings, 2, '.', ''),
            'salary_payable' => number_format($earnings, 2, '.', ''),
            'total_deductions' => number_format($deductions, 2, '.', ''),
            'deduction' => number_format($deductions, 2, '.', ''),
            'employer_contributions' => number_format($employer, 2, '.', ''),
            'net_payable' => number_format($net, 2, '.', ''),
            'total_payable' => number_format($net, 2, '.', ''),
            'base_currency_amount' => $this->baseAmount($net, $payslip->exchange_rate),
        ]);
    }

    public function recalculatePayroll(Payroll $payroll): void
    {
        $payroll->payslips()->with('lines')->get()->each(fn (Payslip $payslip) => $this->recalculatePayslip($payslip));

        $payroll->refresh();
        $payroll->update([
            'total_employees' => $payroll->payslips()->count(),
            'total_earnings' => number_format((float) $payroll->payslips()->sum('gross_earnings'), 2, '.', ''),
            'total_gross' => number_format((float) $payroll->payslips()->sum('gross_earnings'), 2, '.', ''),
            'total_deductions' => number_format((float) $payroll->payslips()->sum('total_deductions'), 2, '.', ''),
            'total_net_payable' => number_format((float) $payroll->payslips()->sum('net_payable'), 2, '.', ''),
            'total_base_currency_amount' => number_format((float) $payroll->payslips()->sum('base_currency_amount'), 2, '.', ''),
        ]);
    }

    protected function prepareEmployeeCalculation(User $employee, PayrollPeriod $period, PayrollSetting $settings, bool $strictAttendanceLock = false): array
    {
        $this->ensureEmployeePayrollPrerequisites($employee, $period, $settings);
        $employee->loadMissing('payrollAccount.chartOfAccounts');

        $reasons = [];

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
        } elseif ((float) $attendance->payable_days <= 0) {
            $reasons[] = 'no payable days';
        }

        $currencyId = $structure?->currency_id ?: $settings->currency_id;
        $exchangeRate = (float) ($structure?->exchange_rate ?: 1);
        if (! $currencyId) {
            $reasons[] = 'invalid currency';
        }
        if ($exchangeRate <= 0) {
            $reasons[] = 'invalid exchange rate';
        }

        $additions = collect();
        $deductions = collect();
        $reimbursements = collect();
        $calculation = null;

        if (! $reasons && $structure && $attendance) {
            $additions = $this->employeeAdditions($employee, $period);
            $deductions = $this->employeeDeductions($employee, $period);
            $reimbursements = $this->employeeReimbursements($employee);
            $calculation = $this->calculator->calculate($employee, $structure, $attendance, $settings, $additions, $deductions, $reimbursements);
        }

        return compact('reasons', 'structure', 'attendance', 'additions', 'deductions', 'reimbursements', 'calculation');
    }

    protected function ensureEmployeePayrollPrerequisites(User $employee, PayrollPeriod $period, PayrollSetting $settings): void
    {
        if (! $employee->active || ! $this->accountSync->shouldSyncPayrollAccount($employee)) {
            return;
        }

        if (! $employee->payrollAccount || ! $employee->payrollAccount->active || $employee->payrollAccount->chartOfAccounts->isEmpty()) {
            $this->accountSync->syncEmployeePayrollAccount($employee);
            $employee->refresh();
        }

        $this->ensureSalaryStructure($employee, $period, $settings);
        $this->ensureAttendanceSummary($employee, $period);
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

    protected function ensureAttendanceSummary(User $employee, PayrollPeriod $period): void
    {
        $exists = AttendanceSummary::query()
            ->where('employee_id', $employee->id)
            ->where('payroll_period_id', $period->id)
            ->exists();

        if ($exists) {
            return;
        }

        $workingDays = max(1, (int) $period->start_date->diffInDays($period->end_date) + 1);

        AttendanceSummary::query()->create([
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'branch_id' => $employee->branch_id ?: $period->branch_id,
            'total_working_days' => $workingDays,
            'present_days' => $workingDays,
            'absent_days' => 0,
            'paid_leave_days' => 0,
            'unpaid_leave_days' => 0,
            'half_days' => 0,
            'late_days' => 0,
            'overtime_hours' => 0,
            'payable_days' => $workingDays,
            'locked' => false,
        ]);
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
                if (! $employee?->payrollAccount || ! $employee->payrollAccount->active || $employee->payrollAccount->chartOfAccounts->isEmpty()) {
                    $errors[] = ($employee?->display_name ?: "Employee #{$payslip->employee_id}") . ' is missing an active payroll payable account.';
                }
            }

            if ($payroll->payslips->flatMap->lines->where('source', 'tax')->sum('amount') > 0 && ! $settings->tax_payable_account_id) {
                $errors[] = 'Tax payable account is required because this payroll has tax deductions.';
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
                    $this->assertSourceAccountReady(Account::query()->with('chartOfAccounts')->find($payroll->source_account_id));
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
        if (! in_array($settings->daily_rate_basis, ['working_days', 'calendar_days'], true)) {
            $errors[] = 'Payroll daily rate basis is invalid.';
        }
        if ((float) $settings->default_overtime_rate < 0) {
            $errors[] = 'Default overtime rate cannot be negative.';
        }

        if (in_array($stage, ['process', 'process_preview'], true)) {
            foreach ([
                'salary_expense_account_id' => 'Salary expense account is not configured.',
                'salary_payable_account_id' => 'Salary payable account is not configured.',
            ] as $field => $message) {
                if (! $settings->{$field}) {
                    $errors[] = $message;
                    continue;
                }

                if (! ChartOfAccount::query()->whereKey($settings->{$field})->where('active', true)->exists()) {
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
                    'amount' => number_format($amount, 2, '.', ''),
                    'base_currency_amount' => $this->baseAmount($amount, $payslip->exchange_rate),
                    'calculation_type' => $adjustment->calculation_type,
                    'source' => $kind === 'addition' ? 'payroll_addition' : 'payroll_deduction',
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
        if ($payroll->status !== 'approved') {
            abort(422, 'Only approved payroll can be processed.');
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
            abort(422, 'Cannot edit approved, processed, paid, locked, or void payroll unless it is reopened.');
        }
    }

    protected function isEditable(Payroll $payroll): bool
    {
        return in_array($payroll->status, ['draft', 'generated'], true);
    }

    protected function accountLine(Account $account, string $description, float $debit, float $credit, float|string|null $exchangeRate = 1): array
    {
        $chart = ChartOfAccount::query()->where('account_id', $account->id)->first();

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

    protected function resolvePostingAccountId(?string $accountOrChartId): string
    {
        if ($accountOrChartId && Account::query()->whereKey($accountOrChartId)->exists()) {
            return $accountOrChartId;
        }

        if ($accountOrChartId) {
            $accountId = ChartOfAccount::query()->whereKey($accountOrChartId)->value('account_id');

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

    protected function assertSourceAccountReady(?Account $source): void
    {
        if (! $source) {
            abort(422, 'Payment From Account is required before payroll journal posting.');
        }

        if (! $source->active || ! in_array($source->nature, ['cash', 'bank'], true)) {
            abort(422, 'Payment From Account must be an active cash or bank account.');
        }

        if (! ChartOfAccount::query()->where('account_id', $source->id)->exists()) {
            abort(422, 'Payment From Account must be linked to a Chart of Account.');
        }
    }

    protected function assertPayrollAccountsReady(Payroll $payroll): void
    {
        $missing = [];

        foreach ($payroll->payslips as $payslip) {
            $employee = $payslip->employee;
            $account = $employee?->payrollAccount;

            if (! $employee || ! $account || ! $account->active || $account->chartOfAccounts->isEmpty()) {
                $missing[] = $employee?->display_name ?: "Employee #{$payslip->employee_id}";
            }
        }

        if ($missing) {
            abort(422, 'Payroll account sync failed for: ' . implode(', ', $missing));
        }
    }

    protected function balanceJournalItems(array $items): array
    {
        $totalDebit = round(collect($items)->sum(fn ($item) => (float) $item['debit']), 2);
        $totalCredit = round(collect($items)->sum(fn ($item) => (float) $item['credit']), 2);
        $difference = round($totalDebit - $totalCredit, 2);

        if (abs($difference) <= 0.01 && abs($difference) > 0) {
            $index = collect($items)
                ->keys()
                ->sortByDesc(fn ($key) => max((float) $items[$key]['debit'], (float) $items[$key]['credit']))
                ->first();

            if ((float) $items[$index]['debit'] > 0) {
                $items[$index]['debit'] = number_format((float) $items[$index]['debit'] - $difference, 2, '.', '');
            } else {
                $items[$index]['credit'] = number_format((float) $items[$index]['credit'] + $difference, 2, '.', '');
            }

            return $items;
        }

        if (abs($difference) > 0.01) {
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
        return number_format((float) $amount * (float) ($exchangeRate ?: 1), 2, '.', '');
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




