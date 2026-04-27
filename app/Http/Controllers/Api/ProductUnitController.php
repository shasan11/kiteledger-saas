<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ProductUnitResource;
use App\Models\ProductUnit;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ProductUnitController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(ProductUnit::class)
            ->allowedIncludes('branch', 'products')
            ->allowedFilters(
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('symbol', 'like', "%{$value}%")
                            ->orWhere('description', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id')
            )
            ->allowedSorts(
                'id',
                'name',
                'code',
                'symbol',
                'created_at',
                'updated_at'
            )
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ProductUnitResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateProductUnit($request);

        $record = ProductUnit::create($data);

        return new ProductUnitResource($record->fresh()->load(['branch', 'products']));
    }

    public function show(ProductUnit $productUnit)
    {
        return new ProductUnitResource($productUnit->load(['branch', 'products']));
    }

    public function update(Request $request, ProductUnit $productUnit)
    {
        $data = $this->validateProductUnit($request, true);

        $productUnit->update($data);

        return new ProductUnitResource($productUnit->fresh()->load(['branch', 'products']));
    }

    public function destroy(ProductUnit $productUnit)
    {
        DB::transaction(function () use ($productUnit) {
            $productUnit->delete();
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
            'records.*.name' => ['required', 'string', 'max:100'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'records.*.symbol' => ['sometimes', 'nullable', 'string', 'max:30'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                return ProductUnit::create($record)->fresh()->load(['branch', 'products']);
            });
        });

        return ProductUnitResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:product_units,id'],
            'records.*.branch_id' => ['sometimes', 'uuid', 'exists:branches,id'],
            'records.*.name' => ['sometimes', 'string', 'max:100'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'records.*.symbol' => ['sometimes', 'nullable', 'string', 'max:30'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = ProductUnit::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh()->load(['branch', 'products']);
            });
        });

        return ProductUnitResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:product_units,id'],
        ]);

        DB::transaction(function () use ($data) {
            ProductUnit::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateProductUnit(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'name' => [$required, 'string', 'max:100'],
            'code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'symbol' => ['sometimes', 'nullable', 'string', 'max:30'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
