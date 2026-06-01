<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ProductQueryTool extends BaseQueryTool
{
    public function mostExpensive(Request $request): array
    {
        return $this->priceSorted($request, 'product.most_expensive', 'Most expensive product', 'selling_price', 'desc');
    }

    public function cheapest(Request $request): array
    {
        return $this->priceSorted($request, 'product.cheapest', 'Cheapest product', 'selling_price', 'asc');
    }

    public function highestPurchasePrice(Request $request): array
    {
        return $this->priceSorted($request, 'product.highest_purchase_price', 'Highest purchase price product', 'purchase_price', 'desc');
    }

    public function highestSellingPrice(Request $request): array
    {
        return $this->priceSorted($request, 'product.highest_selling_price', 'Highest selling price product', 'selling_price', 'desc');
    }

    public function lowStock(Request $request): array
    {
        return app(InventoryQueryTool::class)->lowStock($request);
    }

    public function negativeStock(Request $request): array
    {
        return app(InventoryQueryTool::class)->negativeStock($request);
    }

    public function productsWithoutPrice(Request $request): array
    {
        return $this->missingAmount($request, 'product.without_price', 'Products without selling price', 'selling_price');
    }

    public function productsWithoutCost(Request $request): array
    {
        return $this->missingAmount($request, 'product.without_cost', 'Products without purchase cost', 'purchase_price');
    }

    private function priceSorted(Request $request, string $tool, string $title, string $column, string $direction): array
    {
        $this->authorize($request);

        if (!$this->tableExists(['products']) || !Schema::hasColumn('products', $column)) {
            return $this->empty($tool, $title, $request, [], 'No product price data was found.');
        }

        $query = DB::table('products')
            ->whereNotNull('products.' . $column)
            ->where('products.' . $column, '>', 0);

        $this->applyActive($query, 'products');
        $this->applyBranch($query, $request, 'products');

        $columns = ['id'];
        foreach (['name', 'code', 'sku', 'purchase_price', 'selling_price', 'active'] as $select) {
            if (Schema::hasColumn('products', $select)) {
                $columns[] = $select;
            }
        }

        $records = $query
            ->orderBy('products.' . $column, $direction)
            ->limit(10)
            ->get($columns)
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'name' => $row->name ?? null,
                'code' => $row->code ?? null,
                'sku' => $row->sku ?? null,
                'selling_price' => $this->number($row->selling_price ?? null),
                'purchase_price' => $this->number($row->purchase_price ?? null),
                'open_url' => '/inventory/products/' . $row->id,
            ])
            ->values()
            ->all();

        if (!$records) {
            return $this->empty($tool, $title, $request, ['active' => true], 'No active priced products were found.');
        }

        $top = $records[0];
        $name = $top['name'] ?: ($top['code'] ?: 'Unnamed product');
        $summary = $name . ' is the ' . mb_strtolower($title) . ' with ' . str_replace('_', ' ', $column) . ' ' . number_format((float) $top[$column], 2) . '.';

        return AiToolResult::query($tool, $title, $records, array_merge($this->contextFilters($request), [
            'active' => true,
            'order_by' => $column,
            'direction' => $direction,
        ]), $summary, '/inventory/products/' . $top['id'])->toArray();
    }

    private function missingAmount(Request $request, string $tool, string $title, string $column): array
    {
        $this->authorize($request);

        if (!$this->tableExists(['products']) || !Schema::hasColumn('products', $column)) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('products')
            ->where(function ($query) use ($column) {
                $query->whereNull('products.' . $column)->orWhere('products.' . $column, '<=', 0);
            });

        $this->applyActive($query, 'products');
        $this->applyBranch($query, $request, 'products');

        $records = $query
            ->limit(25)
            ->get(['id', 'name', 'code', 'sku', 'purchase_price', 'selling_price'])
            ->map(fn ($row) => [
                'id' => (string) $row->id,
                'name' => $row->name ?? null,
                'code' => $row->code ?? null,
                'sku' => $row->sku ?? null,
                'selling_price' => $this->number($row->selling_price ?? null),
                'purchase_price' => $this->number($row->purchase_price ?? null),
                'open_url' => '/inventory/products/' . $row->id,
            ])
            ->all();

        return AiToolResult::query($tool, $title, $records, array_merge($this->contextFilters($request), ['active' => true]), count($records) ? $title . ' returned ' . count($records) . ' products.' : 'No products matched this check.', '/inventory/products')->toArray();
    }
}
