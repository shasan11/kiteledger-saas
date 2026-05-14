<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayslipLine;
use App\Services\Payroll\PayrollService;
use Illuminate\Http\Request;

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
        'amount' => ['required', 'numeric', 'gt:0'],
        'base_currency_amount' => ['nullable', 'numeric'],
        'calculation_type' => ['required', 'in:fixed,percentage,formula,manual'],
        'source' => ['required', 'in:salary_structure,payroll_addition,payroll_deduction,payslip_manual_addition,payslip_manual_deduction,attendance,overtime,tax,benefit,reimbursement,manual,addition,deduction'],
        'remarks' => ['nullable', 'string'],
    ];

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $data = $request->validate($this->storeRules);
        $manualSources = ['payslip_manual_addition', 'payslip_manual_deduction'];

        if (! in_array($data['source'], $manualSources, true)) {
            abort(422, 'Only manual payslip additions or deductions can be created from this endpoint.');
        }

        if ($data['source'] === 'payslip_manual_addition') {
            $data['type'] = 'earning';
        }

        if ($data['source'] === 'payslip_manual_deduction') {
            $data['type'] = 'deduction';
        }

        return response()->json(app(PayrollService::class)->addPayslipLine(
            \App\Models\Payslip::query()->findOrFail($data['payslip_id']),
            $data,
            $request->user()
        ), 201);
    }

    public function destroy(Request $request, mixed $id)
    {
        $this->checkAccess($request, 'destroy');

        return response()->json(app(PayrollService::class)->deletePayslipLine(PayslipLine::query()->findOrFail($id), $request->user()));
    }
}
