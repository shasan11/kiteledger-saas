<?php

namespace App\Services;

use App\Models\Product;
use App\Models\ProductVariantItem;
use App\Models\VariantLine;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class ProductVariantService
{
    public function generateCombinations(array $variantGroups): array
    {
        $groups = collect($variantGroups)
            ->map(function (array $group) {
                $ids = collect($group['variant_line_ids'] ?? [])
                    ->map(fn ($id) => $this->extractId($id))
                    ->filter()
                    ->unique()
                    ->values()
                    ->all();

                return [
                    'variant_id' => $this->extractId($group['variant_id'] ?? null),
                    'variant_line_ids' => $ids,
                ];
            })
            ->filter(fn (array $group) => count($group['variant_line_ids']) > 0)
            ->values();

        if ($groups->isEmpty()) {
            return [];
        }

        return $groups
            ->reduce(function (array $carry, array $group) {
                $next = [];

                foreach ($carry as $combination) {
                    foreach ($group['variant_line_ids'] as $lineId) {
                        $next[] = [...$combination, $lineId];
                    }
                }

                return $next;
            }, [[]]);
    }

    public function syncVariantChildren(Product $parent, array $payload): Product
    {
        return DB::transaction(function () use ($parent, $payload) {
            $parent = Product::query()
                ->with(['variants.productVariantItems.variantLine.variant'])
                ->lockForUpdate()
                ->findOrFail($parent->id);

            if (($parent->product_type ?? 'simple') !== 'variant_parent') {
                throw ValidationException::withMessages([
                    'product_type' => ['Only variant parent products can generate variant children.'],
                ]);
            }

            $variantGroups = $payload['variant_groups'] ?? [];
            $combinations = $this->generateCombinations($variantGroups);

            if (empty($combinations)) {
                throw ValidationException::withMessages([
                    'variant_groups' => ['Select at least one variant value before generating variants.'],
                ]);
            }

            $childrenBySignature = collect($payload['variant_children'] ?? [])
                ->filter(fn ($row) => is_array($row))
                ->keyBy(fn ($row) => $this->buildVariantSignature($row['variant_line_ids'] ?? []));

            $requestedSignatures = [];

            foreach ($combinations as $variantLineIds) {
                $signature = $this->buildVariantSignature($variantLineIds);
                $requestedSignatures[] = $signature;
                $override = $childrenBySignature->get($signature, []);
                $variantLines = $this->variantLines($variantLineIds);

                if ($variantLines->count() !== count($variantLineIds)) {
                    throw ValidationException::withMessages([
                        'variant_line_ids' => ['One or more selected variant values do not exist.'],
                    ]);
                }

                $child = Product::query()
                    ->where('parent_id', $parent->id)
                    ->where('variant_signature', $signature)
                    ->first();

                if ($child) {
                    $override['id'] = $child->id;
                    $childPayload = $this->childPayload($parent, $variantLines, $override, $signature);
                    $child->forceFill($childPayload)->save();
                } else {
                    $childPayload = $this->childPayload($parent, $variantLines, $override, $signature);
                    $child = Product::query()->create($childPayload);
                }

                $this->syncProductVariantItems($child, $variantLineIds);
            }

            $removedChildren = Product::query()
                ->where('parent_id', $parent->id)
                ->where('product_type', 'variant')
                ->whereNotIn('variant_signature', $requestedSignatures)
                ->get();

            foreach ($removedChildren as $child) {
                if ($this->isProductUsed($child)) {
                    $child->forceFill(['active' => false])->save();
                } else {
                    $child->productVariantItems()->delete();
                    $child->delete();
                }
            }

            return $parent->fresh([
                'variants.productVariantItems.variantLine.variant',
                'variants.warehouseItems',
                'productVariantItems.variantLine.variant',
            ]);
        });
    }

    public function makeVariantName(Product $parent, array $variantLines): string
    {
        $values = collect($variantLines)
            ->map(fn ($line) => $line instanceof VariantLine ? $line->value : ($line['value'] ?? null))
            ->filter()
            ->implode(' / ');

        return trim($parent->name . ($values ? ' - ' . $values : ''));
    }

    public function makeVariantSku(Product $parent, array $variantLines, ?string $customSku = null): string
    {
        if ($customSku) {
            return $customSku;
        }

        $base = $parent->sku ?: $parent->code ?: Str::upper(Str::slug($parent->name, '-'));
        $suffix = collect($variantLines)
            ->map(fn ($line) => $line instanceof VariantLine ? $line->value : ($line['value'] ?? null))
            ->filter()
            ->map(fn ($value) => Str::upper(Str::slug($value, '-')))
            ->implode('-');

        return Str::limit($base . ($suffix ? '-' . $suffix : ''), 80, '');
    }

    public function makeVariantBarcode(Product $parent, array $variantLines, ?string $customBarcode = null): ?string
    {
        if ($customBarcode) {
            return $customBarcode;
        }

        if (!$parent->barcode) {
            return null;
        }

        $suffix = substr(abs(crc32($this->buildVariantSignature(collect($variantLines)->pluck('id')->all()))), -4);

        return Str::limit($parent->barcode . $suffix, 80, '');
    }

    public function buildVariantSignature(array $variantLineIds): string
    {
        return collect($variantLineIds)
            ->map(fn ($id) => (string) $this->extractId($id))
            ->filter()
            ->unique()
            ->sort()
            ->values()
            ->implode('|');
    }

    public function syncProductVariantItems(Product $variantProduct, array $variantLineIds): void
    {
        $ids = collect($variantLineIds)
            ->map(fn ($id) => $this->extractId($id))
            ->filter()
            ->unique()
            ->values();

        ProductVariantItem::query()
            ->where('product_id', $variantProduct->id)
            ->whereNotIn('variant_line_id', $ids)
            ->delete();

        foreach ($ids as $lineId) {
            ProductVariantItem::query()->firstOrCreate([
                'product_id' => $variantProduct->id,
                'variant_line_id' => $lineId,
            ]);
        }
    }

    public function isProductUsed(Product $product): bool
    {
        $relations = [
            'quotationLines',
            'invoiceLines',
            'salesOrderLines',
            'proformaInvoiceLines',
            'salesReturnLines',
            'purchaseOrderLines',
            'purchaseBillLines',
            'debitNoteLines',
            'inventoryAdjustmentLines',
            'warehouseTransferLines',
            'posSaleLines',
            'posReturnLines',
            'productionFinishedJournals',
            'productionRawMaterialLines',
            'productionByProductLines',
            'productionOrdersAsFinishedProduct',
            'productionOrderRawMaterialLines',
            'productionOrderByproductLines',
            'warehouseItems',
        ];

        foreach ($relations as $relation) {
            if (method_exists($product, $relation) && $product->{$relation}()->exists()) {
                return true;
            }
        }

        return false;
    }

    public function variantOptions(Product $product): array
    {
        $product->loadMissing('productVariantItems.variantLine.variant');

        return $product->productVariantItems
            ->sortBy(fn ($item) => [
                $item->variantLine?->variant?->name ?? '',
                $item->variantLine?->sort_order ?? 0,
                $item->variantLine?->value ?? '',
            ])
            ->map(fn ($item) => [
                'variant_id' => $item->variantLine?->variant?->id,
                'variant_name' => $item->variantLine?->variant?->name,
                'variant_line_id' => $item->variantLine?->id,
                'variant_line_value' => $item->variantLine?->value,
            ])
            ->values()
            ->all();
    }

    protected function childPayload(Product $parent, Collection $variantLines, array $override, string $signature): array
    {
        $sku = $this->makeVariantSku($parent, $variantLines->all(), $override['sku'] ?? null);
        $barcode = $this->makeVariantBarcode($parent, $variantLines->all(), $override['barcode'] ?? null);

        $this->assertUniqueChildIdentity($parent, $signature, $sku, $barcode, $override['id'] ?? null);

        return [
            'branch_id' => $parent->branch_id,
            'parent_id' => $parent->id,
            'product_category_id' => $parent->product_category_id,
            'product_tax_category_id' => $parent->product_tax_category_id,
            'name' => $this->makeVariantName($parent, $variantLines->all()),
            'code' => $override['code'] ?? null,
            'sku' => $sku,
            'barcode' => $barcode,
            'description' => $override['description'] ?? $parent->description,
            'product_unit_id' => $parent->product_unit_id,
            'tax_class_id' => $parent->tax_class_id,
            'product_type' => 'variant',
            'variant_signature' => $signature,
            'sales_account_id' => $parent->sales_account_id,
            'purchase_account_id' => $parent->purchase_account_id,
            'sales_return_account_id' => $parent->sales_return_account_id,
            'purchase_return_account_id' => $parent->purchase_return_account_id,
            'valuation_method' => $parent->valuation_method ?: 'standard',
            'reorder_level' => $override['reorder_level'] ?? $parent->reorder_level ?? 0,
            'purchase_price' => $override['purchase_price'] ?? $parent->purchase_price ?? 0,
            'selling_price' => $override['selling_price'] ?? $parent->selling_price ?? 0,
            'track_inventory' => array_key_exists('track_inventory', $override) ? (bool) $override['track_inventory'] : (bool) $parent->track_inventory,
            'allow_sale' => array_key_exists('allow_sale', $override) ? (bool) $override['allow_sale'] : (bool) $parent->allow_sale,
            'allow_purchase' => array_key_exists('allow_purchase', $override) ? (bool) $override['allow_purchase'] : (bool) $parent->allow_purchase,
            'active' => array_key_exists('active', $override) ? (bool) $override['active'] : true,
            'is_system_generated' => false,
            'user_add_id' => $parent->user_add_id,
        ];
    }

    protected function variantLines(array $variantLineIds): Collection
    {
        $ids = collect($variantLineIds)
            ->map(fn ($id) => $this->extractId($id))
            ->filter()
            ->values();

        return VariantLine::query()
            ->with('variant')
            ->whereIn('id', $ids)
            ->get()
            ->sortBy(fn ($line) => $ids->search($line->id))
            ->values();
    }

    protected function assertUniqueChildIdentity(Product $parent, string $signature, ?string $sku, ?string $barcode, ?string $ignoreId = null): void
    {
        $combinationExists = Product::query()
            ->where('parent_id', $parent->id)
            ->where('variant_signature', $signature)
            ->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))
            ->exists();

        if ($combinationExists) {
            throw ValidationException::withMessages([
                'variant_children' => ['Duplicate variant combination under the same parent product.'],
            ]);
        }

        if ($sku && Product::query()->where('sku', $sku)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            throw ValidationException::withMessages(['sku' => ["SKU {$sku} is already in use."]]);
        }

        if ($barcode && Product::query()->where('barcode', $barcode)->when($ignoreId, fn ($query) => $query->whereKeyNot($ignoreId))->exists()) {
            throw ValidationException::withMessages(['barcode' => ["Barcode {$barcode} is already in use."]]);
        }
    }

    protected function extractId(mixed $value): mixed
    {
        if (is_array($value)) {
            return $value['id'] ?? $value['value'] ?? null;
        }

        return $value ?: null;
    }
}
