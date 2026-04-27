<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductCategoryResource;
use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductCategoryController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(ProductCategory::class)
            ->allowedIncludes('branch', 'parent', 'children', 'products')
            ->allowedFilters(
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('description', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('parent_id')
            )
            ->allowedSorts(
                'id',
                'name',
                'code',
                'created_at',
                'updated_at'
            )
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ProductCategoryResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateProductCategory($request);

        $record = ProductCategory::create($data);

        return new ProductCategoryResource($record->fresh()->load(['branch', 'parent', 'children', 'products']));
    }

    public function show(ProductCategory $productCategory)
    {
        return new ProductCategoryResource($productCategory->load(['branch', 'parent', 'children', 'products']));
    }

    public function update(Request $request, ProductCategory $productCategory)
    {
        $data = $this->validateProductCategory($request, true);

        if (($data['parent_id'] ?? null) === $productCategory->id) {
            throw ValidationException::withMessages([
                'parent_id' => ['The parent_id cannot be the same as the category id.'],
            ]);
        }

        $productCategory->update($data);

        return new ProductCategoryResource($productCategory->fresh()->load(['branch', 'parent', 'children', 'products']));
    }

    public function destroy(ProductCategory $productCategory)
    {
        DB::transaction(function () use ($productCategory) {
            $productCategory->delete();
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
            'records.*.name' => ['required', 'string', 'max:150'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                return ProductCategory::create($record)->fresh()->load(['branch', 'parent', 'children', 'products']);
            });
        });

        return ProductCategoryResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:product_categories,id'],
            'records.*.branch_id' => ['sometimes', 'uuid', 'exists:branches,id'],
            'records.*.name' => ['sometimes', 'string', 'max:150'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        foreach ($data['records'] as $index => $record) {
            if (array_key_exists('parent_id', $record) && $record['parent_id'] === $record['id']) {
                throw ValidationException::withMessages([
                    "records.{$index}.parent_id" => ['The parent_id cannot be the same as the category id.'],
                ]);
            }
        }

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = ProductCategory::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh()->load(['branch', 'parent', 'children', 'products']);
            });
        });

        return ProductCategoryResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:product_categories,id'],
        ]);

        DB::transaction(function () use ($data) {
            ProductCategory::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateProductCategory(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'name' => [$required, 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
