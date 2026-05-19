<?php

namespace App\Http\Controllers\Api;

use App\Models\Product;
use App\Models\TaxRate;
use App\Services\ProductVariantService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

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
        'variants.productVariantItems.variantLine.variant',
        'variants.warehouseItems',
        'productCategory',
        'productTaxCategory',
        'productUnit',
        'taxClass',
        'salesAccount',
        'purchaseAccount',
        'salesReturnAccount',
        'purchaseReturnAccount',
        'productVariantItems.variantLine.variant',
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
        'product_type' => ['required', 'in:simple,service,variant_parent,variant'],
        'variant_signature' => ['nullable', 'string', 'max:1000'],
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
        'variant_groups' => ['nullable', 'array'],
        'variant_groups.*.variant_id' => ['required_with:variant_groups', 'uuid', 'exists:variants,id'],
        'variant_groups.*.variant_line_ids' => ['required_with:variant_groups', 'array', 'min:1'],
        'variant_groups.*.variant_line_ids.*' => ['uuid', 'exists:variant_lines,id'],
        'variant_children' => ['nullable', 'array'],
        'variant_children.*.variant_line_ids' => ['required_with:variant_children', 'array', 'min:1'],
        'variant_children.*.sku' => ['nullable', 'string', 'max:80'],
        'variant_children.*.barcode' => ['nullable', 'string', 'max:80'],
        'variant_children.*.purchase_price' => ['nullable', 'numeric', 'min:0'],
        'variant_children.*.selling_price' => ['nullable', 'numeric', 'min:0'],
        'variant_children.*.reorder_level' => ['nullable', 'numeric', 'min:0'],
        'variant_children.*.track_inventory' => ['nullable', 'boolean'],
        'variant_children.*.allow_sale' => ['nullable', 'boolean'],
        'variant_children.*.allow_purchase' => ['nullable', 'boolean'],
        'variant_children.*.active' => ['nullable', 'boolean'],
    ];

    public function __construct(protected ProductVariantService $variantService)
    {
    }

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $input = $this->prepareProductPayload($this->prepareIncomingPayload($request->all()));
        $input = $this->applyBranchToCreatePayload($input, $request);
        $validated = $this->validateCompat($input, $this->rulesForStore($request));

        $record = DB::transaction(function () use ($validated) {
            [$productData, $variantPayload] = $this->splitVariantPayload($validated);
            $productData = $this->normalizeByProductType($productData);
            $this->validateProductRules($productData);

            $product = Product::query()->create($productData);

            if ($product->product_type === 'variant_parent') {
                $product = $this->variantService->syncVariantChildren($product, $variantPayload);
            }

            return $product->fresh($this->validEagerLoadRelations($product));
        });

        return response()->json($this->serializeRecord($record), 201);
    }

    public function update(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $input = $this->prepareProductPayload($this->prepareIncomingPayload($request->all()));
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);
        $validated = $this->validateCompat($input, $this->rulesForUpdate($request, $record));

        $record = DB::transaction(function () use ($record, $validated) {
            [$productData, $variantPayload] = $this->splitVariantPayload($validated);
            $productData = array_merge($record->only(array_keys($this->storeRules)), $productData);
            $productData = $this->normalizeByProductType($productData);
            $this->validateProductRules($productData, $record);

            $record->forceFill($productData)->save();

            if ($record->product_type === 'variant_parent' && !empty($variantPayload['variant_groups'])) {
                $record = $this->variantService->syncVariantChildren($record, $variantPayload);
            }

            return $record->fresh($this->validEagerLoadRelations($record));
        });

        return response()->json($this->serializeRecord($record));
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $this->checkAccess($request, 'destroy', $record);

        DB::transaction(function () use ($record) {
            if ($record->product_type === 'variant_parent') {
                $usedChild = $record->variants()->get()->first(fn (Product $child) => $this->variantService->isProductUsed($child));

                if ($usedChild) {
                    $record->forceFill(['active' => false])->save();
                    return;
                }

                $record->variants()->each(function (Product $child) {
                    $child->productVariantItems()->delete();
                    $child->delete();
                });
            }

            if ($this->variantService->isProductUsed($record)) {
                $record->forceFill(['active' => false])->save();
                return;
            }

            $record->productVariantItems()->delete();
            $record->delete();
        });

        return response()->json(['message' => 'Deleted successfully.']);
    }

    public function variants(Request $request, mixed $id)
    {
        $product = Product::query()
            ->with(['variants.productVariantItems.variantLine.variant', 'variants.warehouseItems.warehouse'])
            ->findOrFail($id);

        return response()->json([
            'count' => $product->variants->count(),
            'results' => $this->serializeCollection($product->variants),
        ]);
    }

    public function generateVariants(Request $request, mixed $id)
    {
        return $this->syncVariants($request, $id);
    }

    public function syncVariants(Request $request, mixed $id)
    {
        $product = Product::query()->findOrFail($id);

        $data = $this->validateCompat($request->all(), [
            'variant_groups' => ['required', 'array', 'min:1'],
            'variant_groups.*.variant_id' => ['required', 'uuid', 'exists:variants,id'],
            'variant_groups.*.variant_line_ids' => ['required', 'array', 'min:1'],
            'variant_groups.*.variant_line_ids.*' => ['uuid', 'exists:variant_lines,id'],
            'variant_children' => ['nullable', 'array'],
        ]);

        $product = $this->variantService->syncVariantChildren($product, $data);

        return response()->json($this->serializeRecord($product));
    }

    public function search(Request $request)
    {
        $query = $this->baseQuery()
            ->where('active', true)
            ->whereIn('product_type', ['simple', 'service', 'variant']);

        $transaction = $request->query('transaction');

        if ($transaction === 'sale') {
            $query->where('allow_sale', true);
        } elseif ($transaction === 'purchase') {
            $query->where('allow_purchase', true);
        }

        $this->applySearch($query, $request);
        $this->applyOrdering($query, $request);

        $pageSize = min(max((int) $request->query('page_size', 20), 1), $this->maxPageSize);
        $records = $query->paginate($pageSize, ['*'], 'page', max((int) $request->query('page', 1), 1));

        return response()->json([
            'count' => $records->total(),
            'next' => $records->nextPageUrl(),
            'previous' => $records->previousPageUrl(),
            'results' => $this->serializeCollection($records->getCollection()),
        ]);
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

        if ($request->boolean('catalog')) {
            $query->where(function (Builder $catalog) {
                $catalog->whereNull('parent_id')->orWhere('product_type', 'simple');
            });
        }

        if ($request->boolean('sellable')) {
            $query->whereIn('product_type', ['simple', 'service', 'variant'])->where('allow_sale', true);
        }

        if ($request->boolean('purchasable')) {
            $query->whereIn('product_type', ['simple', 'service', 'variant'])->where('allow_purchase', true);
        }
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $options = $this->variantService->variantOptions($record);
        $variantLabel = collect($options)
            ->map(fn ($option) => trim(($option['variant_name'] ? $option['variant_name'] . ': ' : '') . ($option['variant_line_value'] ?? '')))
            ->filter()
            ->implode(' / ');

        $children = $record->relationLoaded('variants') ? $record->variants : collect();
        $warehouseItems = $record->warehouseItems ?? collect();
        $stockQty = $record->product_type === 'variant_parent'
            ? $children->sum(fn ($child) => (float) $child->warehouseItems->sum('qty_on_hand'))
            : $warehouseItems->sum(fn ($item) => (float) $item->qty_on_hand);

        $data['variant_options'] = $options;
        $data['variant_label'] = $variantLabel;
        $data['parent_detail'] = $data['parent'] ?? null;
        $data['children_count'] = $record->product_type === 'variant_parent' ? $record->variants()->count() : 0;
        $data['children'] = $record->product_type === 'variant_parent' && $children->isNotEmpty()
            ? $children->map(fn ($child) => $this->mutateSerializedRecord($child->toArray(), $child))->values()->all()
            : [];
        $data['sales_variants'] = $record->product_type === 'variant_parent'
            ? $children->where('active', true)->map(fn ($child) => $this->salesVariantPayload($child))->values()->all()
            : [$this->salesVariantPayload($record)];
        $data['stock_summary'] = [
            'qty_on_hand' => round($stockQty, 4),
            'total_value' => $record->product_type === 'variant_parent'
                ? round($children->sum(fn ($child) => (float) $child->warehouseItems->sum('total_value')), 6)
                : round($warehouseItems->sum(fn ($item) => (float) $item->total_value), 6),
        ];
        $data['can_delete'] = !$this->isUsedInTransactions($record);
        $data['is_used_in_transactions'] = $this->isUsedInTransactions($record);
        $data['label'] = $this->searchLabel($record);

        $data['default_tax_rate'] = $record->tax_class_id
            ? TaxRate::query()->where('tax_class_id', $record->tax_class_id)->where('active', true)->orderBy('name')->first()?->toArray()
            : null;

        return $data;
    }

    private function prepareProductPayload(array $data): array
    {
        $legacyProductTypes = [
            'goods' => 'simple',
            'services' => 'simple',
            'service' => 'service',
            'services' => 'service',
            'composite' => 'variant_parent',
        ];

        if (isset($data['product_type'], $legacyProductTypes[$data['product_type']])) {
            $data['product_type'] = $legacyProductTypes[$data['product_type']];
        }

        if (empty($data['product_type'])) {
            $data['product_type'] = 'simple';
        }

        return $data;
    }

    private function splitVariantPayload(array $validated): array
    {
        $variantPayload = [
            'variant_groups' => $validated['variant_groups'] ?? [],
            'variant_children' => $validated['variant_children'] ?? [],
        ];

        unset($validated['variant_groups'], $validated['variant_children']);

        return [$validated, $variantPayload];
    }

    private function normalizeByProductType(array $data): array
    {
        if (($data['product_type'] ?? 'simple') === 'variant_parent') {
            $data['parent_id'] = null;
            $data['variant_signature'] = null;
            $data['track_inventory'] = false;
            $data['allow_sale'] = false;
            $data['allow_purchase'] = false;
            $data['sku'] = $data['sku'] ?? null;
            $data['barcode'] = $data['barcode'] ?? null;
        }

        if (($data['product_type'] ?? 'simple') === 'simple') {
            $data['parent_id'] = null;
            $data['variant_signature'] = null;
        }

        if (($data['product_type'] ?? 'simple') === 'service') {
            $data['parent_id'] = null;
            $data['variant_signature'] = null;
            $data['track_inventory'] = false;
            $data['valuation_method'] = $data['valuation_method'] ?? null;
            $data['reorder_level'] = 0;
            $data['sku'] = $data['sku'] ?? null;
            $data['barcode'] = $data['barcode'] ?? null;
        }

        return $data;
    }

    private function validateProductRules(array $data, ?Product $record = null): void
    {
        $type = $data['product_type'] ?? 'simple';

        if ($type === 'variant' && !$record) {
            throw ValidationException::withMessages(['product_type' => ['Create variant children from a variant parent product.']]);
        }

        if ($type === 'variant' && empty($data['parent_id'])) {
            throw ValidationException::withMessages(['parent_id' => ['Variant child products require a parent product.']]);
        }

        if ($type === 'variant_parent' && !empty($data['parent_id'])) {
            throw ValidationException::withMessages(['parent_id' => ['Variant parent products cannot have a parent.']]);
        }

        if ($type === 'service' && ! empty($data['track_inventory'])) {
            throw ValidationException::withMessages(['track_inventory' => ['Services cannot track inventory.']]);
        }

        $ignore = $record?->id;

        validator($data, [
            'sku' => ['nullable', Rule::unique('products', 'sku')->ignore($ignore)],
            'barcode' => ['nullable', Rule::unique('products', 'barcode')->ignore($ignore)],
        ])->validate();
    }

    private function salesVariantPayload(Product $record): array
    {
        return [
            'id' => $record->id,
            'product_id' => $record->id,
            'product_name' => $record->name,
            'product_code' => $record->code,
            'sku' => $record->sku,
            'barcode' => $record->barcode,
            'variant_name' => $record->name,
            'variant_options' => $this->variantService->variantOptions($record),
            'variant_label' => $record->product_type === 'variant' ? $this->variantLabelFor($record) : '',
            'product_unit_id' => $record->product_unit_id,
            'product_unit' => $record->productUnit,
            'tax_class_id' => $record->tax_class_id,
            'tax_class' => $record->taxClass,
            'purchase_price' => (float) $record->purchase_price,
            'selling_price' => (float) $record->selling_price,
            'track_inventory' => (bool) $record->track_inventory,
            'allow_sale' => (bool) $record->allow_sale,
            'allow_purchase' => (bool) $record->allow_purchase,
            'active' => (bool) $record->active,
            'label' => $this->searchLabel($record),
            'value' => $record->id,
        ];
    }

    private function variantLabelFor(Product $record): string
    {
        return collect($this->variantService->variantOptions($record))
            ->map(fn ($option) => trim(($option['variant_name'] ? $option['variant_name'] . ': ' : '') . ($option['variant_line_value'] ?? '')))
            ->filter()
            ->implode(' / ');
    }

    private function searchLabel(Product $record): string
    {
        $parts = array_filter([
            $record->name,
            $record->sku,
            $record->barcode,
        ]);

        return implode(' | ', $parts);
    }

    private function isUsedInTransactions(Product $record): bool
    {
        if ($record->product_type === 'variant_parent') {
            return $record->variants()->get()->contains(fn (Product $child) => $this->variantService->isProductUsed($child));
        }

        return $this->variantService->isProductUsed($record);
    }
}
