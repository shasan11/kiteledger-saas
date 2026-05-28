<?php

namespace App\Services\AI\Agent;

use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AiDeterministicAnswerService
{
    public function __construct(protected BranchScopeService $scope) {}

    public function answer(Request $request, string $message): ?array
    {
        $m = mb_strtolower(trim($message));

        if ($this->isProductPriceQuestion($m)) {
            return $this->productPriceAnswer($request, $m);
        }

        return null;
    }

    private function isProductPriceQuestion(string $message): bool
    {
        return str_contains($message, 'product')
            && $this->containsAny($message, [
                'most expensive',
                'highest price',
                'highest priced',
                'costliest',
                'cheapest',
                'lowest price',
                'lowest priced',
                'selling price',
                'purchase price',
                'price',
            ]);
    }

    private function productPriceAnswer(Request $request, string $message): array
    {
        if (!Schema::hasTable('products')) {
            return $this->emptyResult('products', 'Products table does not exist.');
        }

        $priceColumn = str_contains($message, 'purchase') ? 'purchase_price' : 'selling_price';
        if (!Schema::hasColumn('products', $priceColumn)) {
            $priceColumn = Schema::hasColumn('products', 'selling_price') ? 'selling_price' : 'purchase_price';
        }
        if (!Schema::hasColumn('products', $priceColumn)) {
            return $this->emptyResult('products', 'No price column exists on products.');
        }

        $direction = $this->containsAny($message, ['cheapest', 'lowest price', 'lowest priced']) ? 'asc' : 'desc';

        $query = DB::table('products')
            ->whereNotNull($priceColumn)
            ->where($priceColumn, '>', 0);

        if (Schema::hasColumn('products', 'active')) {
            $query->where(function ($q) {
                $q->where('active', true)->orWhereNull('active');
            });
        }

        if (Schema::hasColumn('products', 'branch_id')) {
            $branchId = $this->scope->selectedBranchId($request, $request->user());
            if ($branchId) {
                $query->where('branch_id', $branchId);
            }
        }

        $columns = ['id'];
        foreach (['name', 'code', 'sku', 'barcode', 'product_type', 'purchase_price', 'selling_price', 'active'] as $column) {
            if (Schema::hasColumn('products', $column)) {
                $columns[] = $column;
            }
        }

        $records = $query
            ->orderBy($priceColumn, $direction)
            ->limit(10)
            ->get($columns)
            ->map(function ($row) use ($priceColumn) {
                return [
                    'id' => $row->id ?? null,
                    'name' => $row->name ?? null,
                    'code' => $row->code ?? null,
                    'sku' => $row->sku ?? null,
                    'barcode' => $row->barcode ?? null,
                    'product_type' => $row->product_type ?? null,
                    'purchase_price' => isset($row->purchase_price) ? (float) $row->purchase_price : null,
                    'selling_price' => isset($row->selling_price) ? (float) $row->selling_price : null,
                    'selected_price' => isset($row->{$priceColumn}) ? (float) $row->{$priceColumn} : null,
                    'price_column' => $priceColumn,
                    'open_url' => isset($row->id) ? '/inventory/products/' . $row->id : '/inventory/products',
                ];
            })
            ->values()
            ->all();

        if (empty($records)) {
            return $this->emptyResult('products', 'No active priced products were found.');
        }

        $top = $records[0];
        $label = $direction === 'desc' ? 'most expensive' : 'cheapest';
        $priceLabel = str_replace('_', ' ', $priceColumn);
        $name = $top['name'] ?: ($top['code'] ?: 'Unnamed product');

        return [
            'reply' => "The {$label} product by {$priceLabel} is {$name} with price " . number_format((float) $top['selected_price'], 2) . '.',
            'result' => [
                'type' => 'record_list',
                'module' => 'products',
                'title' => ucfirst($label) . ' products by ' . $priceLabel,
                'records' => $records,
                'open_url' => '/inventory/products',
                'source' => 'database',
            ],
        ];
    }

    private function emptyResult(string $module, string $message): array
    {
        return [
            'reply' => $message,
            'result' => [
                'type' => 'record_list',
                'module' => $module,
                'title' => 'No data found',
                'records' => [],
                'open_url' => '/inventory/products',
                'source' => 'database',
            ],
        ];
    }

    private function containsAny(string $haystack, array $needles): bool
    {
        foreach ($needles as $needle) {
            if ($needle !== '' && str_contains($haystack, $needle)) {
                return true;
            }
        }
        return false;
    }
}
