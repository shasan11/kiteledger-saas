<?php

namespace Database\Seeders;

use App\Models\AttendanceSummary;
use App\Models\Currency;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\TaxSlab;
use App\Models\User;
use Illuminate\Database\Seeder;

class PayrollSeeder extends Seeder
{
    public function run(): void
    {
        $components = [
            ['name' => 'Basic Salary', 'code' => 'BASIC', 'type' => 'earning', 'taxable' => true, 'sort_order' => 10],
            ['name' => 'House Rent Allowance', 'code' => 'HRA', 'type' => 'earning', 'taxable' => true, 'sort_order' => 20],
            ['name' => 'Transport Allowance', 'code' => 'TRANSPORT', 'type' => 'earning', 'taxable' => false, 'sort_order' => 30],
            ['name' => 'Food Allowance', 'code' => 'FOOD', 'type' => 'earning', 'taxable' => false, 'sort_order' => 40],
            ['name' => 'Overtime', 'code' => 'OVERTIME', 'type' => 'earning', 'taxable' => true, 'sort_order' => 50],
            ['name' => 'Bonus', 'code' => 'BONUS', 'type' => 'earning', 'taxable' => true, 'sort_order' => 60],
            ['name' => 'Tax Deduction', 'code' => 'TAX', 'type' => 'deduction', 'taxable' => false, 'sort_order' => 100],
            ['name' => 'Unpaid Leave Deduction', 'code' => 'UNPAID_LEAVE', 'type' => 'deduction', 'taxable' => false, 'sort_order' => 110],
            ['name' => 'Provident Fund', 'code' => 'PF', 'type' => 'deduction', 'taxable' => false, 'sort_order' => 120],
            ['name' => 'Social Security', 'code' => 'SSF', 'type' => 'employer_contribution', 'taxable' => false, 'sort_order' => 130],
            ['name' => 'Loan Deduction', 'code' => 'LOAN', 'type' => 'deduction', 'taxable' => false, 'sort_order' => 140],
            ['name' => 'Reimbursement', 'code' => 'REIMBURSEMENT', 'type' => 'earning', 'taxable' => false, 'sort_order' => 150],
        ];

        foreach ($components as $component) {
            SalaryComponent::query()->updateOrCreate(
                ['code' => $component['code']],
                array_merge([
                    'calculation_type' => 'fixed',
                    'affects_net_salary' => true,
                    'active' => true,
                ], $component)
            );
        }

        $currency = Currency::query()->where('is_base', true)->first() ?: Currency::query()->first();

        PayrollSetting::query()->firstOrCreate(
            ['branch_id' => null],
            [
                'currency_id' => $currency?->id,
                'daily_rate_basis' => 'working_days',
                'rounding_method' => 'nearest',
                'currency_precision' => $currency?->decimal_places ?? 2,
                'default_overtime_rate' => 250,
                'allow_multiple_runs' => false,
                'active' => true,
            ]
        );

        TaxSlab::query()->firstOrCreate(
            ['country' => 'Generic', 'fiscal_year' => now()->year . '/' . now()->addYear()->year, 'income_from' => 0],
            ['income_to' => null, 'rate' => 0, 'fixed_amount' => 0, 'active' => true]
        );

        $period = PayrollPeriod::query()->firstOrCreate(
            ['month' => now()->month, 'year' => now()->year, 'branch_id' => null],
            [
                'start_date' => now()->startOfMonth()->toDateString(),
                'end_date' => now()->endOfMonth()->toDateString(),
                'status' => 'open',
            ]
        );

        User::query()->where('active', true)->limit(50)->get()->each(function (User $user) use ($currency, $period) {
            $basic = $user->employee_id ? 45000 : 35000;

            SalaryStructure::query()->firstOrCreate(
                ['employee_id' => $user->id, 'active' => true],
                [
                    'branch_id' => $user->branch_id,
                    'effective_from' => now()->startOfYear()->toDateString(),
                    'basic_salary' => $basic,
                    'gross_salary' => $basic,
                    'currency_id' => $currency?->id,
                    'exchange_rate' => 1,
                    'remarks' => 'Seed salary structure',
                ]
            );

            AttendanceSummary::query()->firstOrCreate(
                ['employee_id' => $user->id, 'payroll_period_id' => $period->id],
                [
                    'branch_id' => $user->branch_id,
                    'total_working_days' => 26,
                    'present_days' => 24,
                    'absent_days' => 0,
                    'paid_leave_days' => 1,
                    'unpaid_leave_days' => 1,
                    'half_days' => 0,
                    'late_days' => 1,
                    'overtime_hours' => 4,
                    'payable_days' => 25,
                ]
            );
        });
    }
}
