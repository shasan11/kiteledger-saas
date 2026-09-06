<?php

namespace App\Services\Payroll;

use App\Models\AttendanceSummary;
use App\Models\BenefitRule;
use App\Models\EmployeeAddition;
use App\Models\EmployeeDeduction;
use App\Models\EmployeeReimbursement;
use App\Models\FiscalYear;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\SalaryComponent;
use App\Models\SalaryStructure;
use App\Models\TaxSlab;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Validation\ValidationException;

class PayrollCalculationService
{
    public function calculate(
        User $employee,
        SalaryStructure $structure,
        AttendanceSummary $attendance,
        PayrollSetting $settings,
        Collection $additions,
        Collection $deductions,
        Collection $reimbursements,
        ?PayrollPeriod $period = null,
    ): array {
        $precision = (int) $settings->currency_precision;
        $exchangeRate = (string) ($structure->exchange_rate ?: 1);
        $totalWorkingDays = $this->positive((string) $attendance->total_working_days, '1');
        $basicSalary = (string) $structure->basic_salary;
        $shiftHours = (string) ($employee->shift?->work_hour ?: 8);

        $rateBasis = (string) $settings->daily_rate_basis;
        if ($rateBasis === 'working_days') {
            $rateBasis = match ((string) $settings->standard_working_days_mode) {
                'calendar_days' => 'calendar_days',
                'fixed_30_days' => 'fixed_30_days',
                default => 'working_days',
            };
        }
        $rateBasisDays = match ($rateBasis) {
            'calendar_days' => $period
                ? (string) ($period->start_date->diffInDays($period->end_date) + 1)
                : $totalWorkingDays,
            'fixed_days' => (string) max(1, (int) $settings->default_monthly_working_days),
            'fixed_30_days' => '30',
            default => $totalWorkingDays,
        };
        $unpaidDays = $settings->unpaid_leave_deduction_enabled
            ? min((float) $attendance->unpaid_leave_days, (float) $rateBasisDays)
            : 0.0;
        $salaryPayableDays = $this->sub($rateBasisDays, (string) $unpaidDays);

        $proratedBasic = $this->round(
            $this->mul($basicSalary, $this->div($salaryPayableDays, $rateBasisDays, 8), 6),
            $precision,
            $settings->rounding_method
        );

        $dailyRate = $this->round($this->div($basicSalary, $rateBasisDays, 8), $precision, $settings->rounding_method);
        $lossOfPay = $this->round($this->sub($basicSalary, $proratedBasic), $precision, $settings->rounding_method);
        $monthlyWorkHour = $this->mul($rateBasisDays, $shiftHours, 2);
        $hourlySalary = $this->compare($monthlyWorkHour, '0') > 0
            ? $this->round($this->div($basicSalary, $monthlyWorkHour, 8), $precision, $settings->rounding_method)
            : '0';
        $lateDeduction = $this->round(
            $settings->late_deduction_enabled
                ? $this->mul((string) $attendance->late_days, (string) ($settings->late_deduction_per_day ?: 0), 6)
                : '0',
            $precision,
            $settings->rounding_method
        );
        $overtime = $this->round(
            $settings->overtime_enabled
                ? $this->mul((string) $attendance->overtime_hours, (string) $settings->default_overtime_rate, 6)
                : '0',
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
            'meta' => ['affects_net_salary' => true],
            'remarks' => null,
        ]];

