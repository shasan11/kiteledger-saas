<?php

namespace App\Http\Controllers\Api;

use App\Models\PurchaseOrder;
use App\Models\PurchaseOrderLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PurchaseOrderController extends BaseCrudApiController
{
    protected string $modelClass = PurchaseOrder::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch', 'contact', 'creditTerm', 'currency'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'creditTerm' => 'credit_term_id', 'currency' => 'currency_id'];
    protected array $searchable = ['purchase_order_no', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'currency_id', 'credit_term_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $dateRangeFilters = ['purchase_order_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'purchase_order_no', 'purchase_order_date', 'status', 'total', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'purchaseOrderLines',
            'model' => PurchaseOrderLine::class,
            'foreign_key' => 'purchase_order_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['productVariant', 'taxRate'],
            'relation_details' => ['productVariant' => 'product_variant_id', 'taxRate' => 'tax_rate_id'],
            'rules' => [
                'product_variant_id' => ['nullable', 'uuid', 'exists:product_variants,id'],
                'custom_product_name' => ['nullable', 'string', 'max:180'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'min:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_percent' => ['nullable', 'numeric', 'min:0'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
            'update_rules' => [
                'product_variant_id' => ['nullable', 'uuid', 'exists:product_variants,id'],
                'custom_product_name' => ['nullable', 'string', 'max:180'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'min:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_percent' => ['nullable', 'numeric', 'min:0'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'purchase_order_no' => ['nullable', 'string', 'max:40', 'unique:purchase_orders,purchase_order_no'],
        'purchase_order_date' => ['required', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'credit_term_id' => ['nullable', 'uuid', 'exists:credit_terms,id'],
        'notes' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,confirmed,received,cancelled'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'purchase_order_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:purchase_orders,purchase_order_no,' . $record->id . ',id'],
            'purchase_order_date' => ['sometimes', 'required', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'credit_term_id' => ['sometimes', 'nullable', 'uuid', 'exists:credit_terms,id'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,confirmed,received,cancelled'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $total = (float) $record->purchaseOrderLines()->sum('line_total');
        $record->forceFill(['total' => $total])->save();

        return $record;
    }
}
