<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayslipLine;

class PayslipLineController extends BaseCrudApiController
{
    protected string $modelClass = PayslipLine::class;
    protected ?string $permissionPrefix = 'hrm.payslip';
    protected array $relations = ['payslip', 'component'];
    protected array $relationDetails = ['payslip' => 'payslip_id', 'component' => 'component_id'];
    protected array $filterable = ['payslip_id', 'component_id', 'type', 'source'];

    protected array $storeRules = [
        'payslip_id' => ['required', 'uuid', 'exists:payslips,id'],
        'component_id' => ['nullable', 'uuid', 'exists:salary_components,id'],
        'type' => ['required', 'in:earning,deduction,employer_contribution'],
        'name' => ['required', 'string', 'max:190'],
        'amount' => ['required', 'numeric'],
        'base_currency_amount' => ['nullable', 'numeric'],
        'calculation_type' => ['required', 'in:fixed,percentage,formula,manual'],
        'source' => ['required', 'in:salary_structure,attendance,manual,addition,deduction,tax,benefit,overtime,reimbursement'],
        'remarks' => ['nullable', 'string'],
    ];
}
