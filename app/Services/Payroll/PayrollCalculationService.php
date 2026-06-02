<?php

namespace App\Services\Payroll;

use App\Models\AttendanceSummary;
use App\Models\BenefitRule;
use App\Models\EmployeeAddition;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeReimbursement;
use App\Models\PayrollSetting;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\TaxSlab;
use App\Models\User;
use Illuminate\Support\Collection;

class PayrollCalculationService
{
    public function calculate(
        User $employee,
        SalaryStructure $structure,
        AttendanceSummary $attendance,
        PayrollSetting $settings,
        Collection $additions,
        Collection $deductions,
        Collection $reimbursements
    ): array {
        $precision = (int) $settings->currency_precision;
        $exchangeRate = (string) ($structure->exchange_rate ?: 1);
        $totalWorkingDays = $this->positive((string) $attendance->total_working_days, '1');
        $payableDays = $this->positive((string) $attendance->payable_days, $totalWorkingDays);
        $basicSalary = (string) $structure->basic_salary;

        $proratedBasic = $this->round(
            $this->mul($basicSalary, $this->div($payableDays, $totalWorkingDays, 8), 6),
            $precision,
            $settings->rounding_method
        );

        $dailyRate = $this->round($this->div($basicSalary, $totalWorkingDays, 8), $precision, $settings->rounding_method);
        $monthlyWorkHour = $this->mul($totalWorkingDays, '8', 2);
        $hourlySalary = $this->compare($monthlyWorkHour, '0') > 0
            ? $this->round($this->div($basicSalary, $monthlyWorkHour, 8), $precision, $settings->rounding_method)
            : '0';
        $unpaidLeaveDeduction = $this->round(
            $this->mul($dailyRate, (string) $attendance->unpaid_leave_days, 6),
            $precision,
            $settings->rounding_method
        );
        $overtime = $this->round(
            $this->mul((string) $attendance->overtime_hours, (string) $settings->default_overtime_rate, 6),
            $precision,
            $settings->rounding_method
        );

        $lines = [[
            'component_id' => null,
            'type' => 'earning',
            'name' => 'Basic Salary',
            'amount' => $proratedBasic,
            'base_currency_amount' => $this->base($proratedBasic, $exchangeRate, $precision, $settings->rounding_method),
            'calculation_type' => 'fixed',
            'source' => 'salary_structure',
            'remarks' => null,
        ]];

        foreach ($structure->lines->where('active', true) as $line) {
            $component = $line->component;
            if (! $component) {
                continue;
            }

            $amount = $this->componentAmount((string) $line->calculation_type, (string) $line->amount, (string) $line->percentage, $basicSalary);
            $amount = $this->round($amount, $precision, $settings->rounding_method);

            if ($this->isZero($amount)) {
                continue;
            }

            $lines[] = $this->line($component, $component->name, $amount, $exchangeRate, 'salary_structure', $precision, $settings->rounding_method);
        }

        if (! $this->isZero($overtime)) {
            $component = SalaryComponent::query()->where('code', 'OVERTIME')->first();
            $lines[] = $this->line($component, 'Overtime', $overtime, $exchangeRate, 'overtime', $precision, $settings->rounding_method, 'Attendance overtime hours');
        }

        foreach ($additions as $addition) {
            $amount = $this->adjustmentAmount($addition, $basicSalary);
            $lines[] = $this->line($addition->component, $addition->name, $amount, $exchangeRate, 'addition', $precision, $settings->rounding_method, $addition->remarks);
        }

        foreach ($reimbursements as $reimbursement) {
            $lines[] = [
                'component_id' => null,
                'type' => 'earning',
                'name' => $reimbursement->expense_category,
                'amount' => $this->round((string) $reimbursement->amount, $precision, $settings->rounding_method),
                'base_currency_amount' => $this->base((string) $reimbursement->amount, $exchangeRate, $precision, $settings->rounding_method),
                'calculation_type' => 'fixed',
                'source' => 'reimbursement',
                'remarks' => $reimbursement->description,
            ];
        }

        if (! $this->isZero($unpaidLeaveDeduction)) {
            $component = SalaryComponent::query()->where('code', 'UNPAID_LEAVE')->first();
            $lines[] = $this->line($component, 'Unpaid Leave Deduction', $unpaidLeaveDeduction, $exchangeRate, 'attendance', $precision, $settings->rounding_method);
        }

        foreach ($deductions as $deduction) {
            $amount = $this->adjustmentAmount($deduction, $basicSalary);
            $lines[] = $this->line($deduction->component, $deduction->name, $amount, $exchangeRate, 'deduction', $precision, $settings->rounding_method, $deduction->remarks);
        }

        $taxBreakdown = $this->calculateTaxBreakdown($lines, $precision, $settings->rounding_method);
        $tax = $taxBreakdown['total_tax'];
        if (! $this->isZero($tax)) {
            $component = SalaryComponent::query()->where('code', 'TAX')->first();
            $taxLine = $this->line($component, 'Tax Deduction', $tax, $exchangeRate, 'tax', $precision, $settings->rounding_method);
            $taxLine['meta'] = ['tax_breakdown' => $taxBreakdown];
            $lines[] = $taxLine;
        }

        foreach ($this->benefitLines($lines, $exchangeRate, $precision, $settings->rounding_method) as $benefitLine) {
            $lines[] = $benefitLine;
        }

        $gross = $this->round($this->sumLines($lines, 'earning'), $precision, $settings->rounding_method);
        $totalDeductions = $this->round($this->sumLines($lines, 'deduction'), $precision, $settings->rounding_method);
        $employerContributions = $this->round($this->sumLines($lines, 'employer_contribution'), $precision, $settings->rounding_method);
        $net = $this->round($this->sub($gross, $totalDeductions), $precision, $settings->rounding_method);

        return [
            'gross_earnings' => $gross,
            'total_deductions' => $totalDeductions,
            'employer_contributions' => $employerContributions,
            'net_payable' => $net,
            'salary_payable' => $proratedBasic,
            'hourly_salary' => $hourlySalary,
            'base_currency_amount' => $this->base($net, $exchangeRate, $precision, $settings->rounding_method),
            'payable_days' => (string) $attendance->payable_days,
            'total_working_days' => (string) $attendance->total_working_days,
            'unpaid_leave_days' => (string) $attendance->unpaid_leave_days,
            'overtime_hours' => (string) $attendance->overtime_hours,
            'lines' => $lines,
            'attendance' => [
                'present_days' => (float) $attendance->present_days,
                'absent_days' => (float) $attendance->absent_days,
                'paid_leave_days' => (float) $attendance->paid_leave_days,
                'unpaid_leave_days' => (float) $attendance->unpaid_leave_days,
                'half_days' => (float) $attendance->half_days,
                'late_days' => (int) $attendance->late_days,
                'shift_hours' => 8,
                'monthly_work_hour' => (float) $monthlyWorkHour,
                'working_hour' => max(0, ((float) $attendance->present_days) * 8),
                'weekly_holiday' => null,
                'public_holiday' => null,
            ],
            'snapshot' => [
                'tax' => $taxBreakdown,
                'daily_rate_basis' => $settings->daily_rate_basis,
                'rounding_method' => $settings->rounding_method,
                'currency_precision' => $precision,
                'salary' => (float) $basicSalary,
                'attendance_summary_id' => $attendance->id,
                'attendance' => [
                    'total_working_days' => (float) $attendance->total_working_days,
                    'present_days' => (float) $attendance->present_days,
                    'absent_days' => (float) $attendance->absent_days,
                    'paid_leave_days' => (float) $attendance->paid_leave_days,
                    'unpaid_leave_days' => (float) $attendance->unpaid_leave_days,
                    'payable_days' => (float) $attendance->payable_days,
                    'overtime_hours' => (float) $attendance->overtime_hours,
                ],
            ],
        ];
    }

