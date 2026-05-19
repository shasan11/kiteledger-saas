<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayrollSetting;

class PayrollSettingController extends BaseCrudApiController
{
    protected string $modelClass = PayrollSetting::class;
    protected ?string $permissionPrefix = 'hrm.payroll.settings';
    protected bool $branchScoped = true;
    protected array $relations = ['branch', 'currency'];
    protected array $relationDetails = ['branch' => 'branch_id', 'currency' => 'currency_id'];
    protected array $filterable = ['branch_id', 'currency_id', 'daily_rate_basis', 'rounding_method'];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'daily_rate_basis' => ['required', 'in:working_days,calendar_days'],
        'rounding_method' => ['required', 'in:nearest,floor,ceil'],
        'currency_precision' => ['required', 'integer', 'min:0', 'max:6'],
        'default_overtime_rate' => ['nullable', 'numeric', 'min:0'],
        'salary_expense_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'salary_payable_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'tax_payable_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'benefit_payable_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'bank_account_id' => ['nullable', 'uuid', 'exists:bank_accounts,id'],
        'allow_multiple_runs' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
    ];
}
