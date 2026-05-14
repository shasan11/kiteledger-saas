<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayrollPayment;

class PayrollPaymentController extends BaseCrudApiController
{
    protected string $modelClass = PayrollPayment::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected array $relations = ['payrollRun', 'payslip'];
    protected array $relationDetails = ['payrollRun' => 'payroll_run_id', 'payslip' => 'payslip_id'];
    protected array $filterable = ['payroll_run_id', 'payslip_id', 'employee_id', 'status'];

    protected array $storeRules = [
        'payroll_run_id' => ['required', 'uuid', 'exists:payroll_runs,id'],
        'payslip_id' => ['nullable', 'uuid', 'exists:payslips,id'],
        'employee_id' => ['required', 'integer', 'exists:users,id'],
        'amount' => ['required', 'numeric', 'gt:0'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'base_currency_amount' => ['required', 'numeric', 'min:0'],
        'payment_method' => ['required', 'string', 'max:60'],
        'bank_account_id' => ['nullable', 'uuid', 'exists:bank_accounts,id'],
        'payment_date' => ['required', 'date'],
        'reference_number' => ['nullable', 'string', 'max:190'],
        'status' => ['nullable', 'in:pending,paid,failed,reversed'],
        'remarks' => ['nullable', 'string'],
        'idempotency_key' => ['nullable', 'string', 'max:100'],
    ];
}
