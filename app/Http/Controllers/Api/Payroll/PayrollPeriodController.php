<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayrollPeriod;

class PayrollPeriodController extends BaseCrudApiController
{
    protected string $modelClass = PayrollPeriod::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $filterable = ['month', 'year', 'branch_id', 'status'];
    protected array $sortable = ['year', 'month', 'status', 'created_at'];
    protected string $defaultSort = '-year';

    protected array $storeRules = [
        'month' => ['required', 'integer', 'min:1', 'max:12'],
        'year' => ['required', 'integer', 'min:1900'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'status' => ['nullable', 'in:open,closed,locked'],
    ];
}
