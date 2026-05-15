<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\ProductVariantItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends BaseCrudApiController
{
    protected string $modelClass = Product::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'parent',
        'productCategory',
        'productTaxCategory',
        'productUnit',
        'taxClass',
        'salesAccount',
        'purchaseAccount',
        'salesReturnAccount',
        'purchaseReturnAccount',
        'productVariantItems',
        'productVariantItems.variantLine',
        'productVariantItems.variantLine.variant',
        'warehouseItems',
        'warehouseItems.warehouse',
    ];

    protected array $relationDetails = [
        'parent' => 'parent_id',
        'productCategory' => 'product_category_id',
        'productTaxCategory' => 'product_tax_category_id',
        'productUnit' => 'product_unit_id',
        'taxClass' => 'tax_class_id',
        'salesAccount' => 'sales_account_id',
        'purchaseAccount' => 'purchase_account_id',
        'salesReturnAccount' => 'sales_return_account_id',
        'purchaseReturnAccount' => 'purchase_return_account_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'sku',
        'barcode',
        'description',
        'productCategory.name',
        'productTaxCategory.name',
        'productUnit.name',
        'taxClass.name',
    ];

    protected array $filterable = [
        'parent_id',
        'product_category_id',
        'product_tax_category_id',
        'product_unit_id',
        'tax_class_id',
        'product_type',
        'valuation_method',
    ];

    protected array $booleanFilters = [
        'active',
        'track_inventory',
        'allow_sale',
        'allow_purchase',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'sku',
        'barcode',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'parent_id' => ['nullable', 'uuid', 'exists:products,id'],
        'product_category_id' => ['nullable', 'uuid', 'exists:product_categories,id'],
        'product_tax_category_id' => ['nullable', 'uuid', 'exists:product_tax_categories,id'],
        'name' => ['required', 'string', 'max:180'],
        'code' => ['nullable', 'string', 'max:60'],
        'sku' => ['nullable', 'string', 'max:80'],
        'barcode' => ['nullable', 'string', 'max:80'],
        'description' => ['nullable', 'string'],
        'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
        'tax_class_id' => ['nullable', 'uuid', 'exists:tax_classes,id'],
        'product_type' => ['nullable', 'in:simple,variant_parent,variant'],
        'sales_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'purchase_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'sales_return_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'purchase_return_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'valuation_method' => ['nullable', 'in:standard,average_cost,first_in_first_out,last_in_first_out'],
        'reorder_level' => ['nullable', 'numeric', 'min:0'],
        'purchase_price' => ['nullable', 'numeric', 'min:0'],
        'selling_price' => ['nullable', 'numeric', 'min:0'],
        'track_inventory' => ['nullable', 'boolean'],
        'allow_sale' => ['nullable', 'boolean'],
        'allow_purchase' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        'variant_items' => ['nullable', 'array'],
        'variant_items.*.id' => ['nullable', 'uuid', 'exists:product_variant_items,id'],
        'variant_items.*.variant_line_id' => ['required', 'uuid', 'exists:variant_lines,id'],
        'deleted_variant_item_ids' => ['nullable', 'array'],
        'deleted_variant_item_ids.*' => ['uuid', 'exists:product_variant_items,id'],
    ];

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $input = $this->prepareProductPayload(
            $this->prepareIncomingPayload($request->all())
        );
        $input = $this->applyBranchToCreatePayload($input, $request);

        $validated = $this->validateCompat($input, $this->rulesForStore($request));

        $record = DB::transaction(function () use ($validated) {
            $variantItems = $validated['variant_items'] ?? [];

            unset($validated['variant_items'], $validated['deleted_variant_item_ids']);

            $product = Product::create($validated);
            $this->syncVariantItems($product, $variantItems, []);

            return $product->fresh($this->relations);
        });

        return response()->json($this->serializeRecord($record), 201);
    }

    public function update(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $input = $this->prepareProductPayload(
            $this->prepareIncomingPayload($request->all())
        );
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);

        $validated = $this->validateCompat($input, $this->rulesForUpdate($request, $record));

        $record = DB::transaction(function () use ($record, $validated) {
            $variantItems = $validated['variant_items'] ?? [];
            $deletedVariantItemIds = $validated['deleted_variant_item_ids'] ?? [];

            unset($validated['variant_items'], $validated['deleted_variant_item_ids']);

            $record->update($validated);
            $this->syncVariantItems($record, $variantItems, $deletedVariantItemIds);

            return $record->fresh($this->relations);
        });

        return response()->json($this->serializeRecord($record));
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($categoryId = $this->requestParam($request, 'category_id')) {
            $query->where('product_category_id', $categoryId);
        }

        if ($variantGroupId = $this->requestParam($request, 'variant_group_id')) {
            $query->whereHas('productVariantItems.variantLine', fn (Builder $variantLine) => $variantLine->where('variant_id', $variantGroupId));
        }
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    private function prepareProductPayload(array $data): array
    {
        $legacyProductTypes = [
            'goods' => 'simple',
            'services' => 'simple',
            'service' => 'simple',
            'composite' => 'variant_parent',
        ];

        if (isset($data['product_type'], $legacyProductTypes[$data['product_type']])) {
            $data['product_type'] = $legacyProductTypes[$data['product_type']];
        }

        $legacyValuationMethods = [
            'fifo' => 'first_in_first_out',
            'lifo' => 'last_in_first_out',
            'weighted_average' => 'average_cost',
        ];

        if (isset($data['valuation_method'], $legacyValuationMethods[$data['valuation_method']])) {
            $data['valuation_method'] = $legacyValuationMethods[$data['valuation_method']];
        }

        if (isset($data['variants']) && is_array($data['variants']) && !isset($data['variant_items'])) {
            $data['variant_items'] = collect($data['variants'])
                ->flatMap(fn ($variant) => is_array($variant) ? ($variant['items'] ?? []) : [])
                ->values()
                ->all();
        }

        unset($data['variants'], $data['deleted_variant_ids']);

        if (!isset($data['variant_items']) || !is_array($data['variant_items'])) {
            return $data;
        }

        $data['variant_items'] = collect($data['variant_items'])
            ->filter(fn ($row) => is_array($row))
            ->map(function (array $row) {
                $row['variant_line_id'] = $this->extractId($row['variant_line_id'] ?? null);

                unset(
                    $row['variantLine'],
                    $row['variant_line'],
                    $row['variant_line_id_detail'],
                    $row['created_at'],
                    $row['updated_at'],
                    $row['deleted_at']
                );

                return $row;
            })
            ->values()
            ->all();

        return $data;
    }

    private function extractId(mixed $value): mixed
    {
        if (is_array($value)) {
            return $value['id'] ?? $value['value'] ?? null;
        }

        return $value ?: null;
    }

    private function syncVariantItems(
        Product $product,
        array $variantItems,
        array $deletedVariantItemIds
    ): void {
        if ($deletedVariantItemIds) {
            ProductVariantItem::query()
                ->where('product_id', $product->id)
                ->whereIn('id', $deletedVariantItemIds)
                ->delete();
        }

        foreach ($variantItems as $row) {
            $variantLineId = $row['variant_line_id'] ?? null;

            if (!$variantLineId) {
                continue;
            }

            $item = !empty($row['id'])
                ? ProductVariantItem::query()
                    ->where('product_id', $product->id)
                    ->where('id', $row['id'])
                    ->firstOrFail()
                : new ProductVariantItem(['product_id' => $product->id]);

            $item->fill(['variant_line_id' => $variantLineId]);
            $item->product_id = $product->id;
            $item->save();
        }
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        if ($record->tax_class_id) {
            $taxRate = \App\Models\TaxRate::where('tax_class_id', $record->tax_class_id)
                ->where('active', true)
                ->orderBy('name')
                ->first();
            $data['default_tax_rate'] = $taxRate ? $taxRate->toArray() : null;
        } else {
            $data['default_tax_rate'] = null;
        }

        $items = $record->productVariantItems ?? collect();

        $variantOptions = $items
            ->map(function ($item) {
                $variantLine = $item->variantLine;
                $variantGroup = $variantLine?->variant;

                return [
                    'id' => $item->id,
                    'variant_line_id' => $variantLine?->id,
                    'variant_line_value' => $variantLine?->value,
                    'variant_id' => $variantGroup?->id,
                    'variant_name' => $variantGroup?->name,
                    'label' => trim(($variantGroup?->name ? $variantGroup->name . ': ' : '') . ($variantLine?->value ?? '')),
                ];
            })
            ->values()
            ->all();

        $optionLabel = collect($variantOptions)
            ->pluck('label')
            ->filter()
            ->implode(' / ');

        $data['sales_variants'] = [[
            'id' => $record->id,
            'product_id' => $record->id,
            'product_name' => $record->name,
            'product_code' => $record->code,
            'barcode' => $record->barcode,
            'variant_name' => $record->name,
            'sku' => $record->sku,
            'option_label' => $optionLabel,
            'product_unit_id' => $record->product_unit_id,
            'product_unit' => $record->productUnit,
            'tax_class_id' => $record->tax_class_id,
            'tax_class' => $record->taxClass,
            'purchase_price' => (float) $record->purchase_price,
            'selling_price' => (float) $record->selling_price,
            'track_inventory' => (bool) $record->track_inventory,
            'active' => (bool) $record->active,
            'variant_options' => $variantOptions,
            'label' => trim($record->name . ($optionLabel ? ' - ' . $optionLabel : '')),
            'value' => $record->id,
        ]];

        $data['sales_attributes'] = [
            'product_id' => $record->id,
            'product_name' => $record->name,
            'product_code' => $record->code,
            'barcode' => $record->barcode,
            'product_category_id' => $record->product_category_id,
            'product_unit_id' => $record->product_unit_id,
            'tax_class_id' => $record->tax_class_id,
            'track_inventory' => (bool) $record->track_inventory,
            'active' => (bool) $record->active,
            'variants' => $data['sales_variants'],
        ];

        return $data;
    }
}
