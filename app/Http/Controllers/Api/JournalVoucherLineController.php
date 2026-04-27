<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\JournalVoucherLineResource;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class JournalVoucherLineController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(JournalVoucherLine::class)
            ->allowedIncludes(['journalVoucher', 'chartOfAccount'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where('description', 'like', "%{$value}%");
                }),
                AllowedFilter::exact('journal_voucher_id'),
                AllowedFilter::exact('chart_of_account_id'),
                AllowedFilter::callback('date_from', function (Builder $query, mixed $value) {
                    $query->whereDate('created_at', '>=', $value);
                }),
                AllowedFilter::callback('date_to', function (Builder $query, mixed $value) {
                    $query->whereDate('created_at', '<=', $value);
                }),
            ])
            ->allowedSorts([
                'id',
                'debit',
                'credit',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return JournalVoucherLineResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateJournalVoucherLine($request);

        $record = JournalVoucherLine::create($data);

        return new JournalVoucherLineResource($record->fresh());
    }

    public function show(JournalVoucherLine $journalVoucherLine)
    {
        return new JournalVoucherLineResource($journalVoucherLine);
    }

    public function update(Request $request, JournalVoucherLine $journalVoucherLine)
    {
        $data = $this->validateJournalVoucherLine($request, true);

        $journalVoucherLine->update($data);

        return new JournalVoucherLineResource($journalVoucherLine->fresh());
    }

    public function destroy(JournalVoucherLine $journalVoucherLine)
    {
        $journalVoucherLine->delete();

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.journal_voucher_id' => ['required', 'uuid', 'exists:journal_vouchers,id'],
            'records.*.chart_of_account_id' => ['required', 'uuid', 'exists:chart_of_accounts,id'],
            'records.*.description' => ['nullable', 'string', 'max:200'],
            'records.*.debit' => ['nullable', 'numeric', 'min:0'],
            'records.*.credit' => ['nullable', 'numeric', 'min:0'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => JournalVoucherLine::create($record));
        });

        return JournalVoucherLineResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:journal_voucher_lines,id'],
            'records.*.journal_voucher_id' => ['sometimes', 'required', 'uuid', 'exists:journal_vouchers,id'],
            'records.*.chart_of_account_id' => ['sometimes', 'required', 'uuid', 'exists:chart_of_accounts,id'],
            'records.*.description' => ['sometimes', 'nullable', 'string', 'max:200'],
            'records.*.debit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'records.*.credit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = JournalVoucherLine::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return JournalVoucherLineResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:journal_voucher_lines,id'],
        ]);

        DB::transaction(function () use ($data) {
            JournalVoucherLine::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateJournalVoucherLine(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'journal_voucher_id' => [$required, 'uuid', 'exists:journal_vouchers,id'],
            'chart_of_account_id' => [$required, 'uuid', 'exists:chart_of_accounts,id'],
            'description' => ['sometimes', 'nullable', 'string', 'max:200'],
            'debit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'credit' => ['sometimes', 'nullable', 'numeric', 'min:0'],
        ]);
    }
}
