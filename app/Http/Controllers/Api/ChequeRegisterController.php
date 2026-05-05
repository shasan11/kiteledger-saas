<?php

namespace App\Http\Controllers\Api;

use App\Models\ChequeRegister;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ChequeRegisterController extends BaseCrudApiController
{
    protected string $modelClass = ChequeRegister::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'branch',
        'account',
        'relatedAccount',
        'receiverRelatedAccount',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'account' => 'account_id',
        'relatedAccount' => 'related_account_id',
        'receiverRelatedAccount' => 'receiver_related_account_id',
    ];

    protected array $searchable = [
        'cheque_no',
        'payee_name',
        'notes',
        'status',
        'direction',

        'branch.name',
        'branch.code',

        'account.name',
        'account.code',

        'relatedAccount.name',
        'relatedAccount.code',
    ];

    protected array $filterable = [
        'branch_id',
        'account_id',
        'related_account_id',
        'receiver_related_account_id',
        'direction',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'void',
    ];

    protected array $dateRangeFilters = [
        'cheque_date' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'cheque_no',
        'cheque_date',
        'issued_date',
        'received_date',
        'cleared_date',
        'payee_name',
        'amount',
        'direction',
        'status',
        'approved',
        'void',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'cheque_no' => ['required', 'string', 'max:80'],
        'cheque_date' => ['required', 'date'],
        'issued_date' => ['required', 'date'],
        'received_date' => ['nullable', 'date'],
        'payee_name' => ['nullable', 'string', 'max:150'],
        'cleared_date' => ['nullable', 'date'],
        'direction' => ['required', 'in:issued,received'],
        'account_id' => ['required', 'uuid', 'exists:accounts,id'],
        'related_account_id' => ['required', 'uuid', 'exists:accounts,id'],
        'receiver_related_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'amount' => ['required', 'numeric', 'min:0.01'],
        'status' => ['required', 'in:pending,cleared,bounced,cancelled'],
        'notes' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'approved' => ['nullable', 'boolean'],
        'approved_at' => ['nullable', 'date'],
        'approved_by_id' => ['nullable', 'integer', 'exists:users,id'],
        'void' => ['nullable', 'boolean'],
        'voided_reason' => ['nullable', 'string'],
        'voided_at' => ['nullable', 'date'],
        'voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
        'exchange_rate' => ['nullable', 'numeric', 'min:0.000001'],
        'total' => ['nullable', 'numeric', 'min:0'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules($request));
    }
}
