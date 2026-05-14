<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\SalaryStructure;
use App\Models\SalaryStructureLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SalaryStructureController extends BaseCrudApiController
{
    protected string $modelClass = SalaryStructure::class;
    protected ?string $permissionPrefix = 'hrm.salary_structure';
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

        if (($parentData['active'] ?? true) === true) {
            SalaryStructure::query()
                ->where('employee_id', $parentData['employee_id'])
                ->where('active', true)
                ->update(['active' => false, 'effective_to' => now()->subDay()->toDateString()]);
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
        $parentData['updated_by'] = request()->user()?->id;

        return $parentData;
    }
}
