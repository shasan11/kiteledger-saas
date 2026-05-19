<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class SalaryStructureController extends BaseCrudApiController
{
    protected string $modelClass = SalaryStructure::class;
    protected ?string $permissionPrefix = 'hrm.payroll.salary_structures';
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected array $relations = ['employee', 'branch', 'currency', 'lines.component'];
    protected array $relationDetails = ['employee' => 'employee_id', 'branch' => 'branch_id', 'currency' => 'currency_id'];
    protected array $searchable = ['employee.name', 'employee.email', 'employee.employee_id'];
    protected array $filterable = ['employee_id', 'branch_id', 'currency_id'];
    protected array $dateRangeFilters = ['effective_from' => ['from' => 'date_from', 'to' => 'date_to']];

    protected array $nested = [
        'lines' => [
            'relation' => 'lines',
            'model' => SalaryStructureLine::class,
            'foreign_key' => 'salary_structure_id',
            'replace_on_update' => true,
            'relations' => ['component'],
            'relation_details' => ['component' => 'component_id'],
            'rules' => [
                'component_id' => ['required', 'uuid', 'exists:salary_components,id'],
                'amount' => ['nullable', 'numeric', 'min:0'],
                'percentage' => ['nullable', 'numeric', 'min:0'],
                'formula' => ['nullable', 'string'],
                'calculation_type' => ['required', 'in:fixed,percentage,formula,manual'],
                'active' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'employee_id' => ['required', 'integer', 'exists:users,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'effective_from' => ['required', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'basic_salary' => ['required', 'numeric', 'min:0'],
        'gross_salary' => ['nullable', 'numeric', 'min:0'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'remarks' => ['nullable', 'string'],
    ];

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $parentData['created_by'] = request()->user()?->id;
        $parentData['exchange_rate'] = $parentData['exchange_rate'] ?? 1;

        $this->closePreviousOpenStructure($parentData);
        $this->assertNoOverlappingStructure($parentData);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
        $this->assertStructureNotUsedInPostedPayroll($record);

        $merged = array_merge($record->only([
            'employee_id',
            'branch_id',
            'effective_from',
            'effective_to',
            'active',
        ]), $parentData);

        $this->assertNoOverlappingStructure($merged, $record);
        $parentData['updated_by'] = request()->user()?->id;

        return $parentData;
    }

    protected function assertNoOverlappingStructure(array $data, ?SalaryStructure $ignore = null): void
    {
        if (($data['active'] ?? true) !== true) {
            return;
        }

        $from = Carbon::parse($data['effective_from'])->toDateString();
        $to = ! empty($data['effective_to']) ? Carbon::parse($data['effective_to'])->toDateString() : null;

        $overlap = SalaryStructure::query()
            ->where('employee_id', $data['employee_id'])
            ->where('active', true)
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))
            ->whereDate('effective_from', '<=', $to ?: '9999-12-31')
            ->where(fn ($query) => $query->whereNull('effective_to')->orWhereDate('effective_to', '>=', $from))
            ->exists();

        if ($overlap) {
            abort(422, 'Salary structure overlaps an existing active structure for this employee.');
        }
    }

    protected function closePreviousOpenStructure(array $data): void
    {
        if (($data['active'] ?? true) !== true || ! empty($data['effective_to'])) {
            return;
        }

        $from = Carbon::parse($data['effective_from']);

        SalaryStructure::query()
            ->where('employee_id', $data['employee_id'])
            ->where('active', true)
            ->whereNull('effective_to')
            ->whereDate('effective_from', '<', $from->toDateString())
            ->latest('effective_from')
            ->limit(1)
            ->update(['effective_to' => $from->copy()->subDay()->toDateString()]);
    }

    protected function assertStructureNotUsedInPostedPayroll(SalaryStructure $structure): void
    {
        $used = $structure->employee
            ? $structure->employee->generatedPayslips()
                ->whereIn('status', ['processed', 'paid', 'locked'])
                ->where('salary_year', '>=', (int) $structure->effective_from->format('Y'))
                ->exists()
            : false;

        if ($used) {
            abort(422, 'Salary structure is already used in posted payroll. Create a new version instead of editing it.');
        }
    }
}
