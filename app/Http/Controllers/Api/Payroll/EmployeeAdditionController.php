<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\EmployeeAddition;

class EmployeeAdditionController extends BaseCrudApiController
{
    protected string $modelClass = EmployeeAddition::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected array $relations = ['employee', 'component'];
    protected array $relationDetails = ['employee' => 'employee_id', 'component' => 'component_id'];
    protected array $searchable = ['name', 'employee.name', 'component.name'];
    protected array $filterable = ['employee_id', 'branch_id', 'component_id'];

    protected array $storeRules = [
        'employee_id' => ['required', 'integer', 'exists:users,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'component_id' => ['required', 'uuid', 'exists:salary_components,id'],
        'name' => ['required', 'string', 'max:190'],
        'amount' => ['required', 'numeric', 'gt:0'],
        'calculation_type' => ['required', 'in:fixed,percentage'],
        'recurring' => ['nullable', 'boolean'],
        'effective_from' => ['required', 'date'],
        'effective_to' => ['nullable', 'date', 'after_or_equal:effective_from'],
        'active' => ['nullable', 'boolean'],
        'remarks' => ['nullable', 'string'],
    ];
}
