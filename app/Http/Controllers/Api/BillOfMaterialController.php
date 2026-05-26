<?php

namespace App\Http\Controllers\Api;

use App\Models\BillOfMaterial;
use App\Models\BillOfMaterialByProduct;
use App\Models\BillOfMaterialExpense;
use App\Models\BillOfMaterialRawMaterial;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class BillOfMaterialController extends BaseCrudApiController
{
    protected string $modelClass = BillOfMaterial::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;
    protected ?string $businessDateColumn = 'date';

    protected array $relations = [
        'branch', 'product', 'approvedBy',
        'rawMaterials.product',
        'byProducts.product',
        'expenses.costTerm',
    ];

    protected array $relationDetails = [
        'branch'   => 'branch_id',
        'product'  => 'product_id',
    ];

    protected array $searchable = ['code', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'product_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'manufacture_on_every_sale'];
    protected array $dateRangeFilters = ['date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['code', 'date', 'status', 'output_quantity', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'raw_materials' => [
            'relation'         => 'rawMaterials',
            'model'            => BillOfMaterialRawMaterial::class,
            'foreign_key'      => 'bill_of_material_id',
            'delete_key'       => 'deleted_raw_material_ids',
            'required'         => false,
            'replace_on_update' => true,
            'relations'        => ['product'],
            'relation_details' => ['product' => 'product_id'],
            'rules' => [
                'product_id'      => ['required', 'uuid', 'exists:products,id'],
                'quantity'        => ['required', 'numeric', 'min:0.0001'],
                'unit_code'       => ['nullable', 'string', 'max:20'],
                'wastage_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'notes'           => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id'      => ['required', 'uuid', 'exists:products,id'],
                'quantity'        => ['required', 'numeric', 'min:0.0001'],
                'unit_code'       => ['nullable', 'string', 'max:20'],
                'wastage_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'notes'           => ['nullable', 'string'],
            ],
        ],
        'by_products' => [
            'relation'         => 'byProducts',
            'model'            => BillOfMaterialByProduct::class,
            'foreign_key'      => 'bill_of_material_id',
            'delete_key'       => 'deleted_by_product_ids',
            'required'         => false,
            'replace_on_update' => true,
            'relations'        => ['product'],
            'relation_details' => ['product' => 'product_id'],
            'rules' => [
                'product_id'   => ['required', 'uuid', 'exists:products,id'],
                'cost_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'quantity'     => ['required', 'numeric', 'min:0.0001'],
                'unit_code'    => ['nullable', 'string', 'max:20'],
                'notes'        => ['nullable', 'string'],
            ],
            'update_rules' => [
                'product_id'   => ['required', 'uuid', 'exists:products,id'],
                'cost_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'quantity'     => ['required', 'numeric', 'min:0.0001'],
                'unit_code'    => ['nullable', 'string', 'max:20'],
                'notes'        => ['nullable', 'string'],
            ],
        ],
        'production_expenses' => [
            'relation'         => 'expenses',
            'model'            => BillOfMaterialExpense::class,
            'foreign_key'      => 'bill_of_material_id',
            'delete_key'       => 'deleted_expense_ids',
            'required'         => false,
            'replace_on_update' => true,
            'relations'        => ['costTerm'],
            'relation_details' => ['costTerm' => 'cost_term_id'],
            'rules' => [
                'cost_term_id' => ['nullable', 'uuid', 'exists:production_cost_terms,id'],
                'amount'       => ['nullable', 'numeric', 'min:0'],
                'notes'        => ['nullable', 'string'],
            ],
            'update_rules' => [
                'cost_term_id' => ['nullable', 'uuid', 'exists:production_cost_terms,id'],
                'amount'       => ['nullable', 'numeric', 'min:0'],
                'notes'        => ['nullable', 'string'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id'                => ['nullable', 'uuid', 'exists:branches,id'],
        'code'                     => ['nullable', 'string', 'max:60'],
        'bom_number'               => ['nullable', 'string', 'max:60'],
        'date'                     => ['required', 'date'],
        'reference'                => ['nullable', 'string', 'max:120'],
        'product_id'               => ['required', 'uuid', 'exists:products,id'],
        'output_quantity'          => ['required', 'numeric', 'min:0.0001'],
        'output_unit_code'         => ['nullable', 'string', 'max:20'],
        'manufacture_on_every_sale' => ['nullable', 'boolean'],
        'notes'                    => ['nullable', 'string'],
        'status'                   => ['nullable', 'in:draft,approved'],
        'active'                   => ['nullable', 'boolean'],
        'approved'                 => ['nullable', 'boolean'],
        'user_add_id'              => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        // Normalise bom_number → code
        if (!empty($parentData['bom_number']) && strtoupper((string) $parentData['bom_number']) !== 'DRAFT') {
            $parentData['code'] = $parentData['bom_number'];
        }
        unset($parentData['bom_number']);

        if (empty($parentData['code']) || strtoupper((string) $parentData['code']) === 'DRAFT') {
            $parentData['code'] = '#draft-bom-' . strtolower((string) Str::uuid());
        }

        // Auto-approve if approved flag is set
        if (!empty($parentData['approved']) || ($parentData['status'] ?? null) === 'approved') {
            $parentData['approved']      = true;
            $parentData['status']        = 'approved';
            $parentData['approved_at']   = now();
            if (empty($parentData['code']) || str_starts_with((string) $parentData['code'], '#draft')) {
                $parentData['code'] = app(\App\Services\DocumentNumberingService::class)->generate('bill_of_material');
            }
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        unset($parentData['bom_number']);

        // Allow approve via PATCH
        if (!empty($parentData['approved']) && !(bool) $record->approved) {
            $parentData['status']        = 'approved';
            $parentData['approved_at']   = $record->approved_at ?: now();
            if (!$record->code || str_starts_with((string) $record->code, '#draft')) {
                $parentData['code'] = app(\App\Services\DocumentNumberingService::class)->generate('bill_of_material');
            }
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data['bom_number'] = $record->code;
        $data['product_id_detail'] = $record->product?->toArray();
        return $data;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ((bool) $record->approved) {
            $this->throwValidation(['status' => ['Approved BOMs cannot be deleted.']]);
        }

        return parent::destroy($request, $id);
    }
}