    public function calculateTax(array $lines, int $precision = 2, string $rounding = 'nearest'): string
    {
        return $this->calculateTaxBreakdown($lines, $precision, $rounding)['total_tax'];
    }

    public function calculateTaxBreakdown(array $lines, int $precision = 2, string $rounding = 'nearest'): array
    {
        $taxableIncome = collect($lines)
            ->filter(fn (array $line) => $line['type'] === 'earning' && $this->componentTaxable($line['component_id'] ?? null, $line['source'] ?? null))
            ->reduce(fn (string $sum, array $line) => $this->add($sum, (string) $line['amount']), '0');

        $tax = '0';
        $breakdown = [];
        $slabs = TaxSlab::query()->where('active', true)->orderBy('income_from')->get();

        foreach ($slabs as $slab) {
            if ($this->compare($taxableIncome, (string) $slab->income_from) < 0) {
                continue;
            }

            $upper = $slab->income_to ? min((float) $taxableIncome, (float) $slab->income_to) : (float) $taxableIncome;
            $portion = max(0, $upper - (float) $slab->income_from);
            $rateTax = $this->mul((string) $portion, $this->div((string) $slab->rate, '100', 8), 6);
            $slabTax = $this->add((string) $slab->fixed_amount, $rateTax);
            $tax = $this->add($tax, $slabTax);
            $breakdown[] = [
                'slab_id' => $slab->id,
                'income_from' => (float) $slab->income_from,
                'income_to' => $slab->income_to === null ? null : (float) $slab->income_to,
                'taxable_portion' => round($portion, $precision),
                'fixed_tax' => (float) $slab->fixed_amount,
                'rate' => (float) $slab->rate,
                'rate_tax' => (float) $this->round($rateTax, $precision, $rounding),
                'total_tax' => (float) $this->round($slabTax, $precision, $rounding),
            ];
        }

        return [
            'basis' => 'monthly',
            'taxable_income' => (float) $this->round($taxableIncome, $precision, $rounding),
            'slabs' => $breakdown,
            'total_tax' => $this->round($tax, $precision, $rounding),
            'note' => 'Tax is calculated from configured monthly taxable earnings. Annualized/YTD tax is not enabled in this tenant.',
        ];
    }

