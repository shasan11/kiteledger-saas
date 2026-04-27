<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\ChequeRegisterResource;
use App\Models\ChequeRegister;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class ChequeRegisterController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(ChequeRegister::class)
            ->allowedIncludes(['branch', 'bankAccount', 'account'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('cheque_no', 'like', "%{$value}%")
                            ->orWhere('payee_name', 'like', "%{$value}%")
                            ->orWhere('notes', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('approved'),
                AllowedFilter::exact('voided'),
                AllowedFilter::exact('direction'),
                AllowedFilter::exact('status'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('bank_account_id'),
                AllowedFilter::exact('account_id'),
                AllowedFilter::callback('date_from', function (Builder $query, mixed $value) {
                    $query->whereDate('cheque_date', '>=', $value);
                }),
                AllowedFilter::callback('date_to', function (Builder $query, mixed $value) {
                    $query->whereDate('cheque_date', '<=', $value);
                }),
            ])
            ->allowedSorts([
                'id',
                'cheque_no',
                'cheque_date',
                'issued_date',
                'received_date',
                'cleared_date',
                'payee_name',
                'amount',
                'status',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return ChequeRegisterResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateChequeRegister($request);

        $record = ChequeRegister::create($data);

        return new ChequeRegisterResource($record->fresh());
    }

    public function show(ChequeRegister $chequeRegister)
    {
        return new ChequeRegisterResource($chequeRegister);
    }

    public function update(Request $request, ChequeRegister $chequeRegister)
    {
        $data = $this->validateChequeRegister($request, true);

        $chequeRegister->update($data);

        return new ChequeRegisterResource($chequeRegister->fresh());
    }

    public function destroy(ChequeRegister $chequeRegister)
    {
        DB::transaction(function () use ($chequeRegister) {
            $chequeRegister->delete();
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
            'records.*.cheque_no' => ['required', 'string', 'max:80'],
            'records.*.cheque_date' => ['required', 'date'],
            'records.*.issued_date' => ['required', 'date'],
            'records.*.received_date' => ['required', 'date'],
            'records.*.payee_name' => ['nullable', 'string', 'max:150'],
            'records.*.cleared_date' => ['nullable', 'date'],
            'records.*.direction' => ['required', 'in:issued,received'],
            'records.*.bank_account_id' => ['required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'records.*.amount' => ['required', 'numeric', 'min:0.01'],
            'records.*.status' => ['required', 'in:pending,cleared,bounced,cancelled'],
            'records.*.notes' => ['nullable', 'string'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.approved' => ['nullable', 'boolean'],
            'records.*.voided' => ['nullable', 'boolean'],
            'records.*.voided_reason' => ['nullable', 'string'],
            'records.*.voided_date' => ['nullable', 'date'],
            'records.*.voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => ChequeRegister::create($record));
        });

        return ChequeRegisterResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:cheque_registers,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.cheque_no' => ['sometimes', 'required', 'string', 'max:80'],
            'records.*.cheque_date' => ['sometimes', 'required', 'date'],
            'records.*.issued_date' => ['sometimes', 'required', 'date'],
            'records.*.received_date' => ['sometimes', 'required', 'date'],
            'records.*.payee_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'records.*.cleared_date' => ['sometimes', 'nullable', 'date'],
            'records.*.direction' => ['sometimes', 'required', 'in:issued,received'],
            'records.*.bank_account_id' => ['sometimes', 'required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'records.*.amount' => ['sometimes', 'required', 'numeric', 'min:0.01'],
            'records.*.status' => ['sometimes', 'required', 'in:pending,cleared,bounced,cancelled'],
            'records.*.notes' => ['sometimes', 'nullable', 'string'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.approved' => ['sometimes', 'nullable', 'boolean'],
            'records.*.voided' => ['sometimes', 'nullable', 'boolean'],
            'records.*.voided_reason' => ['sometimes', 'nullable', 'string'],
            'records.*.voided_date' => ['sometimes', 'nullable', 'date'],
            'records.*.voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = ChequeRegister::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return ChequeRegisterResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:cheque_registers,id'],
        ]);

        DB::transaction(function () use ($data) {
            ChequeRegister::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateChequeRegister(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'cheque_no' => [$required, 'string', 'max:80'],
            'cheque_date' => [$required, 'date'],
            'issued_date' => [$required, 'date'],
            'received_date' => [$required, 'date'],
            'payee_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'cleared_date' => ['sometimes', 'nullable', 'date'],
            'direction' => [$required, 'in:issued,received'],
            'bank_account_id' => [$required, 'uuid', 'exists:bank_accounts,id'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'amount' => [$required, 'numeric', 'min:0.01'],
            'status' => [$required, 'in:pending,cleared,bounced,cancelled'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'voided' => ['sometimes', 'nullable', 'boolean'],
            'voided_reason' => ['sometimes', 'nullable', 'string'],
            'voided_date' => ['sometimes', 'nullable', 'date'],
            'voided_by_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
