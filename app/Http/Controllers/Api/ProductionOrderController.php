<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductionOrder;
use App\Models\ProductionOrderByproduct;
use App\Models\ProductionOrderExpense;
use App\Models\ProductionOrderRawMaterial;
use App\Services\Manufacturing\ProductionCostingService;
use App\Services\Manufacturing\ProductionPostingService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ProductionOrderController extends BaseCrudApiController
{
    public function __construct(
        protected ProductionCostingService $costingService,
        protected ProductionPostingService $postingService,
    ) {
    }

    protected string $modelClass = ProductionOrder::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;
    protected ?string $businessDateColumn = 'date';

    protected array $relations = [
        'branch', 'finishedProduct', 'warehouse', 'productUnit',
        'rawMaterials.product', 'rawMaterials.warehouse', 'rawMaterials.productUnit',
        'byproducts.product', 'byproducts.warehouse', 'byproducts.productUnit',
        'expenses.expenseAccount', 'approvedBy', 'voidedBy', 'userAdd', 'journalVoucher',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'finishedProduct' => 'finished_product_id',
        'warehouse' => 'warehouse_id',
        'productUnit' => 'product_unit_id',
    ];

    protected array $searchable = ['code', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'finished_product_id', 'warehouse_id', 'product_unit_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void', 'is_system_generated', 'stock_posted'];
    protected array $dateRangeFilters = ['date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['code', 'date', 'status', 'output_quantity', 'total_production_cost', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'raw_materials' => [
            'relation' => 'rawMaterials',
            'model' => ProductionOrderRawMaterial::class,
            'foreign_key' => 'production_order_id',
            'delete_key' => 'deleted_raw_material_ids',
            'required' => false,
            'replace_on_update' => true,
            'relations' => ['product', 'warehouse', 'productUnit'],
            'relation_details' => ['product' => 'product_id', 'warehouse' => 'warehouse_id', 'productUnit' => 'product_unit_id'],
            'rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
                'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_cost' => ['nullable', 'numeric', 'min:0'],
                'total_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
                'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_cost' => ['nullable', 'numeric', 'min:0'],
                'total_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
        'byproducts' => [
            'relation' => 'byproducts',
            'model' => ProductionOrderByproduct::class,
            'foreign_key' => 'production_order_id',
            'delete_key' => 'deleted_byproduct_ids',
            'required' => false,
            'replace_on_update' => true,
            'relations' => ['product', 'warehouse', 'productUnit'],
            'relation_details' => ['product' => 'product_id', 'warehouse' => 'warehouse_id', 'productUnit' => 'product_unit_id'],
            'rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
                'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'cost_share_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'allocated_cost' => ['nullable', 'numeric', 'min:0'],
                'unit_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
                'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'cost_share_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'allocated_cost' => ['nullable', 'numeric', 'min:0'],
                'unit_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
        'expenses' => [
            'relation' => 'expenses',
            'model' => ProductionOrderExpense::class,
            'foreign_key' => 'production_order_id',
            'delete_key' => 'deleted_expense_ids',
            'required' => false,
            'replace_on_update' => true,
            'relations' => ['expenseAccount'],
            'relation_details' => ['expenseAccount' => 'expense_account_id'],
            'rules' => [
                'expense_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'name' => ['required', 'string', 'max:120'],
                'amount' => ['required', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'expense_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
                'name' => ['required', 'string', 'max:120'],
                'amount' => ['required', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'code' => ['nullable', 'string', 'max:60'],
        'date' => ['required', 'date'],
        'reference' => ['nullable', 'string', 'max:120'],
        'bill_of_material_id' => ['nullable', 'uuid'],
        'finished_product_id' => ['required', 'uuid', 'exists:products,id'],
        'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
        'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
        'output_quantity' => ['required', 'numeric', 'min:0.0001'],
        'total_raw_material_cost' => ['nullable', 'numeric', 'min:0'],
        'total_expense_cost' => ['nullable', 'numeric', 'min:0'],
        'total_byproduct_cost' => ['nullable', 'numeric', 'min:0'],
        'total_finished_goods_cost' => ['nullable', 'numeric', 'min:0'],
        'total_production_cost' => ['nullable', 'numeric', 'min:0'],
        'finished_goods_unit_cost' => ['nullable', 'numeric', 'min:0'],
        'status' => ['nullable', 'in:draft,approved,released,in_progress,partially_produced,completed,void,cancelled'],
        'approved' => ['nullable', 'boolean'],
        'void' => ['nullable', 'boolean'],
        'voided_reason' => ['nullable', 'string', 'max:500'],
        'notes' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        if (empty($parentData['code']) || strtoupper((string) $parentData['code']) === 'DRAFT') {
            $parentData['code'] = '#draft-production-order-' . strtolower((string) Str::uuid());
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (((bool) $record->approved || $record->status !== 'draft') && $this->hasProtectedEdit($parentData, $nestedData)) {
            $this->throwValidation(['status' => ['Approved production orders cannot be edited directly. Void and recreate if required.']]);
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $record = $this->costingService->syncLineCosts($record->fresh(['rawMaterials', 'expenses', 'byproducts']));

        if ($this->shouldApprove($record, $parentData)) {
            return $this->postingService->approve($record, request()->user()?->getAuthIdentifier());
        }

        return $record->fresh($this->validEagerLoadRelations($record));
    }

    public function transactionApprove(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        return response()->json($this->serializeRecord($this->postingService->approve($record, $request->user()?->getAuthIdentifier())));
    }

    public function transactionVoid(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $data = $this->validateCompat($request->all(), [
            'voided_reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        return response()->json($this->serializeRecord($this->postingService->void($record, $data['voided_reason'], $request->user()?->getAuthIdentifier())));
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ((bool) $record->approved || $record->status !== 'draft') {
            $this->throwValidation(['status' => ['Approved production orders cannot be hard deleted. Void them instead.']]);
        }

        return parent::destroy($request, $id);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['production_order_no'] = $record->code;
        $data['production_order_lines'] = $data['raw_materials'] ?? [];
        $data['raw_material_lines'] = $data['raw_materials'] ?? [];
        $data['output_lines'] = array_merge([
            [
                'product_id' => $record->finished_product_id,
                'product' => $record->finishedProduct?->toArray(),
                'qty' => $record->output_quantity,
                'planned_qty' => $record->output_quantity,
                'produced_qty' => $record->approved ? $record->output_quantity : 0,
                'accepted_qty' => $record->approved ? $record->output_quantity : 0,
                'unit_code' => $record->productUnit?->name,
                'unit_cost' => $record->finished_goods_unit_cost,
            ],
        ], $data['byproducts'] ?? []);
        $data['stock_posting_status'] = (bool) $record->void ? 'Voided' : ((bool) $record->approved ? 'Approved — Pending Journal' : 'Draft');

        return $data;
    }

    protected function shouldApprove(Model $record, array $parentData): bool
    {
        if ((bool) $record->approved || (bool) $record->void) {
            return false;
        }

        return ($parentData['status'] ?? null) === 'approved'
            || ($parentData['status'] ?? null) === 'completed'
            || (array_key_exists('approved', $parentData) && (bool) $parentData['approved']);
    }

    protected function hasProtectedEdit(array $parentData, array $nestedData): bool
    {
        $allowed = ['approved', 'approved_at', 'approved_by_id', 'status', 'void', 'voided_reason', 'voided_at', 'voided_by_id'];

        return !empty(array_diff(array_keys($parentData), $allowed)) || !empty($nestedData);
    }
}
