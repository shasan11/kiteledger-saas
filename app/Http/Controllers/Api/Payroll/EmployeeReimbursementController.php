<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\EmployeeReimbursement;

class EmployeeReimbursementController extends BaseCrudApiController
{
    protected string $modelClass = EmployeeReimbursement::class;
    protected ?string $permissionPrefix = 'hrm.reimbursement';
    protected bool $branchScoped = true;
    protected array $relations = ['employee'];
    protected array $relationDetails = ['employee' => 'employee_id'];
    protected array $searchable = ['expense_category', 'description', 'status'];
    protected array $filterable = ['employee_id', 'branch_id', 'status'];

    protected array $storeRules = [
        'employee_id' => ['required', 'integer', 'exists:users,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'date' => ['required', 'date'],
        'expense_category' => ['required', 'string', 'max:120'],
        'amount' => ['required', 'numeric', 'gt:0'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'base_currency_amount' => ['nullable', 'numeric', 'min:0'],
        'description' => ['nullable', 'string'],
        'attachment' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,submitted,approved,rejected,paid,void'],
        'rejection_reason' => ['nullable', 'string'],
        'void_reason' => ['nullable', 'string'],
        'payment_reference' => ['nullable', 'string'],
        'include_in_payroll' => ['nullable', 'boolean'],
    ];
}
