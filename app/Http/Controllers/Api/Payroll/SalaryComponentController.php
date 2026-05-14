<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\SalaryComponent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class SalaryComponentController extends BaseCrudApiController
{
    protected string $modelClass = SalaryComponent::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected array $relations = ['accountingAccount'];
    protected array $relationDetails = ['accountingAccount' => 'accounting_account_id'];
    protected array $searchable = ['name', 'code', 'type'];
    protected array $filterable = ['type', 'calculation_type'];
    protected array $sortable = ['name', 'code', 'type', 'sort_order', 'active', 'created_at'];
    protected string $defaultSort = 'sort_order';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:190'],
        'code' => ['required', 'string', 'max:40', 'unique:salary_components,code'],
        'type' => ['required', 'in:earning,deduction,employer_contribution'],
        'calculation_type' => ['required', 'in:fixed,percentage,formula,manual'],
        'taxable' => ['nullable', 'boolean'],
        'affects_net_salary' => ['nullable', 'boolean'],
        'accounting_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'active' => ['nullable', 'boolean'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:190'],
            'code' => ['sometimes', 'required', 'string', 'max:40', Rule::unique('salary_components', 'code')->ignore($record->id)],
            'type' => ['sometimes', 'required', 'in:earning,deduction,employer_contribution'],
            'calculation_type' => ['sometimes', 'required', 'in:fixed,percentage,formula,manual'],
            'taxable' => ['sometimes', 'nullable', 'boolean'],
            'affects_net_salary' => ['sometimes', 'nullable', 'boolean'],
            'accounting_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:chart_of_accounts,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
        ];
    }
}