        foreach ($structure->lines->where('active', true) as $line) {
            $component = $line->component;
            if (! $component) {
                continue;
            }

            $amount = $this->componentAmount(
                (string) $line->calculation_type,
                (string) $line->amount,
                (string) $line->percentage,
                (string) $line->formula,
                $proratedBasic,
                [
                    'basic_salary' => $basicSalary,
                    'prorated_basic' => $proratedBasic,
                    'gross_salary' => (string) ($structure->gross_salary ?: $basicSalary),
                    'payable_days' => $salaryPayableDays,
                    'working_days' => $rateBasisDays,
                    'daily_rate' => $dailyRate,
                    'overtime_hours' => (string) $attendance->overtime_hours,
                ],
            );
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
                'meta' => ['affects_net_salary' => true],
                'remarks' => $reimbursement->description,
            ];
        }

        if (! $this->isZero($lateDeduction)) {
            $component = SalaryComponent::query()->where('code', 'LATE')->first();
            $lines[] = $this->line($component, 'Late Attendance Deduction', $lateDeduction, $exchangeRate, 'attendance', $precision, $settings->rounding_method);
        }

        foreach ($deductions as $deduction) {
            $amount = $this->adjustmentAmount($deduction, $basicSalary);
            $lines[] = $this->line($deduction->component, $deduction->name, $amount, $exchangeRate, 'deduction', $precision, $settings->rounding_method, $deduction->remarks);
        }

        $taxBreakdown = $this->calculateTaxBreakdown($lines, $precision, $settings->rounding_method, $employee, $period);
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

        if ($this->compare($net, '0') < 0) {
            throw ValidationException::withMessages([
                'payroll' => "Deductions exceed earnings for {$employee->display_name}. Review the employee's salary components before generating payroll.",
            ]);
        }

        return [
            'gross_earnings' => $gross,
            'total_deductions' => $totalDeductions,
            'employer_contributions' => $employerContributions,
            'net_payable' => $net,
            'salary_payable' => $proratedBasic,
            'hourly_salary' => $hourlySalary,
            'base_currency_amount' => $this->base($net, $exchangeRate, $precision, $settings->rounding_method),
            'payable_days' => $salaryPayableDays,
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
                'shift_hours' => (float) $shiftHours,
                'monthly_work_hour' => (float) $monthlyWorkHour,
                'working_hour' => max(0, ((float) $attendance->present_days) * (float) $shiftHours),
                'weekly_holiday' => null,
                'public_holiday' => null,
            ],
            'snapshot' => [
                'tax' => $taxBreakdown,
                'daily_rate_basis' => $settings->daily_rate_basis,
                'rounding_method' => $settings->rounding_method,
                'currency_precision' => $precision,
                'salary' => (float) $basicSalary,
                'salary_basis_days' => (float) $rateBasisDays,
                'salary_payable_days' => (float) $salaryPayableDays,
                'daily_rate' => (float) $dailyRate,
                'loss_of_pay' => (float) $lossOfPay,
                'unpaid_leave_applied' => (bool) $settings->unpaid_leave_deduction_enabled,
                'overtime_applied' => (bool) $settings->overtime_enabled,
                'late_deduction_applied' => (bool) $settings->late_deduction_enabled,
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

    public function calculateTax(
        array $lines,
        int $precision = 2,
        string $rounding = 'nearest',
        ?User $employee = null,
        ?PayrollPeriod $period = null,
    ): string
    {
        return $this->calculateTaxBreakdown($lines, $precision, $rounding, $employee, $period)['total_tax'];
    }

    public function calculateTaxBreakdown(array $lines, int $precision = 2, string $rounding = 'nearest', ?User $employee = null, ?PayrollPeriod $period = null): array
    {
        $taxableIncome = collect($lines)
            ->filter(fn (array $line) => $line['type'] === 'earning' && $this->componentTaxable($line['component_id'] ?? null, $line['source'] ?? null))
            ->reduce(fn (string $sum, array $line) => $this->add($sum, (string) $line['amount']), '0');

        $tax = '0';
        $breakdown = [];
        $slabs = $this->taxSlabs($employee, $period);

        $slab = $slabs
            ->filter(fn (TaxSlab $candidate) => $this->compare($taxableIncome, (string) $candidate->income_from) >= 0
                && ($candidate->income_to === null || $this->compare($taxableIncome, (string) $candidate->income_to) <= 0))
            ->sortByDesc(fn (TaxSlab $candidate) => (float) $candidate->income_from)
            ->first();

        if ($slab) {
            $portion = $this->sub($taxableIncome, (string) $slab->income_from);
            $rateTax = $this->mul($portion, $this->div((string) $slab->rate, '100', 8), 6);
            $slabTax = $this->add((string) $slab->fixed_amount, $rateTax);
            $tax = $slabTax;
            $breakdown[] = [
                'slab_id' => $slab->id,
                'income_from' => (float) $slab->income_from,
                'income_to' => $slab->income_to === null ? null : (float) $slab->income_to,
                'taxable_portion' => (float) $this->round($portion, $precision, $rounding),
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
            'country' => $employee?->country ?: 'Generic',
            'fiscal_year' => $period ? $this->fiscalYearLabels($period)->first() : null,
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
            'meta' => ['affects_net_salary' => $component?->affects_net_salary ?? true],
            'remarks' => $remarks,
        ];
    }

    protected function componentAmount(string $type, string $amount, string $percentage, string $formula, string $base, array $variables): string
    {
        return match ($type) {
            'percentage' => $this->mul($base, $this->div($percentage ?: '0', '100', 8), 6),
            'formula' => $this->evaluateFormula($formula, $variables),
            default => $amount,
        };
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
            ->filter(fn (array $line) => $line['type'] === $type && (($line['meta']['affects_net_salary'] ?? true) !== false))
            ->reduce(fn (string $sum, array $line) => $this->add($sum, (string) $line['amount']), '0');
    }

    protected function taxSlabs(?User $employee, ?PayrollPeriod $period): Collection
    {
        $country = trim((string) ($employee?->country ?: 'Generic'));
        $query = TaxSlab::query()->where('active', true);

        $hasCountrySpecific = $country !== '' && TaxSlab::query()
            ->where('active', true)
            ->whereRaw('LOWER(country) = ?', [strtolower($country)])
            ->exists();

        $query->whereRaw('LOWER(country) = ?', [strtolower($hasCountrySpecific ? $country : 'Generic')]);

        if ($period) {
            $labels = $this->fiscalYearLabels($period);
            $query->whereIn('fiscal_year', $labels->all());
        }

        return $query->orderBy('income_from')->get();
    }

    protected function fiscalYearLabels(PayrollPeriod $period): Collection
    {
        $date = $period->end_date;
        $year = (int) $period->year;
        $labels = collect([(string) $year, "{$year}/".($year + 1), "{$year}-".($year + 1)]);
        $fiscalYear = FiscalYear::query()
            ->whereDate('start_date', '<=', $date)
            ->whereDate('end_date', '>=', $date)
            ->first();

        if ($fiscalYear) {
            $labels->prepend($fiscalYear->name)->prepend($fiscalYear->code);
        }

        return $labels->filter()->map(fn ($label) => trim((string) $label))->unique()->values();
    }

    protected function evaluateFormula(string $formula, array $variables): string
    {
        $expression = trim(str_replace(['{', '}'], '', strtolower($formula)));
        if ($expression === '') {
            throw ValidationException::withMessages(['formula' => 'A formula component must contain a formula.']);
        }

        $expression = preg_replace_callback('/[a-z_][a-z0-9_]*/', function (array $match) use ($variables): string {
            if (! array_key_exists($match[0], $variables)) {
                throw ValidationException::withMessages(['formula' => "Unknown payroll formula variable: {$match[0]}."]);
            }

            return '('.(string) $variables[$match[0]].')';
        }, $expression);

        $compact = preg_replace('/\s+/', '', $expression);
        preg_match_all('/\d+(?:\.\d+)?|[()+\-*\/]/', $compact, $matches);
        $tokens = $matches[0];
        if (implode('', $tokens) !== $compact) {
            throw ValidationException::withMessages(['formula' => 'Formula may contain numbers, approved variables, parentheses, and + - * / only.']);
        }

        $output = [];
        $operators = [];
        $precedence = ['+' => 1, '-' => 1, '*' => 2, '/' => 2];
        $previous = null;
        foreach ($tokens as $token) {
            if (is_numeric($token)) {
                $output[] = $token;
            } elseif ($token === '(') {
                $operators[] = $token;
            } elseif ($token === ')') {
                while ($operators && end($operators) !== '(') {
                    $output[] = array_pop($operators);
                }
                if (! $operators) {
                    throw ValidationException::withMessages(['formula' => 'Formula parentheses are not balanced.']);
                }
                array_pop($operators);
            } else {
                if ($token === '-' && ($previous === null || $previous === '(' || isset($precedence[$previous]))) {
                    $output[] = '0';
                }
                while ($operators && isset($precedence[end($operators)]) && $precedence[end($operators)] >= $precedence[$token]) {
                    $output[] = array_pop($operators);
                }
                $operators[] = $token;
            }
            $previous = $token;
        }
        while ($operators) {
            $operator = array_pop($operators);
            if ($operator === '(') {
                throw ValidationException::withMessages(['formula' => 'Formula parentheses are not balanced.']);
            }
            $output[] = $operator;
        }

        $stack = [];
        foreach ($output as $token) {
            if (is_numeric($token)) {
                $stack[] = (string) $token;
                continue;
            }
            if (count($stack) < 2) {
                throw ValidationException::withMessages(['formula' => 'Formula is incomplete.']);
            }
            $right = array_pop($stack);
            $left = array_pop($stack);
            $stack[] = match ($token) {
                '+' => $this->add($left, $right),
                '-' => $this->sub($left, $right),
                '*' => $this->mul($left, $right, 6),
                '/' => $this->compare($right, '0') === 0
                    ? throw ValidationException::withMessages(['formula' => 'Formula cannot divide by zero.'])
                    : $this->div($left, $right, 6),
            };
        }

        if (count($stack) !== 1 || $this->compare($stack[0], '0') < 0) {
            throw ValidationException::withMessages(['formula' => 'Formula must return one non-negative amount.']);
        }

        return $stack[0];
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
        $precision = max(0, $precision);
        $value = trim($value);

        if (! preg_match('/^([+-]?)(\d+)(?:\.(\d*))?$/', $value, $matches)) {
            throw ValidationException::withMessages(['formula' => 'Payroll calculation produced an invalid monetary value.']);
        }

        $negative = ($matches[1] ?? '') === '-';
        $integer = ltrim($matches[2], '0') ?: '0';
        $fraction = $matches[3] ?? '';
        $kept = $precision > 0 ? str_pad(substr($fraction, 0, $precision), $precision, '0') : '';
        $discarded = substr($fraction, $precision);
        $hasDiscardedValue = str_contains($discarded, '1') || preg_match('/[2-9]/', $discarded) === 1;
        $increment = match ($method) {
            'floor' => $negative && $hasDiscardedValue,
            'ceil' => ! $negative && $hasDiscardedValue,
            default => $discarded !== '' && $discarded[0] >= '5',
        };

        $digits = $integer . $kept;
        if ($increment) {
            $digits = $this->incrementDigits($digits);
        }
        $digits = str_pad($digits, $precision + 1, '0', STR_PAD_LEFT);

        $whole = $precision > 0 ? substr($digits, 0, -$precision) : $digits;
        $decimal = $precision > 0 ? '.' . substr($digits, -$precision) : '';
        $isZero = trim($whole . ($precision > 0 ? substr($digits, -$precision) : ''), '0') === '';

        return ($negative && ! $isZero ? '-' : '') . $whole . $decimal;
    }

    protected function incrementDigits(string $digits): string
    {
        $digits = $digits === '' ? '0' : $digits;

        for ($index = strlen($digits) - 1; $index >= 0; $index--) {
            if ($digits[$index] !== '9') {
                $digits[$index] = (string) (((int) $digits[$index]) + 1);

                return $digits;
            }

            $digits[$index] = '0';
        }

        return '1' . $digits;
    }
}
