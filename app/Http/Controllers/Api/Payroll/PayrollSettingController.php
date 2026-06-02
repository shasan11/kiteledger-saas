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
        'daily_rate_basis' => ['required', 'in:working_days,calendar_days,fixed_days'],
        'standard_working_days_mode' => ['nullable', 'in:calendar_days,fixed_30_days,working_days_only'],
        'default_monthly_working_days' => ['nullable', 'integer', 'min:1', 'max:31'],
        'rounding_method' => ['required', 'in:nearest,floor,ceil'],
        'currency_precision' => ['required', 'integer', 'min:0', 'max:6'],
        'default_overtime_rate' => ['nullable', 'numeric', 'min:0'],
        'overtime_enabled' => ['nullable', 'boolean'],
        'late_deduction_enabled' => ['nullable', 'boolean'],
        'unpaid_leave_deduction_enabled' => ['nullable', 'boolean'],
        'auto_post_journal_voucher' => ['nullable', 'boolean'],
        'require_approval_before_payment' => ['nullable', 'boolean'],
        'salary_expense_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'salary_payable_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'tax_payable_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'benefit_payable_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'bank_account_id' => ['nullable', 'uuid', 'exists:bank_accounts,id'],
        'allow_multiple_runs' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
    ];
}
