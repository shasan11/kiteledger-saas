<?php

namespace App\Services\Payroll;

use App\Models\Account;
use App\Models\ApprovalLog;
use App\Models\AttendanceSummary;
use App\Models\ChartOfAccount;
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
use App\Models\SalaryStructure;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollService
{
    public function __construct(private readonly PayrollCalculationService $calculator)
    {
    }

    public function generate(PayrollPeriod $period, ?string $branchId, array $employeeIds, User $actor, array $options = []): Payroll
    {
        return DB::transaction(function () use ($period, $branchId, $employeeIds, $actor, $options) {
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
            ]);

            $employees = User::query()
                ->with(['department', 'branch', 'payrollAccount'])
                ->whereIn('id', $employeeIds)
                ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
                ->get();

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

                $attendance = AttendanceSummary::query()
                    ->where('employee_id', $employee->id)
                    ->where('payroll_period_id', $period->id)
                    ->first();

                if (! $structure || ! $attendance) {
                    continue;
                }

                $additions = $this->employeeAdditions($employee, $period);
                $deductions = $this->employeeDeductions($employee, $period);
                $reimbursements = $this->employeeReimbursements($employee);
                $calculation = $this->calculator->calculate($employee, $structure, $attendance, $settings, $additions, $deductions, $reimbursements);

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
                    'payable_days' => $calculation['payable_days'],
                    'total_working_days' => $calculation['total_working_days'],
                    'unpaid_leave_days' => $calculation['unpaid_leave_days'],
                    'overtime_hours' => $calculation['overtime_hours'],
                    'remarks' => $employee->payroll_account_id ? null : 'Missing employee payroll account. Draft generation allowed; processing is blocked.',
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
            } elseif ($toStatus === 'processed') {
                $this->process($payroll, $actor);
            } elseif ($toStatus === 'paid') {
                $this->assertReadyToPay($payroll);
                $payroll->update(['status' => 'paid', 'paid_by' => $actor->id, 'paid_at' => now()]);
                $payroll->payslips()->update(['status' => 'paid', 'payment_status' => 'PAID']);
            } elseif ($toStatus === 'locked') {
                $payroll->update(['status' => 'locked', 'locked_by' => $actor->id, 'locked_at' => now()]);
                $payroll->payslips()->update(['status' => 'locked']);
            } elseif ($toStatus === 'void') {
                $payroll->update(['status' => 'void', 'voided_by' => $actor->id, 'voided_at' => now(), 'void_reason' => $reason]);
                $payroll->payslips()->update(['status' => 'void']);
            }

            $this->log($payroll, $from, $toStatus, $action, $reason, $actor);

            return $this->loadPayroll($payroll);
        });
    }

    public function process(Payroll $payroll, User $actor): JournalVoucher
    {
        $this->assertReadyToProcess($payroll);
        $voucher = $this->generateJournalVoucher($payroll, $actor);

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
        return DB::transaction(function () use ($payroll, $actor) {
            $payroll = Payroll::query()->with(['sourceAccount', 'payslips.employee.payrollAccount', 'payslips.lines.component'])->lockForUpdate()->findOrFail($payroll->id);

            if ($payroll->journal_voucher_id) {
                return $payroll->journalVoucher;
            }

            if (! in_array($payroll->status, ['approved', 'processed'], true)) {
                abort(422, 'Journal voucher can only be generated for an approved payroll.');
            }

            $settings = $this->settings($payroll->branch_id);
            if (! $settings->salary_expense_account_id) {
                abort(422, 'Payroll salary expense account is not configured.');
            }

            $items = [];
            $totalDebit = 0.0;

            $expenseByChartAccount = $payroll->payslips
                ->flatMap->lines
                ->whereIn('type', ['earning', 'employer_contribution'])
                ->groupBy(fn (PayslipLine $line) => $line->component?->accounting_account_id ?: $settings->salary_expense_account_id);

            foreach ($expenseByChartAccount as $chartAccountId => $lines) {
                $amount = (float) $lines->sum('amount');
                if ($amount <= 0) {
                    continue;
                }

                $items[] = [
                    'chart_of_account_id' => $chartAccountId,
                    'description' => "Payroll expense {$payroll->payroll_number}",
                    'debit' => number_format($amount, 2, '.', ''),
                    'credit' => 0,
                ];
                $totalDebit += $amount;
            }

            foreach ($payroll->payslips as $payslip) {
                $account = $payslip->employee?->payrollAccount;
                if (! $account) {
                    abort(422, "Employee {$payslip->employee?->display_name} is missing payroll account.");
                }

                $items[] = $this->accountLine($account, "Net salary payable {$payslip->payslip_number}", 0, (float) $payslip->net_payable);
            }

            $deductionTotal = (float) $payroll->payslips
                ->flatMap->lines
                ->where('type', 'deduction')
                ->sum('amount');

            if ($deductionTotal > 0 && $settings->salary_payable_account_id) {
                $items[] = [
                    'chart_of_account_id' => $settings->salary_payable_account_id,
                    'description' => "Payroll deductions payable {$payroll->payroll_number}",
                    'debit' => 0,
                    'credit' => number_format($deductionTotal, 2, '.', ''),
                ];
            }

            $sourceAccount = $payroll->sourceAccount;
            if (! $sourceAccount) {
                abort(422, 'Payment From Account is required before payroll journal posting.');
            }

            foreach ($payroll->payslips as $payslip) {
                $items[] = $this->accountLine($payslip->employee->payrollAccount, "Salary settlement {$payslip->payslip_number}", (float) $payslip->net_payable, 0);
                $totalDebit += (float) $payslip->net_payable;
            }

            $items[] = $this->accountLine($sourceAccount, "Payroll payment {$payroll->payroll_number}", 0, (float) $payroll->total_net_payable);

            $voucher = JournalVoucher::query()->create([
                'branch_id' => $payroll->branch_id,
                'voucher_no' => 'JV-PAY-' . $payroll->payroll_number,
                'voucher_date' => now()->toDateString(),
                'currency_id' => $payroll->currency_id,
                'exchange_rate' => $payroll->exchange_rate ?: 1,
                'reference' => $payroll->payroll_number,
                'narration' => "Payroll journal voucher for {$payroll->payroll_number}",
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

            return $voucher->fresh('items.account', 'items.chartOfAccount');
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

        if (! $payroll->source_account_id) {
            abort(422, 'Payment From Account is required before processing payroll.');
        }

        $source = Account::query()->find($payroll->source_account_id);
        if (! $source || ! $source->active || ! in_array($source->nature, ['cash', 'bank'], true)) {
            abort(422, 'Payment From Account must be an active cash or bank account.');
        }

        $missing = $payroll->payslips()->whereHas('employee', fn ($query) => $query->whereNull('payroll_account_id'))->count();
        if ($missing > 0) {
            abort(422, 'Every employee included in payroll must have a payroll account before processing.');
        }
    }

    protected function assertReadyToPay(Payroll $payroll): void
    {
        if ($payroll->status !== 'processed' || ! $payroll->journal_voucher_id) {
            abort(422, 'Payroll must be processed and posted before payment.');
        }

        if (! $payroll->source_account_id) {
            abort(422, 'Payment From Account is required before payment.');
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

    protected function accountLine(Account $account, string $description, float $debit, float $credit): array
    {
        $chart = ChartOfAccount::query()->where('account_id', $account->id)->first();

        if (! $chart) {
            abort(422, "Account {$account->name} must be linked to a chart account before journal posting.");
        }

        return [
            'account_id' => $account->id,
            'chart_of_account_id' => $chart->id,
            'description' => $description,
            'debit' => number_format($debit, 2, '.', ''),
            'credit' => number_format($credit, 2, '.', ''),
        ];
    }

    protected function settings(?string $branchId): PayrollSetting
    {
        return PayrollSetting::query()
            ->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)->orWhereNull('branch_id');
            })
            ->orderByRaw('branch_id is null')
            ->firstOrCreate(
                ['branch_id' => $branchId],
                ['daily_rate_basis' => 'working_days', 'rounding_method' => 'nearest', 'currency_precision' => 2]
            );
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
            'additions.component',
            'deductions.component',
            'payslips.employee.payrollAccount',
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
