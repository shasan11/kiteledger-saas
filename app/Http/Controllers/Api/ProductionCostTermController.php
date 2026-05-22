<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductionCostTerm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductionCostTermController extends BaseCrudApiController
{
    protected string $modelClass = ProductionCostTerm::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch', 'account'];
    protected array $relationDetails = ['branch' => 'branch_id', 'account' => 'account_id'];
    protected array $searchable = ['name', 'code'];
    protected array $filterable = ['branch_id', 'account_id'];
    protected array $booleanFilters = ['active'];
    protected array $sortable = ['name', 'code', 'active', 'created_at'];
    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:120'],
        'code' => ['nullable', 'string', 'max:40'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'active' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'string', 'max:40'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}
