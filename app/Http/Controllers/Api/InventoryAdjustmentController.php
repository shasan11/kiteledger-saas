<?php

namespace App\Http\Controllers\Api;

use App\Models\InventoryAdjustment;
use App\Models\InventoryAdjustmentLine;
use App\Services\Inventory\WarehouseStockService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class InventoryAdjustmentController extends BaseCrudApiController
{
    public function __construct(protected WarehouseStockService $warehouseStockService)
    {
    }

    protected string $modelClass = InventoryAdjustment::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;
    protected ?string $businessDateColumn = 'adjustment_date';
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
        'relations'=>['product','product.productUnit'],'relation_details'=>['product'=>'product_id'],
        'rules'=>['product_id'=>['required','uuid','exists:products,id'],'adjustment_type'=>['required','in:increase,decrease'],'qty'=>['required','numeric','min:0.0001'],'unit_cost'=>['nullable','numeric','min:0'],'remarks'=>['nullable','string','max:200'],'active'=>['nullable','boolean']],
        'update_rules'=>['product_id'=>['required','uuid','exists:products,id'],'adjustment_type'=>['required','in:increase,decrease'],'qty'=>['required','numeric','min:0.0001'],'unit_cost'=>['nullable','numeric','min:0'],'remarks'=>['nullable','string','max:200'],'active'=>['nullable','boolean']],
    ]];
    protected array $storeRules = ['branch_id'=>['nullable','uuid','exists:branches,id'],'adjustment_no'=>['nullable','string','max:40','unique:inventory_adjustments,adjustment_no'],'adjustment_date'=>['required','date'],'warehouse_id'=>['required','uuid','exists:warehouses,id'],'reason'=>['nullable','string','max:150'],'notes'=>['nullable','string'],'status'=>['nullable','in:draft,posted,cancelled']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id'=>['sometimes','nullable','uuid','exists:branches,id'],'adjustment_no'=>['sometimes','required','string','max:40','unique:inventory_adjustments,adjustment_no,'.$record->id.',id'],'adjustment_date'=>['sometimes','required','date'],'warehouse_id'=>['sometimes','required','uuid','exists:warehouses,id'],'reason'=>['sometimes','nullable','string','max:150'],'notes'=>['sometimes','nullable','string'],'status'=>['sometimes','nullable','in:draft,posted,cancelled']]; }
    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $total = $record->inventoryAdjustmentLines()->get()->sum(fn ($i) => (float) $i->qty * (float) ($i->unit_cost ?? 0));
        $record->forceFill(['total' => $total])->save();

        return $record;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ((bool) $record->stock_posted || $record->status === 'posted') {
            $this->throwValidation([
                'status' => ['Posted inventory adjustments cannot be deleted.'],
            ]);
        }

        return parent::destroy($request, $id);
    }

    public function bulkDestroy(Request $request)
    {
        $ids = $request->input('ids', []);

        if (is_array($ids) && InventoryAdjustment::query()->whereIn('id', $ids)->where(function ($query) {
            $query->where('stock_posted', true)->orWhere('status', 'posted');
        })->exists()) {
            $this->throwValidation([
                'status' => ['Posted inventory adjustments cannot be deleted.'],
            ]);
        }

        return parent::bulkDestroy($request);
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if ($this->requestsDirectPosting($parentData)) {
            $this->throwValidation([
                'status' => ['Use the approve/post action to post inventory adjustments.'],
            ]);
        }

        if (((bool) $record->stock_posted || $record->status === 'posted') && $this->hasProtectedEdit($parentData, $nestedData)) {
            $this->throwValidation([
                'status' => ['Posted inventory adjustments cannot be edited.'],
            ]);
        }

        if (
            ((isset($parentData['status']) && $parentData['status'] === 'cancelled') || (isset($parentData['void']) && (bool) $parentData['void']))
            && ((bool) $record->stock_posted || $record->status === 'posted')
        ) {
            $this->throwValidation([
                'status' => ['Posted inventory adjustments cannot be cancelled or voided.'],
            ]);
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        if ($this->requestsDirectPosting($parentData)) {
            $this->throwValidation([
                'status' => ['New inventory adjustments must be saved as draft first. Use approve/post after saving.'],
            ]);
        }

        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $parentData['adjustment_no'] = $parentData['adjustment_no'] ?? $this->draftAdjustmentNo();

        return $parentData;
    }

    private function draftAdjustmentNo(): string
    {
        do {
            $number = 'DRAFT-IA-' . now()->format('YmdHis') . '-' . random_int(100, 999);
        } while (InventoryAdjustment::query()->where('adjustment_no', $number)->exists());

        return $number;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['items'] = $data['items'] ?? $data['inventory_adjustment_lines'] ?? [];
        $data['stock_posting_status'] = $record->status === 'cancelled'
            ? 'Cancelled/Void'
            : ((bool) $record->stock_posted ? 'Posted to Warehouse Stock' : 'Draft');

        return $data;
    }

    protected function requestsDirectPosting(array $parentData): bool
    {
        return ($parentData['status'] ?? null) === 'posted'
            || (array_key_exists('approved', $parentData) && (bool) $parentData['approved']);
    }

    protected function hasProtectedEdit(array $parentData, array $nestedData): bool
    {
        $allowedParentKeys = ['approved', 'approved_at', 'approved_by_id', 'status', 'void', 'voided_reason', 'voided_at', 'voided_by_id'];
        $protectedParent = array_diff(array_keys($parentData), $allowedParentKeys);

        return !empty($protectedParent) || !empty($nestedData);
    }
}