    protected function benefitLines(array $lines, string $exchangeRate, int $precision, string $rounding): array
    {
        $gross = $this->sumLines($lines, 'earning');
        $benefitLines = [];

        foreach (BenefitRule::query()->where('active', true)->get() as $rule) {
            $base = $rule->calculation_base === 'basic'
                ? (string) collect($lines)->firstWhere('name', 'Basic Salary')['amount']
                : $gross;

            $employeeAmount = $this->applyLimit($this->mul($base, $this->div((string) $rule->employee_rate, '100', 8), 6), $rule->max_limit);
            $employerAmount = $this->applyLimit($this->mul($base, $this->div((string) $rule->employer_rate, '100', 8), 6), $rule->max_limit);

            if (! $this->isZero($employeeAmount)) {
                $benefitLines[] = [
                    'component_id' => null,
                    'type' => 'deduction',
                    'name' => "{$rule->name} Employee",
                    'amount' => $this->round($employeeAmount, $precision, $rounding),
                    'base_currency_amount' => $this->base($employeeAmount, $exchangeRate, $precision, $rounding),
                    'calculation_type' => 'percentage',
                    'source' => 'benefit',
                    'meta' => ['benefit_rule_id' => $rule->id, 'payable_account_id' => $rule->accounting_account_id],
                    'remarks' => $rule->code,
                ];
            }

            if (! $this->isZero($employerAmount)) {
                $benefitLines[] = [
                    'component_id' => null,
                    'type' => 'employer_contribution',
                    'name' => "{$rule->name} Employer",
                    'amount' => $this->round($employerAmount, $precision, $rounding),
                    'base_currency_amount' => $this->base($employerAmount, $exchangeRate, $precision, $rounding),
                    'calculation_type' => 'percentage',
                    'source' => 'benefit',
                    'meta' => ['benefit_rule_id' => $rule->id, 'payable_account_id' => $rule->accounting_account_id],
                    'remarks' => $rule->code,
                ];
            }
        }

        return $benefitLines;
    }

