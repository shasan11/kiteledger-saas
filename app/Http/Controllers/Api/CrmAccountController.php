<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmAccount;
use App\Services\Crm\CrmInsightService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmAccountController extends BaseCrudApiController
{
    protected string $modelClass = CrmAccount::class;

    protected array $relations = ['branch', 'owner', 'parentAccount'];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'owner' => 'owner_id',
        'parentAccount' => 'parent_account_id',
    ];

    protected array $searchable = ['account_no', 'name', 'legal_name', 'email', 'phone', 'industry', 'segment', 'source'];

    protected array $filterable = ['branch_id', 'owner_id', 'status', 'segment', 'source', 'industry', 'parent_account_id'];

    protected array $sortable = ['id', 'account_no', 'name', 'status', 'segment', 'annual_revenue', 'created_at', 'updated_at'];

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'account_no' => ['nullable', 'string', 'max:40', Rule::unique('crm_accounts', 'account_no')],
            'name' => ['required', 'string', 'max:180'],
            'legal_name' => ['nullable', 'string', 'max:180'],
            'industry' => ['nullable', 'string', 'max:120'],
            'website' => ['nullable', 'string', 'max:180'],
            'phone' => ['nullable', 'string', 'max:40'],
            'email' => ['nullable', 'email', 'max:120'],
            'billing_address' => ['nullable', 'string'],
            'shipping_address' => ['nullable', 'string'],
            'parent_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
            'owner_id' => ['nullable', 'integer', 'exists:users,id'],
            'status' => ['nullable', 'in:active,inactive,prospect,customer,churned'],
            'segment' => ['nullable', 'string', 'max:80'],
            'source' => ['nullable', 'string', 'max:80'],
            'annual_revenue' => ['nullable', 'numeric', 'min:0'],
            'employee_count' => ['nullable', 'integer', 'min:0'],
            'credit_limit' => ['nullable', 'numeric', 'min:0'],
            'active' => ['nullable', 'boolean'],
            'remarks' => ['nullable', 'string'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules($request));
        $rules['account_no'] = ['sometimes', 'nullable', 'string', 'max:40', Rule::unique('crm_accounts', 'account_no')->ignore($record->getKey())];

        return $rules;
    }

    public function summary(Request $request, string $id, CrmInsightService $insights)
    {
        $account = CrmAccount::query()->findOrFail($id);

        $this->assertRecordBranchAccess($request, $account);

        return response()->json($insights->accountSummary($account));
    }

    public function commercials(Request $request, string $id, CrmInsightService $insights)
    {
        $account = CrmAccount::query()->findOrFail($id);

        $this->assertRecordBranchAccess($request, $account);

        return response()->json($insights->accountCommercials($account));
    }
}
