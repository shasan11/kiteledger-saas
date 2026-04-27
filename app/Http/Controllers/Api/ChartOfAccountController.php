<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChartOfAccountResource;
use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ChartOfAccountController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(ChartOfAccount::class)
            ->allowedIncludes(...['branch', 'account', 'currency'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('description', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('account_id'),
                AllowedFilter::exact('currency_id'),
                AllowedFilter::exact('is_system_generated'),
            ])
            ->allowedSorts([
                'id',
                'code',
                'name',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ChartOfAccountResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateChartOfAccount($request);

        $record = ChartOfAccount::create($data);

        return new ChartOfAccountResource($record->fresh());
    }

    public function show(ChartOfAccount $chartOfAccount)
    {
        return new ChartOfAccountResource($chartOfAccount);
    }

    public function update(Request $request, ChartOfAccount $chartOfAccount)
    {
        $data = $this->validateChartOfAccount($request, true, $chartOfAccount->id);

        $chartOfAccount->update($data);

        return new ChartOfAccountResource($chartOfAccount->fresh());
    }

    public function destroy(ChartOfAccount $chartOfAccount)
    {
        $chartOfAccount->delete();

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'records.*.account_id' => ['required', 'uuid', 'exists:accounts,id'],
            'records.*.code' => ['required', 'string', 'max:30', 'unique:chart_of_accounts,code'],
            'records.*.name' => ['required', 'string', 'max:150'],
            'records.*.description' => ['nullable', 'string'],
            'records.*.currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'records.*.is_system_generated' => ['nullable', 'boolean'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => ChartOfAccount::create($record));
        });

        return ChartOfAccountResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.account_id' => ['sometimes', 'required', 'uuid', 'exists:accounts,id'],
            'records.*.code' => ['sometimes', 'required', 'string', 'max:30'],
            'records.*.name' => ['sometimes', 'required', 'string', 'max:150'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'records.*.is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = ChartOfAccount::findOrFail($record['id']);

                if (array_key_exists('code', $record)) {
                    validator($record, [
                        'code' => ['required', 'string', 'max:30', 'unique:chart_of_accounts,code,'.$model->id],
                    ])->validate();
                }

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return ChartOfAccountResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
        ]);

        DB::transaction(function () use ($data) {
            ChartOfAccount::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateChartOfAccount(Request $request, bool $partial = false, ?string $ignoreId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';

        $codeRules = [$required, 'string', 'max:30', 'unique:chart_of_accounts,code'];

        if ($ignoreId) {
            $codeRules = [$required, 'string', 'max:30', 'unique:chart_of_accounts,code,'.$ignoreId];
        }

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'account_id' => [$required, 'uuid', 'exists:accounts,id'],
            'code' => $codeRules,
            'name' => [$required, 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
