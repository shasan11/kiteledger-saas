<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CashTransferLineResource;
use App\Models\CashTransferLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CashTransferLineController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(CashTransferLine::class)
            ->allowedIncludes(...['cashTransfer', 'toBankAccount'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where('description', 'like', "%{$value}%");
                }),
                AllowedFilter::exact('cash_transfer_id'),
                AllowedFilter::exact('to_bank_account_id'),
                AllowedFilter::callback('date_from', function (Builder $query, mixed $value) {
                    $query->whereDate('created_at', '>=', $value);
                }),
                AllowedFilter::callback('date_to', function (Builder $query, mixed $value) {
                    $query->whereDate('created_at', '<=', $value);
                }),
            ])
            ->allowedSorts([
                'id',
                'amount',
                'exchange_rate_to_default',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return CashTransferLineResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateCashTransferLine($request);

        $record = CashTransferLine::create($data);

        return new CashTransferLineResource($record->fresh());
    }

    public function show(CashTransferLine $cashTransferLine)
    {
        return new CashTransferLineResource($cashTransferLine);
    }

    public function update(Request $request, CashTransferLine $cashTransferLine)
    {
        $data = $this->validateCashTransferLine($request, true);

        $cashTransferLine->update($data);

        return new CashTransferLineResource($cashTransferLine->fresh());
    }

    public function destroy(CashTransferLine $cashTransferLine)
    {
        $cashTransferLine->delete();

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.cash_transfer_id' => ['required', 'uuid', 'exists:cash_transfers,id'],
            'records.*.to_bank_account_id' => ['required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.exchange_rate_to_default' => ['nullable', 'numeric', 'min:0'],
            'records.*.amount' => ['required', 'numeric', 'min:0.01'],
            'records.*.description' => ['nullable', 'string', 'max:200'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => CashTransferLine::create($record));
        });

        return CashTransferLineResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:cash_transfer_lines,id'],
            'records.*.cash_transfer_id' => ['sometimes', 'required', 'uuid', 'exists:cash_transfers,id'],
            'records.*.to_bank_account_id' => ['sometimes', 'required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.exchange_rate_to_default' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.amount' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'records.*.description' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = CashTransferLine::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return CashTransferLineResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:cash_transfer_lines,id'],
        ]);

        DB::transaction(function () use ($data) {
            CashTransferLine::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateCashTransferLine(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'cash_transfer_id' => [$required, 'uuid', 'exists:cash_transfers,id'],
            'to_bank_account_id' => [$required, 'uuid', 'exists:bank_accounts,id'],
            'exchange_rate_to_default' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'amount' => [$required, 'numeric', 'min:0.01'],
            'description' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);
    }
}
