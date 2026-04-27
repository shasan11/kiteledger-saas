<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\BankAccountResource;
use App\Models\BankAccount;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\QueryBuilder\AllowedFilter;
use Spatie\QueryBuilder\QueryBuilder;

class BankAccountController extends Controller
{
    public function index(Request $request)
    {
        $perPage = min($request->integer('per_page', 15), 100);

        $records = QueryBuilder::for(BankAccount::class)
            ->allowedIncludes(...['branch', 'currency', 'account'])
            ->allowedFilters([
                AllowedFilter::callback('q', function (Builder $query, mixed $value) {
                    $query->where(function (Builder $query) use ($value) {
                        $query->where('display_name', 'like', "%{$value}%")
                            ->orWhere('code', 'like', "%{$value}%")
                            ->orWhere('bank_name', 'like', "%{$value}%")
                            ->orWhere('account_name', 'like', "%{$value}%")
                            ->orWhere('account_number', 'like', "%{$value}%");
                    });
                }),
                AllowedFilter::exact('active'),
                AllowedFilter::exact('type'),
                AllowedFilter::exact('branch_id'),
                AllowedFilter::exact('currency_id'),
                AllowedFilter::exact('account_id'),
            ])
            ->allowedSorts([
                'id',
                'display_name',
                'code',
                'type',
                'opening_balance',
                'created_at',
                'updated_at',
            ])
            ->defaultSort('-created_at')
            ->paginate($perPage)
            ->appends($request->query());

        return BankAccountResource::collection($records);
    }

    public function store(Request $request)
    {
        $data = $this->validateBankAccount($request);

        $record = BankAccount::create($data);

        return new BankAccountResource($record->fresh());
    }

    public function show(BankAccount $bankAccount)
    {
        return new BankAccountResource($bankAccount);
    }

    public function update(Request $request, BankAccount $bankAccount)
    {
        $data = $this->validateBankAccount($request, true);

        $bankAccount->update($data);

        return new BankAccountResource($bankAccount->fresh());
    }

    public function destroy(BankAccount $bankAccount)
    {
        $bankAccount->delete();

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.branch_id' => ['required', 'uuid', 'exists:branches,id'],
            'records.*.type' => ['required', 'in:bank,cash'],
            'records.*.display_name' => ['required', 'string', 'max:150'],
            'records.*.code' => ['required', 'string', 'max:30'],
            'records.*.currency_id' => ['required', 'uuid', 'exists:currencies,id'],
            'records.*.description' => ['nullable', 'string'],
            'records.*.bank_name' => ['nullable', 'string', 'max:150'],
            'records.*.account_name' => ['nullable', 'string', 'max:150'],
            'records.*.account_number' => ['nullable', 'string', 'max:80'],
            'records.*.account_type' => ['nullable', 'string', 'max:50'],
            'records.*.swift_code' => ['nullable', 'string', 'max:50'],
            'records.*.account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'records.*.opening_balance' => ['nullable', 'numeric'],
            'records.*.active' => ['nullable', 'boolean'],
            'records.*.user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(fn (array $record) => BankAccount::create($record));
        });

        return BankAccountResource::collection($records);
    }

    public function bulkUpdate(Request $request)
    {
        $data = $request->validate([
            'records' => ['required', 'array', 'min:1'],
            'records.*.id' => ['required', 'uuid', 'exists:bank_accounts,id'],
            'records.*.branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'records.*.type' => ['sometimes', 'required', 'in:bank,cash'],
            'records.*.display_name' => ['sometimes', 'required', 'string', 'max:150'],
            'records.*.code' => ['sometimes', 'required', 'string', 'max:30'],
            'records.*.currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],
            'records.*.description' => ['sometimes', 'nullable', 'string'],
            'records.*.bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'records.*.account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'records.*.account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'records.*.account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'records.*.account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'records.*.opening_balance' => ['sometimes', 'nullable', 'numeric'],
            'records.*.active' => ['sometimes', 'nullable', 'boolean'],
            'records.*.user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);

        $records = DB::transaction(function () use ($data) {
            return collect($data['records'])->map(function (array $record) {
                $model = BankAccount::findOrFail($record['id']);

                unset($record['id']);

                $model->update($record);

                return $model->fresh();
            });
        });

        return BankAccountResource::collection($records);
    }

    public function bulkDestroy(Request $request)
    {
        $data = $request->validate([
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required', 'uuid', 'exists:bank_accounts,id'],
        ]);

        DB::transaction(function () use ($data) {
            BankAccount::query()->whereIn('id', $data['ids'])->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    private function validateBankAccount(Request $request, bool $partial = false): array
    {
        $required = $partial ? 'sometimes' : 'required';

        return $request->validate([
            'branch_id' => [$required, 'uuid', 'exists:branches,id'],
            'type' => [$required, 'in:bank,cash'],
            'display_name' => [$required, 'string', 'max:150'],
            'code' => [$required, 'string', 'max:30'],
            'currency_id' => [$required, 'uuid', 'exists:currencies,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'opening_balance' => ['sometimes', 'nullable', 'numeric'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ]);
    }
}
