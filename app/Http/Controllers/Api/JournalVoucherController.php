<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JournalVoucherResource;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class JournalVoucherController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(JournalVoucher::class)
            ->with('items')
            ->allowedIncludes(['items', 'branch', 'currency'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('voucher_no', 'like', "%{$value}%")
                            ->orWhere('reference', 'like', "%{$value}%")
                            ->orWhere('narration', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('currency_id'),
                AllowedFilter::callback('date_from', function (Builder $query, mixed $value) {
                    $query->whereDate('voucher_date', '>=', $value);
                }),
                AllowedFilter::callback('date_to', function (Builder $query, mixed $value) {
                    $query->whereDate('voucher_date', '<=', $value);
                }),
            ])
            ->allowedSorts([
                'id',
                'voucher_no',
                'voucher_date',
                'status',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return JournalVoucherResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateJournalVoucher($request);

        $journalVoucher = DB::transaction(function () use ($data) {
            $items = $data['items'] ?? [];

            unset($data['items'], $data['deleted_item_ids']);

            $journalVoucher = JournalVoucher::create($data);

            foreach ($items as $item) {
                $journalVoucher->items()->create([
                    'chart_of_account_id' => $item['chart_of_account_id'],
                    'description' => $item['description'] ?? null,
                    'debit' => $item['debit'] ?? 0,
                    'credit' => $item['credit'] ?? 0,
                ]);
            }

            return $journalVoucher->load('items');
        });

        return new JournalVoucherResource($journalVoucher);
    }

    public function show(JournalVoucher $journalVoucher)
    {
        return new JournalVoucherResource($journalVoucher->load('items'));
    }

    public function update(Request $request, JournalVoucher $journalVoucher)
    {
        $data = $this->validateJournalVoucher($request, true);

        $journalVoucher = DB::transaction(function () use ($data, $journalVoucher) {
            $items = $data['items'] ?? [];
            $deletedItemIds = $data['deleted_item_ids'] ?? [];

            unset($data['items'], $data['deleted_item_ids']);

            $journalVoucher->update($data);

            if (! empty($deletedItemIds)) {
                JournalVoucherLine::query()
                    ->where('journal_voucher_id', $journalVoucher->id)
                    ->whereIn('id', $deletedItemIds)
                    ->delete();
            }

            foreach ($items as $item) {
                if (! empty($item['id'])) {
                    JournalVoucherLine::query()
                        ->where('journal_voucher_id', $journalVoucher->id)
                        ->where('id', $item['id'])
                        ->update([
                            'chart_of_account_id' => $item['chart_of_account_id'],
                            'description' => $item['description'] ?? null,
                            'debit' => $item['debit'] ?? 0,
                            'credit' => $item['credit'] ?? 0,
                        ]);
                } else {
                    $journalVoucher->items()->create([
                        'chart_of_account_id' => $item['chart_of_account_id'],
                        'description' => $item['description'] ?? null,
                        'debit' => $item['debit'] ?? 0,
                        'credit' => $item['credit'] ?? 0,
                    ]);
                }
            }

            return $journalVoucher->load('items');
        });

        return new JournalVoucherResource($journalVoucher);
    }

    public function destroy(JournalVoucher $journalVoucher)
    {
        DB::transaction(function () use ($journalVoucher) {
            $journalVoucher->items()->delete();
            $journalVoucher->delete();
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
            'records.*.voucher_no' => ['required', 'string', 'max:40', 'unique:journal_vouchers,voucher_no'],
            'records.*.voucher_date' => ['required', 'date'],
            'records.*.currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'records.*.exchange_rate' => ['nullable', 'numeric', 'min:0'],
            'records.*.reference' => ['nullable', 'string', 'max:120'],
            'records.*.narration' => ['nullable', 'string'],
            'records.*.status' => ['nullable', 'in:draft,posted,cancelled'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.approved' => ['nullable', 'boolean'],
            'records.*.voided' => ['nullable', 'boolean'],
            'records.*.voided_reason' => ['nullable', 'string'],
            'records.*.voided_date' => ['nullable', 'date'],
            'records.*.voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
            'records.*.items' => ['required', 'array', 'min:1'],
            'records.*.items.*.chart_of_account_id' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
            'records.*.items.*.description' => ['nullable', 'string', 'max:200'],
            'records.*.items.*.debit' => ['nullable', 'numeric', 'min:0'],
            'records.*.items.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $items = $record['items'];

                unset($record['items']);

                $journalVoucher = JournalVoucher::create($record);

                foreach ($items as $item) {
                    $journalVoucher->items()->create([
                        'chart_of_account_id' => $item['chart_of_account_id'],
                        'description' => $item['description'] ?? null,
                        'debit' => $item['debit'] ?? 0,
                        'credit' => $item['credit'] ?? 0,
                    ]);
                }

                return $journalVoucher->load('items');
            });
        });

        return JournalVoucherResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:journal_vouchers,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.voucher_no' => ['sometimes', 'required', 'string', 'max:40'],
            'records.*.voucher_date' => ['sometimes', 'required', 'date'],
            'records.*.currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'records.*.exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'records.*.narration' => ['sometimes', 'nullable', 'string'],
            'records.*.status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.approved' => ['sometimes', 'nullable', 'boolean'],
            'records.*.voided' => ['sometimes', 'nullable', 'boolean'],
            'records.*.voided_reason' => ['sometimes', 'nullable', 'string'],
            'records.*.voided_date' => ['sometimes', 'nullable', 'date'],
            'records.*.voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'records.*.items' => ['sometimes', 'array'],
            'records.*.items.*.id' => ['nullable', 'uuid', 'exists:journal_voucher_lines,id'],
            'records.*.items.*.chart_of_account_id' => ['required_with:records.*.items', 'uuid', 'exists:chart_of_accounts,id'],
            'records.*.items.*.description' => ['nullable', 'string', 'max:200'],
            'records.*.items.*.debit' => ['nullable', 'numeric', 'min:0'],
            'records.*.items.*.credit' => ['nullable', 'numeric', 'min:0'],
            'records.*.deleted_item_ids' => ['nullable', 'array'],
            'records.*.deleted_item_ids.*' => ['uuid', 'exists:journal_voucher_lines,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $journalVoucher = JournalVoucher::findOrFail($record['id']);

                if (array_key_exists('voucher_no', $record)) {
                    validator($record, [
                        'voucher_no' => ['required', 'string', 'max:40', 'unique:journal_vouchers,voucher_no,'.$journalVoucher->id],
                    ])->validate();
                }

                $items = $record['items'] ?? null;
                $deletedItemIds = $record['deleted_item_ids'] ?? [];

                unset($record['id'], $record['items'], $record['deleted_item_ids']);

                $journalVoucher->update($record);

                if (! empty($deletedItemIds)) {
                    JournalVoucherLine::query()
                        ->where('journal_voucher_id', $journalVoucher->id)
                        ->whereIn('id', $deletedItemIds)
                        ->delete();
                }

                if (is_array($items)) {
                    foreach ($items as $item) {
                        if (! empty($item['id'])) {
                            JournalVoucherLine::query()
                                ->where('journal_voucher_id', $journalVoucher->id)
                                ->where('id', $item['id'])
                                ->update([
                                    'chart_of_account_id' => $item['chart_of_account_id'],
                                    'description' => $item['description'] ?? null,
                                    'debit' => $item['debit'] ?? 0,
                                    'credit' => $item['credit'] ?? 0,
                                ]);
                        } else {
                            $journalVoucher->items()->create([
                                'chart_of_account_id' => $item['chart_of_account_id'],
                                'description' => $item['description'] ?? null,
                                'debit' => $item['debit'] ?? 0,
                                'credit' => $item['credit'] ?? 0,
                            ]);
                        }
                    }
                }

                return $journalVoucher->load('items');
            });
        });

        return JournalVoucherResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:journal_vouchers,id'],
        ]);

        DB::transaction(function () use ($data) {
            JournalVoucherLine::query()
                ->whereIn('journal_voucher_id', $data['ids'])
                ->delete();

            JournalVoucher::query()
                ->whereIn('id', $data['ids'])
                ->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateJournalVoucher(Request $request, bool $partial = false, ?string $ignoreId = null): array
    {
        $required = $partial ? 'sometimes' : 'required';

        $voucherNoRules = [$required, 'string', 'max:40', 'unique:journal_vouchers,voucher_no'];

        if ($ignoreId) {
            $voucherNoRules = [$required, 'string', 'max:40', 'unique:journal_vouchers,voucher_no,'.$ignoreId];
        }

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'voucher_no' => $voucherNoRules,
            'voucher_date' => [$required, 'date'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'narration' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'voided' => ['sometimes', 'nullable', 'boolean'],
            'voided_reason' => ['sometimes', 'nullable', 'string'],
            'voided_date' => ['sometimes', 'nullable', 'date'],
            'voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'items' => [$partial ? 'sometimes' : 'required', 'array', 'min:1'],
            'items.*.id' => ['nullable', 'uuid', 'exists:journal_voucher_lines,id'],
            'items.*.chart_of_account_id' => ['required_with:items', 'uuid', 'exists:chart_of_accounts,id'],
            'items.*.description' => ['nullable', 'string', 'max:200'],
            'items.*.debit' => ['nullable', 'numeric', 'min:0'],
            'items.*.credit' => ['nullable', 'numeric', 'min:0'],
            'deleted_item_ids' => ['nullable', 'array'],
            'deleted_item_ids.*' => ['uuid', 'exists:journal_voucher_lines,id'],
        ]);
    }
}
