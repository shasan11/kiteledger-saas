<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductResource;
use App\Models\Product;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(Product::class)
            ->allowedIncludes('branch', 'productCategory', 'productUnit', 'warehouse')
            ->allowedFilters(
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('barcode', 'like', "%{$value}%")
                            ->orWhere('sku', 'like', "%{$value}%")
                            ->orWhere('description', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('product_category_id'),
                AllowedFilter::exact('product_unit_id'),
                AllowedFilter::exact('warehouse_id')
            )
            ->allowedSorts(
                'id',
                'name',
                'code',
                'sku',
                'barcode',
                'purchase_price',
                'sales_price',
                'opening_stock',
                'reorder_level',
                'created_at',
                'updated_at'
            )
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ProductResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateProduct($request);

        $record = Product::create($data);

        return new ProductResource($record->fresh()->load(['branch', 'productCategory', 'productUnit', 'warehouse']));
    }

    public function show(Product $product)
    {
        return new ProductResource($product->load(['branch', 'productCategory', 'productUnit', 'warehouse']));
    }

    public function update(Request $request, Product $product)
    {
        $data = $this->validateProduct($request, true);

        $product->update($data);

        return new ProductResource($product->fresh()->load(['branch', 'productCategory', 'productUnit', 'warehouse']));
    }

    public function destroy(Product $product)
    {
        DB::transaction(function () use ($product) {
            $product->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'records.*.product_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'records.*.product_unit_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_units,id'],
            'records.*.warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'records.*.name' => ['required', 'string', 'max:180'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.barcode' => ['sometimes', 'nullable', 'string', 'max:100'],
            'records.*.sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.purchase_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.sales_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.opening_stock' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.reorder_level' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                return Product::create($record)->fresh()->load(['branch', 'productCategory', 'productUnit', 'warehouse']);
            });
        });

        return ProductResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:products,id'],
            'records.*.branch_id' => ['sometimes', 'uuid', 'exists:branches,id'],
            'records.*.product_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'records.*.product_unit_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_units,id'],
            'records.*.warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'records.*.name' => ['sometimes', 'string', 'max:180'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.barcode' => ['sometimes', 'nullable', 'string', 'max:100'],
            'records.*.sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.purchase_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.sales_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.opening_stock' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.reorder_level' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = Product::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh()->load(['branch', 'productCategory', 'productUnit', 'warehouse']);
            });
        });

        return ProductResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:products,id'],
        ]);

        DB::transaction(function () use ($data) {
            Product::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateProduct(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'product_category_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'product_unit_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_units,id'],
            'warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'name' => [$required, 'string', 'max:180'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'barcode' => ['sometimes', 'nullable', 'string', 'max:100'],
            'sku' => ['sometimes', 'nullable', 'string', 'max:100'],
            'description' => ['sometimes', 'nullable', 'string'],
            'purchase_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'sales_price' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'opening_stock' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'reorder_level' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
