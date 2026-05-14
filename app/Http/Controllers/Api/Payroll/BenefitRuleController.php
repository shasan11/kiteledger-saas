<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\BenefitRule;

class BenefitRuleController extends BaseCrudApiController
{
    protected string $modelClass = BenefitRule::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected array $relations = ['accountingAccount'];
    protected array $relationDetails = ['accountingAccount' => 'accounting_account_id'];
    protected array $searchable = ['name', 'code'];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:190'],
        'code' => ['required', 'string', 'max:40', 'unique:benefit_rules,code'],
        'employee_rate' => ['nullable', 'numeric', 'min:0'],
        'employer_rate' => ['nullable', 'numeric', 'min:0'],
        'calculation_base' => ['required', 'string', 'max:60'],
        'max_limit' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'accounting_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
    ];
}
