<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\AttendanceSummary;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\SalaryHistory;
use App\Models\SalaryStructure;
use App\Models\User;
use App\Services\Payroll\PayrollAccountSyncService;
use App\Services\Payroll\PayrollService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

class PayrollFlowTest extends TestCase
{
    use RefreshDatabase;

    public function test_employee_payroll_account_sync_uses_employee_account_and_liability_chart_account(): void
    {
        $employee = User::factory()->create(['employee_id' => 'EMP-001', 'active' => true]);

        $account = app(PayrollAccountSyncService::class)->syncEmployeePayrollAccount($employee);

        $this->assertSame('employee', $account->nature);
        $this->assertSame('liability', $account->chartOfAccounts()->first()->type);
        $this->assertSame($account->id, $employee->fresh()->payroll_account_id);

        $control = Account::query()->where('code', 'PAYROLL-PAY')->first();
        $this->assertSame('coa', $control->nature);
        $this->assertSame('liability', $control->chartOfAccounts()->first()->type);
    }

    public function test_non_employee_active_user_is_not_synced_in_bulk(): void
    {
        $user = User::factory()->create(['active' => true, 'employee_id' => null]);

        $count = app(PayrollAccountSyncService::class)->syncEmployeesMissingPayrollAccounts();

        $this->assertSame(0, $count);
        $this->assertNull($user->fresh()->payroll_account_id);
    }

    public function test_preview_reports_missing_salary_structure_and_strict_generation_blocks(): void
    {
        [$actor, $employee, $period] = $this->payrollBase();
        app(PayrollAccountSyncService::class)->syncEmployeePayrollAccount($employee);

        AttendanceSummary::query()->create([
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'total_working_days' => 30,
            'present_days' => 30,
            'payable_days' => 30,
        ]);

        $service = app(PayrollService::class);
        $preview = $service->preview($period, null, [$employee->id]);

        $this->assertSame(1, $preview['skipped_employee_count']);
        $this->assertContains('missing active salary structure', $preview['skipped_employees'][0]['reasons']);

        $this->expectException(ValidationException::class);
        $service->generate($period, null, [$employee->id], $actor);
    }

    public function test_generate_auto_prepares_payroll_account_salary_structure_and_attendance(): void
    {
        [$actor, $employee, $period] = $this->payrollBase();

        SalaryHistory::query()->create([
            'user_id' => $employee->id,
            'salary' => 42000,
            'start_date' => '2026-01-01',
            'active' => true,
        ]);

        $service = app(PayrollService::class);
        $payroll = $service->generate($period, $period->branch_id, [$employee->id], $actor);

        $this->assertSame(1, $payroll->payslips()->count());
        $this->assertNotNull($employee->fresh()->payroll_account_id);
        $this->assertDatabaseHas('salary_structures', [
            'employee_id' => $employee->id,
            'basic_salary' => '42000.00',
            'active' => true,
        ]);
        $this->assertDatabaseHas('attendance_summaries', [
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'payable_days' => '31.00',
        ]);
    }

    public function test_process_creates_accrual_and_pay_creates_payment_voucher(): void
    {
        [$actor, $employee, $period] = $this->payrollBase();
        app(PayrollAccountSyncService::class)->syncEmployeePayrollAccount($employee);

        SalaryStructure::query()->create([
            'employee_id' => $employee->id,
            'effective_from' => '2026-05-01',
            'basic_salary' => 30000,
            'gross_salary' => 30000,
            'currency_id' => Currency::query()->first()->id,
            'exchange_rate' => 1,
            'active' => true,
        ]);

        AttendanceSummary::query()->create([
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'total_working_days' => 30,
            'present_days' => 30,
            'payable_days' => 30,
        ]);

        $bank = $this->chartAccount('Bank', 'BANK', 'asset', 'bank')->account;
        $service = app(PayrollService::class);
        $payroll = $service->generate($period, null, [$employee->id], $actor);
        $payroll = $service->transition($payroll, 'approved', 'approve', $actor);
        $payroll = $service->transition($payroll, 'processed', 'process', $actor);

        $this->assertNotNull($payroll->journal_voucher_id);
        $this->assertNull($payroll->payment_journal_voucher_id);

        $payroll->forceFill(['source_account_id' => $bank->id])->save();
        $payroll = $service->transition($payroll->fresh(), 'paid', 'pay', $actor);

        $this->assertNotNull($payroll->payment_journal_voucher_id);
        $this->assertSame('paid', $payroll->status);
    }

    private function payrollBase(): array
    {
        $actor = User::factory()->create(['employee_id' => 'ADMIN']);
        $branch = Branch::query()->create(['code' => 'HO', 'name' => 'Head Office', 'active' => true]);
        $actor->forceFill(['branch_id' => $branch->id])->save();
        $employee = User::factory()->create(['employee_id' => 'EMP-100', 'active' => true, 'branch_id' => $branch->id]);
        $currency = Currency::query()->create(['code' => 'NPR', 'name' => 'Nepalese Rupee', 'is_base' => true, 'active' => true]);
        $expense = $this->chartAccount('Salary Expense', 'SAL-EXP', 'expense');
        $payable = $this->chartAccount('Salary Payable', 'SAL-PAY', 'liability');
        $tax = $this->chartAccount('Tax Payable', 'TAX-PAY', 'liability');
        $benefit = $this->chartAccount('Benefit Payable', 'BEN-PAY', 'liability');

        PayrollSetting::query()->create([
            'currency_id' => $currency->id,
            'daily_rate_basis' => 'working_days',
            'rounding_method' => 'nearest',
            'currency_precision' => 2,
            'salary_expense_account_id' => $expense->id,
            'salary_payable_account_id' => $payable->id,
            'tax_payable_account_id' => $tax->id,
            'benefit_payable_account_id' => $benefit->id,
            'active' => true,
            'branch_id' => $branch->id,
        ]);

        $period = PayrollPeriod::query()->create([
            'month' => 5,
            'year' => 2026,
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'branch_id' => $branch->id,
            'status' => 'open',
        ]);

        return [$actor, $employee, $period];
    }

    private function chartAccount(string $name, string $code, string $type, string $nature = 'coa'): ChartOfAccount
    {
        $account = Account::query()->create([
            'name' => $name,
            'code' => $code,
            'nature' => $nature,
            'active' => true,
        ]);

        $chart = ChartOfAccount::query()->create([
            'account_id' => $account->id,
            'type' => $type,
            'code' => $code,
            'name' => $name,
            'active' => true,
        ]);

        if ($nature !== 'coa') {
            DB::table('accounts')->where('id', $account->id)->update(['nature' => $nature, 'updated_at' => now()]);
        }

        return $chart->fresh('account');
    }
}
