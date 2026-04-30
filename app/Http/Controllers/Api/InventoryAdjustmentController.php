<?php

namespace App\Http\Controllers\Api;

use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class InventoryAdjustmentController extends BaseCrudApiController
{
    protected string $modelClass = InventoryAdjustment::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch','warehouse'];
    protected array $relationDetails = ['branch'=>'branch_id','warehouse'=>'warehouse_id'];
    protected array $searchable = ['adjustment_no','reason','notes','status'];
    protected array $filterable = ['branch_id','warehouse_id','status'];
    protected array $booleanFilters = ['active','approved','void'];
    protected array $dateRangeFilters = ['adjustment_date'=>['from'=>'date_from','to'=>'date_to']];
    protected array $sortable = ['id','adjustment_no','adjustment_date','status','total','created_at'];
    protected string $defaultSort = '-created_at';
    protected array $nested = ['items'=>[
        'relation'=>'inventoryAdjustmentLines','model'=>InventoryAdjustmentLine::class,'foreign_key'=>'inventory_adjustment_id','delete_key'=>'deleted_item_ids','required'=>true,'min'=>1,'replace_on_update'=>false,
        'relations'=>['productVariant'],'relation_details'=>['productVariant'=>'product_variant_id'],
        'rules'=>['product_variant_id'=>['required','uuid','exists:product_variants,id'],'adjustment_type'=>['required','in:increase,decrease'],'qty'=>['required','numeric','min:0.0001'],'unit_cost'=>['nullable','numeric','min:0'],'remarks'=>['nullable','string','max:200'],'active'=>['nullable','boolean']],
        'update_rules'=>['product_variant_id'=>['required','uuid','exists:product_variants,id'],'adjustment_type'=>['required','in:increase,decrease'],'qty'=>['required','numeric','min:0.0001'],'unit_cost'=>['nullable','numeric','min:0'],'remarks'=>['nullable','string','max:200'],'active'=>['nullable','boolean']],
    ]];
    protected array $storeRules = ['branch_id'=>['nullable','uuid','exists:branches,id'],'adjustment_no'=>['required','string','max:40','unique:inventory_adjustments,adjustment_no'],'adjustment_date'=>['required','date'],'warehouse_id'=>['required','uuid','exists:warehouses,id'],'reason'=>['nullable','string','max:150'],'notes'=>['nullable','string'],'status'=>['nullable','in:draft,posted,cancelled']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id'=>['sometimes','nullable','uuid','exists:branches,id'],'adjustment_no'=>['sometimes','required','string','max:40','unique:inventory_adjustments,adjustment_no,'.$record->id.',id'],'adjustment_date'=>['sometimes','required','date'],'warehouse_id'=>['sometimes','required','uuid','exists:warehouses,id'],'reason'=>['sometimes','nullable','string','max:150'],'notes'=>['sometimes','nullable','string'],'status'=>['sometimes','nullable','in:draft,posted,cancelled']]; }
    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $total = $record->inventoryAdjustmentLines()->get()->sum(fn ($i) => (float) $i->qty * (float) ($i->unit_cost ?? 0));
        $record->forceFill(['total' => $total])->save();
        return $record;
    }
}
