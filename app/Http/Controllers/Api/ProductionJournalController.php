<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductionJournal;
use App\Models\ProductionJournalByProduct;
use App\Models\ProductionJournalExpense;
use App\Models\ProductionJournalRawMaterial;
use App\Services\Inventory\ProductionPostingService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductionJournalController extends BaseCrudApiController
{
    public function __construct(protected ProductionPostingService $productionPostingService)
    {
    }

    protected string $modelClass = ProductionJournal::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = [
        'branch',
        'warehouse',
        'finishedProduct',
        'rawMaterials.product',
        'productionExpenses.costTerm',
        'byProducts.product',
        'journalVoucher',
    ];
    protected array $relationDetails = [
        'branch' => 'branch_id',
        'warehouse' => 'warehouse_id',
        'finishedProduct' => 'finished_product_id',
    ];
    protected array $searchable = ['code', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'warehouse_id', 'finished_product_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void', 'stock_posted'];
    protected array $dateRangeFilters = ['date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['code', 'date', 'status', 'raw_material_cost', 'finished_goods_cost', 'cost_per_unit', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'raw_materials' => [
            'relation' => 'rawMaterials',
            'model' => ProductionJournalRawMaterial::class,
            'foreign_key' => 'production_journal_id',
            'delete_key' => 'deleted_raw_material_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => true,
            'relations' => ['product'],
            'relation_details' => ['product' => 'product_id'],
            'rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_code' => ['nullable', 'string', 'max:20'],
                'rate' => ['nullable', 'numeric', 'min:0'],
                'amount' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_code' => ['nullable', 'string', 'max:20'],
                'rate' => ['nullable', 'numeric', 'min:0'],
                'amount' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
        'production_expenses' => [
            'relation' => 'productionExpenses',
            'model' => ProductionJournalExpense::class,
            'foreign_key' => 'production_journal_id',
            'delete_key' => 'deleted_production_expense_ids',
            'required' => false,
            'replace_on_update' => true,
            'relations' => ['costTerm'],
            'relation_details' => ['costTerm' => 'cost_term_id'],
            'rules' => [
                'cost_term_id' => ['nullable', 'uuid', 'exists:production_cost_terms,id'],
                'amount' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'cost_term_id' => ['nullable', 'uuid', 'exists:production_cost_terms,id'],
                'amount' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
        'by_products' => [
            'relation' => 'byProducts',
            'model' => ProductionJournalByProduct::class,
            'foreign_key' => 'production_journal_id',
            'delete_key' => 'deleted_by_product_ids',
            'required' => false,
            'replace_on_update' => true,
            'relations' => ['product'],
            'relation_details' => ['product' => 'product_id'],
            'rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'cost_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_code' => ['nullable', 'string', 'max:20'],
                'allocated_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id' => ['required', 'uuid', 'exists:products,id'],
                'cost_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'quantity' => ['required', 'numeric', 'min:0.0001'],
                'unit_code' => ['nullable', 'string', 'max:20'],
                'allocated_cost' => ['nullable', 'numeric', 'min:0'],
                'notes' => ['nullable', 'string'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'code' => ['nullable', 'string', 'max:60'],
        'date' => ['required', 'date'],
        'reference' => ['nullable', 'string', 'max:120'],
        'finished_product_id' => ['required', 'uuid', 'exists:products,id'],
        'output_quantity' => ['required', 'numeric', 'min:0.0001'],
        'output_unit_code' => ['nullable', 'string', 'max:20'],
        'warehouse_id' => ['required', 'uuid', 'exists:warehouses,id'],
        'raw_material_cost' => ['nullable', 'numeric', 'min:0'],
        'production_expense_amount' => ['nullable', 'numeric', 'min:0'],
        'total_cost_of_production' => ['nullable', 'numeric', 'min:0'],
        'by_product_allocated_cost' => ['nullable', 'numeric', 'min:0'],
        'finished_goods_cost' => ['nullable', 'numeric', 'min:0'],
        'cost_per_unit' => ['nullable', 'numeric', 'min:0'],
        'notes' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,posted,cancelled'],
        'approved' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'code' => ['sometimes', 'nullable', 'string', 'max:60', 'unique:production_journals,code,' . $record->id . ',id'],
            'date' => ['sometimes', 'required', 'date'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'finished_product_id' => ['sometimes', 'required', 'uuid', 'exists:products,id'],
            'output_quantity' => ['sometimes', 'required', 'numeric', 'min:0.0001'],
            'output_unit_code' => ['sometimes', 'nullable', 'string', 'max:20'],
            'warehouse_id' => ['sometimes', 'required', 'uuid', 'exists:warehouses,id'],
            'raw_material_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'production_expense_amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'total_cost_of_production' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'by_product_allocated_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'finished_goods_cost' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'cost_per_unit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        if (empty($parentData['code']) || strtoupper((string) $parentData['code']) === 'DRAFT') {
            $parentData['code'] = '#draft-production-journal-' . strtolower((string) \Illuminate\Support\Str::uuid());
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (((bool) $record->stock_posted || $record->status === 'posted') && $this->hasProtectedEdit($parentData, $nestedData)) {
            $this->throwValidation([
                'status' => ['Posted production journals cannot be edited. Void and recreate the production journal.'],
            ]);
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $this->recalculateDraftTotals($record);

        if ($this->shouldPost($record, $parentData)) {
            return $this->productionPostingService->post($record);
        }

        return $record->fresh($this->validEagerLoadRelations($record));
    }

    public function transactionApprove(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        return response()->json($this->serializeRecord($this->productionPostingService->post($record)));
    }

    public function transactionVoid(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $data = $this->validateCompat($request->all(), [
            'voided_reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        return response()->json($this->serializeRecord(
            $this->productionPostingService->reverse($record, $data['voided_reason'], $request->user()?->getAuthIdentifier())
        ));
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ((bool) $record->stock_posted || $record->status === 'posted') {
            $this->throwValidation([
                'status' => ['Posted production journals cannot be deleted. Void them to reverse stock and accounting.'],
            ]);
        }

        return parent::destroy($request, $id);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['items'] = $data['raw_materials'] ?? [];
        $data['finished_product_name'] = $record->finishedProduct?->name;
        $data['finished_product_code'] = $record->finishedProduct?->sku ?? $record->finishedProduct?->code;
        $data['warehouse_name'] = $record->warehouse?->name;
        $data['stock_posting_status'] = (bool) $record->void
            ? 'Voided/Reversed'
            : ((bool) $record->stock_posted ? 'Posted to Warehouse Stock' : 'Draft');

        return $data;
    }

    protected function shouldPost(Model $record, array $parentData): bool
    {
        if ((bool) $record->stock_posted || (bool) $record->void) {
            return false;
        }

        return ($parentData['status'] ?? $record->status) === 'posted'
            || (array_key_exists('approved', $parentData) && (bool) $parentData['approved']);
    }

    protected function hasProtectedEdit(array $parentData, array $nestedData): bool
    {
        $allowedParentKeys = ['approved', 'approved_at', 'approved_by_id', 'status', 'void', 'voided_reason', 'voided_at', 'voided_by_id'];

        return !empty(array_diff(array_keys($parentData), $allowedParentKeys)) || !empty($nestedData);
    }

    protected function recalculateDraftTotals(Model $record): void
    {
        $record->loadMissing(['rawMaterials', 'productionExpenses', 'byProducts']);

        if ((bool) $record->stock_posted) {
            return;
        }

        $rawMaterialCost = $record->rawMaterials->sum(fn ($line) => (float) $line->quantity * (float) $line->rate);
        $productionExpenseAmount = $record->productionExpenses->sum(fn ($line) => (float) $line->amount);
        $totalCost = $rawMaterialCost + $productionExpenseAmount;
        $byProductCost = $record->byProducts->sum(fn ($line) => $totalCost * ((float) $line->cost_percent / 100));
        $finishedCost = max($totalCost - $byProductCost, 0);
        $outputQty = (float) $record->output_quantity;

        $record->forceFill([
            'raw_material_cost' => round($rawMaterialCost, 6),
            'production_expense_amount' => round($productionExpenseAmount, 6),
            'total_cost_of_production' => round($totalCost, 6),
            'by_product_allocated_cost' => round($byProductCost, 6),
            'finished_goods_cost' => round($finishedCost, 6),
            'cost_per_unit' => $outputQty > 0 ? round($finishedCost / $outputQty, 6) : 0,
        ])->saveQuietly();
    }
}
