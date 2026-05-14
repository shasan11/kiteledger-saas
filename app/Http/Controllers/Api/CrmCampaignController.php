<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmCampaign;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CrmCampaignController extends BaseCrudApiController
{
    protected string $modelClass = CrmCampaign::class;

    protected array $searchable = ['name', 'code', 'source', 'medium'];

    protected array $filterable = ['branch_id', 'source', 'medium', 'status'];

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'name' => ['required', 'string', 'max:180'],
            'code' => ['nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')],
            'source' => ['nullable', 'string', 'max:80'],
            'medium' => ['nullable', 'string', 'max:80'],
            'budget' => ['nullable', 'numeric', 'min:0'],
            'start_date' => ['nullable', 'date'],
            'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
            'status' => ['nullable', 'in:draft,active,paused,completed,cancelled'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $rules = $this->makeRulesPartial($this->storeRules($request));
        $rules['code'] = ['sometimes', 'nullable', 'string', 'max:60', Rule::unique('crm_campaigns', 'code')->ignore($record->getKey())];

        return $rules;
    }
}
