<?php

namespace App\Http\Controllers\Api;

use App\Models\WarehouseTransfer;
use App\Models\WarehouseTransferLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class WarehouseTransferController extends BaseCrudApiController
{
    protected string $modelClass = WarehouseTransfer::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch', 'fromWarehouse', 'toWarehouse'];
    protected array $relationDetails = ['branch' => 'branch_id', 'fromWarehouse' => 'from_warehouse_id', 'toWarehouse' => 'to_warehouse_id'];
    protected array $searchable = ['transfer_no', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'from_warehouse_id', 'to_warehouse_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $dateRangeFilters = ['transfer_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id','transfer_no','transfer_date','status','created_at','updated_at'];
    protected string $defaultSort = '-created_at';
    protected array $nested = [
        'items' => [
            'relation' => 'warehouseTransferLines',
            'model' => WarehouseTransferLine::class,
            'foreign_key' => 'warehouse_transfer_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['productVariant'],
            'relation_details' => ['productVariant' => 'product_variant_id'],
            'rules' => [
                'product_variant_id' => ['required','uuid','exists:product_variants,id'],
                'qty' => ['required','numeric','min:0.0001'],
                'remarks' => ['nullable','string','max:200'],
            ],
            'update_rules' => [
                'product_variant_id' => ['required','uuid','exists:product_variants,id'],
                'qty' => ['required','numeric','min:0.0001'],
                'remarks' => ['nullable','string','max:200'],
            ],
        ],
    ];
    protected array $storeRules = [
        'branch_id' => ['nullable','uuid','exists:branches,id'],
        'transfer_no' => ['required','string','max:40','unique:warehouse_transfers,transfer_no'],
        'transfer_date' => ['required','date'],
        'from_warehouse_id' => ['required','uuid','exists:warehouses,id'],
        'to_warehouse_id' => ['required','uuid','exists:warehouses,id','different:from_warehouse_id'],
        'notes' => ['nullable','string'],
        'status' => ['nullable','in:draft,posted,cancelled'],
    ];
    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes','nullable','uuid','exists:branches,id'],
            'transfer_no' => ['sometimes','required','string','max:40','unique:warehouse_transfers,transfer_no,'.$record->id.',id'],
            'transfer_date' => ['sometimes','required','date'],
            'from_warehouse_id' => ['sometimes','required','uuid','exists:warehouses,id'],
            'to_warehouse_id' => ['sometimes','required','uuid','exists:warehouses,id','different:from_warehouse_id'],
            'notes' => ['sometimes','nullable','string'],
            'status' => ['sometimes','nullable','in:draft,posted,cancelled'],
        ];
    }
}
