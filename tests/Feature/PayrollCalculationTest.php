<?php

namespace Tests\Feature;

use App\Models\AttendanceSummary;
use App\Models\EmployeeAddition;
use App\Models\EmployeeDeduction;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\TaxSlab;
use App\Models\User;
use App\Services\Payroll\PayrollCalculationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PayrollCalculationTest extends TestCase
{
    use RefreshDatabase;

    public function test_calculates_proration_unpaid_leave_overtime_adjustments_and_tax(): void
    {
        $employee = User::factory()->create();
        $period = PayrollPeriod::query()->create([
            'month' => 5,
            'year' => 2026,
            'start_date' => '2026-05-01',
            'end_date' => '2026-05-31',
            'status' => 'open',
        ]);

        $basic = SalaryComponent::query()->create([
            'name' => 'Basic Salary',
            'code' => 'BASIC',
            'type' => 'earning',
            'calculation_type' => 'fixed',
            'taxable' => true,
            'affects_net_salary' => true,
        ]);

        $allowance = SalaryComponent::query()->create([
            'name' => 'Transport Allowance',
            'code' => 'TRANSPORT',
            'type' => 'earning',
            'calculation_type' => 'fixed',
            'taxable' => false,
            'affects_net_salary' => true,
        ]);

        $bonus = SalaryComponent::query()->create([
            'name' => 'Bonus',
            'code' => 'BONUS',
            'type' => 'earning',
            'calculation_type' => 'fixed',
            'taxable' => true,
            'affects_net_salary' => true,
        ]);

        $loan = SalaryComponent::query()->create([
            'name' => 'Loan Deduction',
            'code' => 'LOAN',
            'type' => 'deduction',
            'calculation_type' => 'fixed',
            'taxable' => false,
            'affects_net_salary' => true,
        ]);

        $structure = SalaryStructure::query()->create([
            'employee_id' => $employee->id,
            'effective_from' => '2026-01-01',
            'basic_salary' => 30000,
            'gross_salary' => 35000,
            'exchange_rate' => 1,
            'active' => true,
        ]);

        $structure->lines()->create([
            'component_id' => $allowance->id,
            'amount' => 3000,
            'calculation_type' => 'fixed',
            'active' => true,
        ]);

        $attendance = AttendanceSummary::query()->create([
            'employee_id' => $employee->id,
            'payroll_period_id' => $period->id,
            'total_working_days' => 30,
            'present_days' => 27,
            'paid_leave_days' => 1,
            'unpaid_leave_days' => 2,
            'overtime_hours' => 5,
            'payable_days' => 28,
        ]);

        $settings = PayrollSetting::query()->create([
            'daily_rate_basis' => 'working_days',
            'rounding_method' => 'nearest',
            'currency_precision' => 2,
            'default_overtime_rate' => 200,
        ]);

        $addition = EmployeeAddition::query()->create([
            'employee_id' => $employee->id,
            'component_id' => $bonus->id,
            'name' => 'Performance Bonus',
            'amount' => 1000,
            'calculation_type' => 'fixed',
            'recurring' => false,
            'effective_from' => '2026-05-01',
            'active' => true,
        ]);

        $deduction = EmployeeDeduction::query()->create([
            'employee_id' => $employee->id,
            'component_id' => $loan->id,
            'name' => 'Loan',
            'amount' => 500,
            'calculation_type' => 'fixed',
            'recurring' => true,
            'effective_from' => '2026-05-01',
            'active' => true,
        ]);

        TaxSlab::query()->create([
            'country' => 'Generic',
            'fiscal_year' => '2026/2027',
            'income_from' => 0,
            'income_to' => null,
            'rate' => 10,
            'fixed_amount' => 0,
            'active' => true,
        ]);

        $result = app(PayrollCalculationService::class)->calculate(
            $employee,
            $structure->fresh('lines.component'),
            $attendance,
            $settings,
            collect([$addition->fresh('component')]),
            collect([$deduction->fresh('component')]),
            collect()
        );

        $this->assertSame('33000.00', $result['gross_earnings']);
        $this->assertSame('5500.00', $result['total_deductions']);
        $this->assertSame('27500.00', $result['net_payable']);
        $this->assertContains('Unpaid Leave Deduction', collect($result['lines'])->pluck('name')->all());
    }
}
