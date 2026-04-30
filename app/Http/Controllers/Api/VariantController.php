<?php

namespace App\Http\Controllers\Api;

use App\Models\Variant;
use App\Models\VariantLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class VariantController extends BaseCrudApiController
{
    protected string $modelClass = Variant::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $searchable = ['name'];
    protected array $filterable = ['branch_id', 'active'];
    protected array $booleanFilters = ['active'];
    protected array $sortable = ['id', 'name', 'active', 'created_at'];
    protected string $defaultSort = '-created_at';
    protected array $nested = [
        'items' => [
            'relation' => 'variantLines',
            'model' => VariantLine::class,
            'foreign_key' => 'variant_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'value' => ['required', 'string', 'max:80'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'value' => ['required', 'string', 'max:80'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];
    protected array $storeRules = ['branch_id'=>['nullable','uuid','exists:branches,id'],'name'=>['required','string','max:80'],'active'=>['nullable','boolean'],'is_system_generated'=>['nullable','boolean'],'user_add_id'=>['nullable','integer','exists:users,id']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id'=>['sometimes','nullable','uuid','exists:branches,id'],'name'=>['sometimes','required','string','max:80'],'active'=>['sometimes','nullable','boolean'],'is_system_generated'=>['sometimes','nullable','boolean'],'user_add_id'=>['sometimes','nullable','integer','exists:users,id']]; }
}
