<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\CashTransferResource;
use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class CashTransferController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(CashTransfer::class)
            ->with('items')
            ->allowedIncludes(...['items', 'fromBankAccount', 'currency', 'branch'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('transfer_no', 'like', "%{$value}%")
                            ->orWhere('reference', 'like', "%{$value}%")
                            ->orWhere('notes', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('from_bank_account_id'),
                AllowedFilter::exact('currency_id'),
                AllowedFilter::callback('date_from', function (Builder $query, mixed $value) {
                    $query->whereDate('transfer_date', '>=', $value);
                }),
                AllowedFilter::callback('date_to', function (Builder $query, mixed $value) {
                    $query->whereDate('transfer_date', '<=', $value);
                }),
            ])
            ->allowedSorts([
                'id',
                'transfer_no',
                'transfer_date',
                'total_amount',
                'status',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return CashTransferResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateCashTransfer($request);

        $cashTransfer = DB::transaction(function () use ($data) {
            $items = $data['items'] ?? [];

            unset($data['items'], $data['deleted_item_ids']);

            $data['total_amount'] = collect($items)->sum('amount');

            $cashTransfer = CashTransfer::create($data);

            foreach ($items as $item) {
                $cashTransfer->items()->create([
                    'to_bank_account_id' => $item['to_bank_account_id'],
                    'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                    'description' => $item['description'] ?? null,
                    'amount' => $item['amount'],
                ]);
            }

            return $cashTransfer->load('items');
        });

        return new CashTransferResource($cashTransfer);
    }

    public function show(CashTransfer $cashTransfer)
    {
        return new CashTransferResource($cashTransfer->load('items'));
    }

    public function update(Request $request, CashTransfer $cashTransfer)
    {
        $data = $this->validateCashTransfer($request, true);

        $cashTransfer = DB::transaction(function () use ($data, $cashTransfer) {
            $items = $data['items'] ?? [];
            $deletedItemIds = $data['deleted_item_ids'] ?? [];

            unset($data['items'], $data['deleted_item_ids']);

            $cashTransfer->update($data);

            if (! empty($deletedItemIds)) {
                CashTransferLine::query()
                    ->where('cash_transfer_id', $cashTransfer->id)
                    ->whereIn('id', $deletedItemIds)
                    ->delete();
            }

            foreach ($items as $item) {
                if (! empty($item['id'])) {
                    CashTransferLine::query()
                        ->where('cash_transfer_id', $cashTransfer->id)
                        ->where('id', $item['id'])
                        ->update([
                            'to_bank_account_id' => $item['to_bank_account_id'],
                            'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                            'description' => $item['description'] ?? null,
                            'amount' => $item['amount'],
                        ]);
                } else {
                    $cashTransfer->items()->create([
                        'to_bank_account_id' => $item['to_bank_account_id'],
                        'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                        'description' => $item['description'] ?? null,
                        'amount' => $item['amount'],
                    ]);
                }
            }

            $cashTransfer->total_amount = $cashTransfer->items()->sum('amount');
            $cashTransfer->save();

            return $cashTransfer->load('items');
        });

        return new CashTransferResource($cashTransfer);
    }

    public function destroy(CashTransfer $cashTransfer)
    {
        DB::transaction(function () use ($cashTransfer) {
            $cashTransfer->items()->delete();
            $cashTransfer->delete();
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
            'records.*.transfer_no' => ['nullable', 'string', 'max:40'],
            'records.*.transfer_date' => ['required', 'date'],
            'records.*.from_bank_account_id' => ['required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.reference' => ['nullable', 'string', 'max:120'],
            'records.*.currency_id' => ['required', 'uuid', 'exists:currencies,id'],
            'records.*.notes' => ['nullable', 'string'],
            'records.*.status' => ['nullable', 'in:draft,posted,cancelled'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.approved' => ['nullable', 'boolean'],
            'records.*.exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'records.*.voided' => ['nullable', 'boolean'],
            'records.*.voided_reason' => ['nullable', 'string'],
            'records.*.voided_date' => ['nullable', 'date'],
            'records.*.voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
            'records.*.items' => ['required', 'array', 'min:1'],
            'records.*.items.*.to_bank_account_id' => ['required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.items.*.exchange_rate_to_default' => ['nullable', 'numeric', 'min:0'],
            'records.*.items.*.description' => ['nullable', 'string', 'max:200'],
            'records.*.items.*.amount' => ['required', 'numeric', 'min:0.01'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $items = $record['items'];

                unset($record['items']);

                $record['total_amount'] = collect($items)->sum('amount');

                $cashTransfer = CashTransfer::create($record);

                foreach ($items as $item) {
                    $cashTransfer->items()->create([
                        'to_bank_account_id' => $item['to_bank_account_id'],
                        'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                        'description' => $item['description'] ?? null,
                        'amount' => $item['amount'],
                    ]);
                }

                return $cashTransfer->load('items');
            });
        });

        return CashTransferResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:cash_transfers,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.transfer_no' => ['sometimes', 'nullable', 'string', 'max:40'],
            'records.*.transfer_date' => ['sometimes', 'required', 'date'],
            'records.*.from_bank_account_id' => ['sometimes', 'required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'records.*.currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],
            'records.*.notes' => ['sometimes', 'nullable', 'string'],
            'records.*.status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.approved' => ['sometimes', 'nullable', 'boolean'],
            'records.*.exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.voided' => ['sometimes', 'nullable', 'boolean'],
            'records.*.voided_reason' => ['sometimes', 'nullable', 'string'],
            'records.*.voided_date' => ['sometimes', 'nullable', 'date'],
            'records.*.voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'records.*.items' => ['sometimes', 'array'],
            'records.*.items.*.id' => ['nullable', 'uuid', 'exists:cash_transfer_lines,id'],
            'records.*.items.*.to_bank_account_id' => ['required_with:records.*.items', 'uuid', 'exists:bank_accounts,id'],
            'records.*.items.*.exchange_rate_to_default' => ['nullable', 'numeric', 'min:0'],
            'records.*.items.*.description' => ['nullable', 'string', 'max:200'],
            'records.*.items.*.amount' => ['required_with:records.*.items', 'numeric', 'min:0.01'],
            'records.*.deleted_item_ids' => ['nullable', 'array'],
            'records.*.deleted_item_ids.*' => ['uuid', 'exists:cash_transfer_lines,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $cashTransfer = CashTransfer::findOrFail($record['id']);

                $items = $record['items'] ?? null;
                $deletedItemIds = $record['deleted_item_ids'] ?? [];

                unset($record['id'], $record['items'], $record['deleted_item_ids']);

                $cashTransfer->update($record);

                if (! empty($deletedItemIds)) {
                    CashTransferLine::query()
                        ->where('cash_transfer_id', $cashTransfer->id)
                        ->whereIn('id', $deletedItemIds)
                        ->delete();
                }

                if (is_array($items)) {
                    foreach ($items as $item) {
                        if (! empty($item['id'])) {
                            CashTransferLine::query()
                                ->where('cash_transfer_id', $cashTransfer->id)
                                ->where('id', $item['id'])
                                ->update([
                                    'to_bank_account_id' => $item['to_bank_account_id'],
                                    'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                                    'description' => $item['description'] ?? null,
                                    'amount' => $item['amount'],
                                ]);
                        } else {
                            $cashTransfer->items()->create([
                                'to_bank_account_id' => $item['to_bank_account_id'],
                                'exchange_rate_to_default' => $item['exchange_rate_to_default'] ?? 1,
                                'description' => $item['description'] ?? null,
                                'amount' => $item['amount'],
                            ]);
                        }
                    }

                    $cashTransfer->total_amount = $cashTransfer->items()->sum('amount');
                    $cashTransfer->save();
                }

                return $cashTransfer->load('items');
            });
        });

        return CashTransferResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:cash_transfers,id'],
        ]);

        DB::transaction(function () use ($data) {
            CashTransferLine::query()
                ->whereIn('cash_transfer_id', $data['ids'])
                ->delete();

            CashTransfer::query()
                ->whereIn('id', $data['ids'])
                ->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateCashTransfer(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'transfer_no' => ['sometimes', 'nullable', 'string', 'max:40'],
            'transfer_date' => [$required, 'date'],
            'from_bank_account_id' => [$required, 'uuid', 'exists:bank_accounts,id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'currency_id' => [$required, 'uuid', 'exists:currencies,id'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'voided' => ['sometimes', 'nullable', 'boolean'],
            'voided_reason' => ['sometimes', 'nullable', 'string'],
            'voided_date' => ['sometimes', 'nullable', 'date'],
            'voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'items' => [$partial ? 'sometimes' : 'required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'uuid', 'exists:cash_transfer_lines,id'],
            'items.*.to_bank_account_id' => ['required_with:items', 'uuid', 'exists:bank_accounts,id'],
            'items.*.exchange_rate_to_default' => ['nullable', 'numeric', 'min:0'],
            'items.*.description' => ['nullable', 'string', 'max:200'],
            'items.*.amount' => ['required_with:items', 'numeric', 'min:0.01'],
            'deleted_item_ids' => ['nullable', 'array'],
            'deleted_item_ids.*' => ['uuid', 'exists:cash_transfer_lines,id'],
        ]);
    }
}
