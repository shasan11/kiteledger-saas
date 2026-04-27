<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\WarehouseResource;
use App\Models\Warehouse;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class WarehouseController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(Warehouse::class)
            ->allowedIncludes('branch', 'products')
            ->allowedFilters(
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('phone', 'like', "%{$value}%")
                            ->orWhere('email', 'like', "%{$value}%")
                            ->orWhere('address', 'like', "%{$value}%")
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
                'created_at',
                'updated_at'
            )
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return WarehouseResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateWarehouse($request);

        $record = Warehouse::create($data);

        return new WarehouseResource($record->fresh()->load(['branch', 'products']));
    }

    public function show(Warehouse $warehouse)
    {
        return new WarehouseResource($warehouse->load(['branch', 'products']));
    }

    public function update(Request $request, Warehouse $warehouse)
    {
        $data = $this->validateWarehouse($request, true);

        $warehouse->update($data);

        return new WarehouseResource($warehouse->fresh()->load(['branch', 'products']));
    }

    public function destroy(Warehouse $warehouse)
    {
        DB::transaction(function () use ($warehouse) {
            $warehouse->delete();
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
            'records.*.phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'records.*.email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'records.*.address' => ['sometimes', 'nullable', 'string'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                return Warehouse::create($record)->fresh()->load(['branch', 'products']);
            });
        });

        return WarehouseResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:warehouses,id'],
            'records.*.branch_id' => ['sometimes', 'uuid', 'exists:branches,id'],
            'records.*.name' => ['sometimes', 'string', 'max:150'],
            'records.*.code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'records.*.email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'records.*.address' => ['sometimes', 'nullable', 'string'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = Warehouse::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh()->load(['branch', 'products']);
            });
        });

        return WarehouseResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:warehouses,id'],
        ]);

        DB::transaction(function () use ($data) {
            Warehouse::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateWarehouse(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'name' => [$required, 'string', 'max:150'],
            'code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
