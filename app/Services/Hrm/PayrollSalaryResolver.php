<?php

namespace App\Services\Hrm;

use App\Models\Designation;
use App\Models\SalaryHistory;
use App\Models\SalaryStructure;
use App\Models\User;
use Carbon\Carbon;

/**
 * Resolves the correct salary details for an employee for a given payroll period.
 *
 * Priority order (highest to lowest):
 *  1. Employee-specific SalaryStructure active for the period
 *  2. Employee SalaryHistory active for the period
 *  3. Designation's default_salary_structure_id (if set and found)
 *  4. Designation's default_basic_salary
 *  5. Missing — payroll cannot proceed without salary data
 */
class PayrollSalaryResolver
{
    /**
     * Resolve salary for an employee within an optional date window.
     *
     * @param  User         $employee
     * @param  Carbon|null  $periodStart  Start of the payroll period (defaults to start of current month)
     * @param  Carbon|null  $periodEnd    End of the payroll period (defaults to end of current month)
     * @return array{
     *   employee_id: string,
     *   salary_source: string,
     *   designation_id: string|null,
     *   salary_structure_id: string|null,
     *   basic_salary: float,
     *   salary_frequency: string,
     *   is_missing: bool,
     *   errors: list<string>
     * }
     */
    public function resolveForEmployee(
        User $employee,
        ?Carbon $periodStart = null,
        ?Carbon $periodEnd = null
    ): array {
        $start = $periodStart ?? now()->startOfMonth();

        // 1. Employee-specific active SalaryStructure for the period
        $structure = $this->findEmployeeSalaryStructure($employee, $start);
        if ($structure) {
            return $this->result(
                $employee,
                'employee_salary_structure',
                (float) $structure->basic_salary,
                $structure->id,
                null,
                'monthly',
            );
        }

        // 2. Employee SalaryHistory active for the period
        $history = $this->findSalaryHistory($employee, $start);
        if ($history) {
            return $this->result(
                $employee,
                'salary_history',
                (float) $history->salary,
                null,
                null,
                'monthly',
            );
        }

        // Resolve designation for fallback checks
        $designation = $this->loadDesignation($employee);

        // 3. Designation's default_salary_structure_id
        if ($designation?->default_salary_structure_id) {
            $designationStructure = SalaryStructure::find($designation->default_salary_structure_id);
            if ($designationStructure) {
                return $this->result(
                    $employee,
                    'designation_salary_structure',
                    (float) $designationStructure->basic_salary,
                    $designationStructure->id,
                    $designation,
                    $designation->salary_frequency ?? 'monthly',
                );
            }
        }

        // 4. Designation default_basic_salary
        if ($designation && $designation->default_basic_salary > 0) {
            return $this->result(
                $employee,
                'designation_default',
                (float) $designation->default_basic_salary,
                null,
                $designation,
                $designation->salary_frequency ?? 'monthly',
            );
        }

        // 5. Missing — cannot calculate payroll
        return $this->result($employee, 'missing', 0.0, null, $designation, 'monthly');
    }

    /**
     * Convenience: returns only basic_salary, or throws if missing.
     *
     * @throws \RuntimeException
     */
    public function resolveBasicSalaryOrFail(
        User $employee,
        ?Carbon $periodStart = null,
        ?Carbon $periodEnd = null
    ): float {
        $resolved = $this->resolveForEmployee($employee, $periodStart, $periodEnd);

        if ($resolved['is_missing']) {
            throw new \RuntimeException(
                "Missing salary setup for employee {$employee->name} (ID: {$employee->id}). " .
                "Add an employee salary structure, salary history, or set a default salary on the designation."
            );
        }

        return $resolved['basic_salary'];
    }

    // -------------------------------------------------------------------------

    private function findEmployeeSalaryStructure(User $employee, Carbon $period): ?SalaryStructure
    {
        return SalaryStructure::query()
            ->where('employee_id', $employee->id)
            ->where('active', true)
            ->where('effective_from', '<=', $period->toDateString())
            ->where(function ($q) use ($period) {
                $q->whereNull('effective_to')
                  ->orWhere('effective_to', '>=', $period->toDateString());
            })
            ->orderByDesc('effective_from')
            ->first();
    }

    private function findSalaryHistory(User $employee, Carbon $period): ?SalaryHistory
    {
        return SalaryHistory::query()
            ->where('user_id', $employee->id)
            ->where('start_date', '<=', $period->toDateString())
            ->where(function ($q) use ($period) {
                $q->whereNull('end_date')
                  ->orWhere('end_date', '>=', $period->toDateString());
            })
            ->orderByDesc('start_date')
            ->first();
    }

    private function loadDesignation(User $employee): ?Designation
    {
        if (!isset($employee->designation_id) || !$employee->designation_id) {
            return null;
        }

        return Designation::find($employee->designation_id);
    }

    private function result(
        User $employee,
        string $source,
        float $basicSalary,
        ?string $salaryStructureId,
        ?Designation $designation,
        string $salaryFrequency
    ): array {
        return [
            'employee_id'         => $employee->id,
            'salary_source'       => $source,
            'designation_id'      => $designation?->id,
            'salary_structure_id' => $salaryStructureId,
            'basic_salary'        => $basicSalary,
            'salary_frequency'    => $salaryFrequency,
            'is_missing'          => $source === 'missing',
            'errors'              => $source === 'missing'
                ? ['Missing salary setup for this employee. Add an employee salary structure, salary history, or set a default salary on the designation.']
                : [],
        ];
    }
}
