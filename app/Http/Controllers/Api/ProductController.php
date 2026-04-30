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

    protected array $relations = ['branch', 'productCategory', 'productUnit', 'taxClass', 'productVariants', 'productVariants.productVariantItems'];
    protected array $relationDetails = ['branch' => 'branch_id', 'productCategory' => 'product_category_id', 'productUnit' => 'product_unit_id', 'taxClass' => 'tax_class_id'];
    protected array $searchable = ['name', 'code', 'barcode', 'description'];
    protected array $filterable = ['branch_id', 'product_category_id', 'product_unit_id', 'tax_class_id', 'active'];
    protected array $booleanFilters = ['active', 'track_inventory'];
    protected array $sortable = ['id', 'name', 'code', 'barcode', 'created_at', 'updated_at'];
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
        'deleted_variant_ids' => ['nullable', 'array'],
        'deleted_variant_ids.*' => ['uuid', 'exists:product_variants,id'],
        'deleted_variant_item_ids' => ['nullable', 'array'],
        'deleted_variant_item_ids.*' => ['uuid', 'exists:product_variant_items,id'],
    ];

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');
        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->applyBranchToCreatePayload($input, $request);
        $validated = $this->validateCompat($input, $this->rulesForStore($request));

        $record = DB::transaction(function () use ($validated) {
            $variants = $validated['variants'] ?? [];
            unset($validated['variants'], $validated['deleted_variant_ids'], $validated['deleted_variant_item_ids']);
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
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);
        $validated = $this->validateCompat($input, $this->rulesForUpdate($request, $record));

        $record = DB::transaction(function () use ($record, $validated) {
            $variants = $validated['variants'] ?? [];
            $deletedVariantIds = $validated['deleted_variant_ids'] ?? [];
            $deletedVariantItemIds = $validated['deleted_variant_item_ids'] ?? [];
            unset($validated['variants'], $validated['deleted_variant_ids'], $validated['deleted_variant_item_ids']);

            $record->update($validated);
            $this->syncVariants($record, $variants, $deletedVariantIds, $deletedVariantItemIds);

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
            'deleted_variant_ids' => ['sometimes', 'array'],
            'deleted_variant_ids.*' => ['uuid', 'exists:product_variants,id'],
            'deleted_variant_item_ids' => ['sometimes', 'array'],
            'deleted_variant_item_ids.*' => ['uuid', 'exists:product_variant_items,id'],
        ];
    }

    private function syncVariants(Product $product, array $variants, array $deletedVariantIds, array $deletedVariantItemIds): void
    {
        if ($deletedVariantItemIds) {
            ProductVariantItem::query()->whereIn('id', $deletedVariantItemIds)->delete();
        }

        if ($deletedVariantIds) {
            ProductVariant::query()->where('product_id', $product->id)->whereIn('id', $deletedVariantIds)->delete();
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
                ? ProductVariant::query()->where('product_id', $product->id)->findOrFail($variantRow['id'])
                : new ProductVariant(['product_id' => $product->id]);

            $variant->fill($variantData);
            $variant->product_id = $product->id;
            $variant->save();

            foreach (($variantRow['items'] ?? []) as $itemRow) {
                $itemData = ['variant_line_id' => $itemRow['variant_line_id'] ?? null];
                if (empty($itemData['variant_line_id'])) {
                    continue;
                }

                $item = !empty($itemRow['id'])
                    ? ProductVariantItem::query()->where('product_variant_id', $variant->id)->findOrFail($itemRow['id'])
                    : new ProductVariantItem(['product_variant_id' => $variant->id]);

                $item->fill($itemData);
                $item->product_variant_id = $variant->id;
                $item->save();
            }
        }
    }
}
