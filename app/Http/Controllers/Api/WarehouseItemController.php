<?php

namespace App\Http\Controllers\Api;

use App\Models\WarehouseItem;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;

class WarehouseItemController extends BaseCrudApiController
{
    protected string $modelClass = WarehouseItem::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected array $relations = [
        'warehouse',
        'product',
        'product.productCategory',
        'product.productUnit',
        'branch',
    ];
    protected array $relationDetails = [
        'warehouse' => 'warehouse_id',
        'product' => 'product_id',
        'branch' => 'branch_id',
    ];
    protected array $searchable = [
        'product.name',
        'product.code',
        'product.sku',
        'product.barcode',
        'warehouse.name',
    ];
    protected array $filterable = ['branch_id', 'warehouse_id', 'product_id'];
    protected array $booleanFilters = ['active'];
    protected array $sortable = [
        'id',
        'qty_on_hand',
        'total_value',
        'created_at',
    ];
    protected string $defaultSort = 'warehouse_id';

    public function store(Request $request)
    {
        abort(405, 'Warehouse stock is maintained through inventory adjustments.');
    }

    public function update(Request $request, mixed $id)
    {
        abort(405, 'Warehouse stock is maintained through inventory adjustments.');
    }

    public function destroy(Request $request, mixed $id)
    {
        abort(405, 'Warehouse stock is maintained through inventory adjustments.');
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($categoryId = $this->requestParam($request, 'category_id')) {
            $query->whereHas('product', fn (Builder $product) => $product->where('product_category_id', $categoryId));
        }

        if (!$request->boolean('include_zero_stock')) {
            $query->where('qty_on_hand', '!=', 0);
        }

        if (!$request->boolean('include_inactive')) {
            $query->where('active', true);
        }
    }

    protected function applyOrdering(Builder $query, Request $request): void
    {
        $ordering = ltrim((string) $request->query('ordering', $request->query('sort', $this->defaultSort)), '-');

        if (in_array($ordering, ['product_name', 'warehouse_name'], true)) {
            $direction = str_starts_with((string) $request->query('ordering', ''), '-') ? 'desc' : 'asc';
            $relation = $ordering === 'product_name' ? 'product' : 'warehouse';
            $column = $ordering === 'product_name' ? 'name' : 'name';

            $query->orderBy(
                ($relation === 'product'
                    ? \App\Models\Product::query()->select($column)->whereColumn('products.id', 'warehouse_items.product_id')
                    : \App\Models\Warehouse::query()->select($column)->whereColumn('warehouses.id', 'warehouse_items.warehouse_id')),
                $direction
            );
            return;
        }

        parent::applyOrdering($query, $request);
    }

    protected function mutateSerializedRecord(array $data, \Illuminate\Database\Eloquent\Model $record): array
    {
        $qty = (float) $record->qty_on_hand;
        $reorder = (float) ($record->reorder_level ?? $record->product?->reorder_level ?? 0);
        $data['stock_status'] = $qty <= 0 ? 'Out of Stock' : ($reorder > 0 && $qty <= $reorder ? 'Low Stock' : 'In Stock');

        return $data;
    }
}
