<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\ProductVariantItem;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ProductController extends BaseCrudApiController
{
    protected string $modelClass = Product::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'productCategory',
        'productUnit',
        'taxClass',
        'productVariants',
        'productVariants.productUnit',
        'productVariants.productVariantItems',
        'productVariants.productVariantItems.variantLine',
        'productVariants.productVariantItems.variantLine.variant',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'productCategory' => 'product_category_id',
        'productUnit' => 'product_unit_id',
        'taxClass' => 'tax_class_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'barcode',
        'description',
        'productCategory.name',
        'productUnit.name',
        'taxClass.name',
    ];

    protected array $filterable = [
        'branch_id',
        'product_category_id',
        'product_unit_id',
        'tax_class_id',
    ];

    protected array $booleanFilters = [
        'active',
        'track_inventory',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'barcode',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'product_category_id' => ['nullable', 'uuid', 'exists:product_categories,id'],
        'name' => ['required', 'string', 'max:180'],
        'code' => ['nullable', 'string', 'max:60'],
        'barcode' => ['nullable', 'string', 'max:80'],
        'description' => ['nullable', 'string'],
        'product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
        'tax_class_id' => ['nullable', 'uuid', 'exists:tax_classes,id'],
        'track_inventory' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],

        'variants' => ['nullable', 'array'],
        'variants.*.id' => ['nullable', 'uuid', 'exists:product_variants,id'],
        'variants.*.name' => ['nullable', 'string', 'max:180'],
        'variants.*.sku' => ['nullable', 'string', 'max:80'],
        'variants.*.product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
        'variants.*.purchase_price' => ['nullable', 'numeric', 'min:0'],
        'variants.*.selling_price' => ['nullable', 'numeric', 'min:0'],
        'variants.*.active' => ['nullable', 'boolean'],
        'variants.*.is_system_generated' => ['nullable', 'boolean'],
        'variants.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],

        'variants.*.items' => ['nullable', 'array'],
        'variants.*.items.*.id' => ['nullable', 'uuid', 'exists:product_variant_items,id'],
        'variants.*.items.*.variant_line_id' => ['required', 'uuid', 'exists:variant_lines,id'],

        'deleted_variant_ids' => ['nullable', 'array'],
        'deleted_variant_ids.*' => ['uuid', 'exists:product_variants,id'],

        'deleted_variant_item_ids' => ['nullable', 'array'],
        'deleted_variant_item_ids.*' => ['uuid', 'exists:product_variant_items,id'],
    ];

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->prepareProductPayload($input);
        $input = $this->applyBranchToCreatePayload($input, $request);

        $validated = $this->validateCompat($input, $this->rulesForStore($request));

        $record = DB::transaction(function () use ($validated) {
            $variants = $validated['variants'] ?? [];

            unset(
                $validated['variants'],
                $validated['deleted_variant_ids'],
                $validated['deleted_variant_item_ids']
            );

            $product = Product::create($validated);

            $this->syncVariants($product, $variants, [], []);

            return $product->fresh($this->relations);
        });

        return response()->json($this->serializeRecord($record), 201);
    }

    public function update(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->prepareProductPayload($input);
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);

        $validated = $this->validateCompat($input, $this->rulesForUpdate($request, $record));

        $record = DB::transaction(function () use ($record, $validated) {
            $variants = $validated['variants'] ?? [];
            $deletedVariantIds = $validated['deleted_variant_ids'] ?? [];
            $deletedVariantItemIds = $validated['deleted_variant_item_ids'] ?? [];

            unset(
                $validated['variants'],
                $validated['deleted_variant_ids'],
                $validated['deleted_variant_item_ids']
            );

            $record->update($validated);

            $this->syncVariants(
                $record,
                $variants,
                $deletedVariantIds,
                $deletedVariantItemIds
            );

            return $record->fresh($this->relations);
        });

        return response()->json($this->serializeRecord($record));
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'product_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:60'],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string'],
            'product_unit_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_units,id'],
            'tax_class_id' => ['sometimes', 'nullable', 'uuid', 'exists:tax_classes,id'],
            'track_inventory' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],

            'variants' => ['sometimes', 'array'],
            'variants.*.id' => ['nullable', 'uuid', 'exists:product_variants,id'],
            'variants.*.name' => ['nullable', 'string', 'max:180'],
            'variants.*.sku' => ['nullable', 'string', 'max:80'],
            'variants.*.product_unit_id' => ['nullable', 'uuid', 'exists:product_units,id'],
            'variants.*.purchase_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.selling_price' => ['nullable', 'numeric', 'min:0'],
            'variants.*.active' => ['nullable', 'boolean'],
            'variants.*.is_system_generated' => ['nullable', 'boolean'],
            'variants.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],

            'variants.*.items' => ['nullable', 'array'],
            'variants.*.items.*.id' => ['nullable', 'uuid', 'exists:product_variant_items,id'],
            'variants.*.items.*.variant_line_id' => ['required', 'uuid', 'exists:variant_lines,id'],

            'deleted_variant_ids' => ['sometimes', 'array'],
            'deleted_variant_ids.*' => ['uuid', 'exists:product_variants,id'],

            'deleted_variant_item_ids' => ['sometimes', 'array'],
            'deleted_variant_item_ids.*' => ['uuid', 'exists:product_variant_items,id'],
        ];
    }

    private function prepareProductPayload(array $data): array
    {
        if (!isset($data['variants']) || !is_array($data['variants'])) {
            return $data;
        }

        $data['variants'] = collect($data['variants'])
            ->filter(fn ($row) => is_array($row))
            ->map(function (array $variant) {
                $variant['product_unit_id'] = $this->extractId($variant['product_unit_id'] ?? null);

                unset(
                    $variant['productUnit'],
                    $variant['product_unit'],
                    $variant['product_unit_id_detail'],
                    $variant['created_at'],
                    $variant['updated_at'],
                    $variant['deleted_at']
                );

                if (isset($variant['items']) && is_array($variant['items'])) {
                    $variant['items'] = collect($variant['items'])
                        ->filter(fn ($item) => is_array($item))
                        ->map(function (array $item) {
                            $item['variant_line_id'] = $this->extractId($item['variant_line_id'] ?? null);

                            unset(
                                $item['variantLine'],
                                $item['variant_line'],
                                $item['variant_line_id_detail'],
                                $item['created_at'],
                                $item['updated_at'],
                                $item['deleted_at']
                            );

                            return $item;
                        })
                        ->values()
                        ->all();
                }

                return $variant;
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

    private function syncVariants(
        Product $product,
        array $variants,
        array $deletedVariantIds,
        array $deletedVariantItemIds
    ): void {
        if ($deletedVariantItemIds) {
            ProductVariantItem::query()
                ->whereIn('id', $deletedVariantItemIds)
                ->whereHas('productVariant', function ($query) use ($product) {
                    $query->where('product_id', $product->id);
                })
                ->delete();
        }

        if ($deletedVariantIds) {
            ProductVariant::query()
                ->where('product_id', $product->id)
                ->whereIn('id', $deletedVariantIds)
                ->delete();
        }

        foreach ($variants as $variantRow) {
            $variantData = [
                'name' => $variantRow['name'] ?? null,
                'sku' => $variantRow['sku'] ?? null,
                'product_unit_id' => $variantRow['product_unit_id'] ?? null,
                'purchase_price' => $variantRow['purchase_price'] ?? 0,
                'selling_price' => $variantRow['selling_price'] ?? 0,
                'active' => $variantRow['active'] ?? true,
                'is_system_generated' => $variantRow['is_system_generated'] ?? false,
                'user_add_id' => $variantRow['user_add_id'] ?? null,
                'branch_id' => $product->branch_id,
            ];

            $variant = !empty($variantRow['id'])
                ? ProductVariant::query()
                    ->where('product_id', $product->id)
                    ->where('id', $variantRow['id'])
                    ->firstOrFail()
                : new ProductVariant([
                    'product_id' => $product->id,
                ]);

            $variant->fill($variantData);
            $variant->product_id = $product->id;
            $variant->save();

            foreach (($variantRow['items'] ?? []) as $itemRow) {
                $variantLineId = $itemRow['variant_line_id'] ?? null;

                if (!$variantLineId) {
                    continue;
                }

                $item = !empty($itemRow['id'])
                    ? ProductVariantItem::query()
                        ->where('product_variant_id', $variant->id)
                        ->where('id', $itemRow['id'])
                        ->firstOrFail()
                    : new ProductVariantItem([
                        'product_variant_id' => $variant->id,
                    ]);

                $item->fill([
                    'variant_line_id' => $variantLineId,
                ]);

                $item->product_variant_id = $variant->id;
                $item->save();
            }
        }
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $variants = $record->productVariants ?? collect();

        $data['sales_variants'] = $variants
            ->map(function ($variant) use ($record) {
                $items = $variant->productVariantItems ?? collect();

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

                return [
                    'id' => $variant->id,
                    'product_id' => $record->id,
                    'product_name' => $record->name,
                    'product_code' => $record->code,
                    'barcode' => $record->barcode,

                    'variant_name' => $variant->name,
                    'sku' => $variant->sku,
                    'option_label' => $optionLabel,

                    'product_unit_id' => $variant->product_unit_id ?: $record->product_unit_id,
                    'product_unit' => $variant->productUnit ?: $record->productUnit,

                    'tax_class_id' => $record->tax_class_id,
                    'tax_class' => $record->taxClass,

                    'purchase_price' => (float) $variant->purchase_price,
                    'selling_price' => (float) $variant->selling_price,

                    'track_inventory' => (bool) $record->track_inventory,
                    'active' => (bool) $variant->active,

                    'variant_options' => $variantOptions,

                    'label' => trim($record->name . ($optionLabel ? ' - ' . $optionLabel : '')),
                    'value' => $variant->id,
                ];
            })
            ->values()
            ->all();

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