    protected function line(?SalaryComponent $component, string $name, string $amount, string $exchangeRate, string $source, int $precision, string $rounding, ?string $remarks = null): array
    {
        return [
            'component_id' => $component?->id,
            'type' => $component?->type ?? ($source === 'deduction' || $source === 'attendance' || $source === 'tax' ? 'deduction' : 'earning'),
            'name' => $name,
            'amount' => $this->round($amount, $precision, $rounding),
            'base_currency_amount' => $this->base($amount, $exchangeRate, $precision, $rounding),
            'calculation_type' => $component?->calculation_type ?? 'fixed',
            'source' => $source,
            'remarks' => $remarks,
        ];
    }

    protected function componentAmount(string $type, string $amount, string $percentage, string $base): string
    {
        return $type === 'percentage'
            ? $this->mul($base, $this->div($percentage ?: '0', '100', 8), 6)
            : $amount;
    }

    protected function adjustmentAmount(EmployeeAddition|EmployeeDeduction $adjustment, string $base): string
    {
        return $adjustment->calculation_type === 'percentage'
            ? $this->mul($base, $this->div((string) $adjustment->amount, '100', 8), 6)
            : (string) $adjustment->amount;
    }

    protected function componentTaxable(?string $componentId, ?string $source = null): bool
    {
        if ($source === 'reimbursement') {
            return false;
        }

        if (! $componentId) {
            return true;
        }

        return (bool) SalaryComponent::query()->whereKey($componentId)->value('taxable');
    }

    protected function sumLines(array $lines, string $type): string
    {
        return collect($lines)
            ->where('type', $type)
            ->reduce(fn (string $sum, array $line) => $this->add($sum, (string) $line['amount']), '0');
    }

    protected function base(string $amount, string $exchangeRate, int $precision, string $rounding): string
    {
        return $this->round($this->mul($amount, $exchangeRate, 6), $precision, $rounding);
    }

    protected function applyLimit(string $amount, ?string $limit): string
    {
        if (! $limit || $this->compare($limit, '0') <= 0) {
            return $amount;
        }

        return $this->compare($amount, $limit) > 0 ? $limit : $amount;
    }

    protected function positive(string $value, string $fallback): string
    {
        return $this->compare($value, '0') > 0 ? $value : $fallback;
    }

    protected function isZero(string $value): bool
    {
        return $this->compare($value, '0') === 0;
    }

    protected function add(string $left, string $right): string
    {
        return function_exists('bcadd') ? bcadd($left, $right, 6) : number_format(((float) $left) + ((float) $right), 6, '.', '');
    }

    protected function sub(string $left, string $right): string
    {
        return function_exists('bcsub') ? bcsub($left, $right, 6) : number_format(((float) $left) - ((float) $right), 6, '.', '');
    }

    protected function mul(string $left, string $right, int $scale): string
    {
        return function_exists('bcmul') ? bcmul($left, $right, $scale) : number_format(((float) $left) * ((float) $right), $scale, '.', '');
    }

    protected function div(string $left, string $right, int $scale): string
    {
        if ($this->compare($right, '0') === 0) {
            return '0';
        }

        return function_exists('bcdiv') ? bcdiv($left, $right, $scale) : number_format(((float) $left) / ((float) $right), $scale, '.', '');
    }

    protected function compare(string $left, string $right): int
    {
        return function_exists('bccomp') ? bccomp($left, $right, 6) : (((float) $left) <=> ((float) $right));
    }

    protected function round(string $value, int $precision, string $method): string
    {
        $factor = 10 ** $precision;
        $number = (float) $value;
        $rounded = match ($method) {
            'floor' => floor($number * $factor) / $factor,
            'ceil' => ceil($number * $factor) / $factor,
            default => round($number, $precision),
        };

        return number_format($rounded, $precision, '.', '');
    }
}
