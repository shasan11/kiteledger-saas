<?php

namespace App\Http\Controllers\Api;

use App\Models\ChequeRegister;

class ChequeRegisterController extends BaseCrudApiController
{
    protected string $modelClass = ChequeRegister::class;

    protected array $relations = [
        'branch',
        'bankAccount',
        'account',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'bankAccount' => 'bank_account_id',
        'account' => 'account_id',
    ];

    protected array $searchable = [
        'cheque_no',
        'payee_name',
        'notes',
        'status',
        'direction',

        'branch.name',
        'branch.code',

        'bankAccount.display_name',
        'bankAccount.code',
        'bankAccount.bank_name',
        'bankAccount.account_name',
        'bankAccount.account_number',

        'account.name',
        'account.code',
    ];

    protected array $filterable = [
        'branch_id',
        'bank_account_id',
        'account_id',
        'direction',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'voided',
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
        'voided',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected ?string $permissionPrefix = 'cheque-registers';

    protected array $storeRules = [
        'branch_id' => ['required', 'uuid', 'exists:branches,id'],
        'cheque_no' => ['required', 'string', 'max:80'],
        'cheque_date' => ['required', 'date'],
        'issued_date' => ['required', 'date'],
        'received_date' => ['required', 'date'],
        'payee_name' => ['nullable', 'string', 'max:150'],
        'cleared_date' => ['nullable', 'date'],
        'direction' => ['required', 'in:issued,received'],
        'bank_account_id' => ['required', 'uuid', 'exists:bank_accounts,id'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'amount' => ['required', 'numeric', 'min:0.01'],
        'status' => ['required', 'in:pending,cleared,bounced,cancelled'],
        'notes' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'approved' => ['nullable', 'boolean'],
        'voided' => ['nullable', 'boolean'],
        'voided_reason' => ['nullable', 'string'],
        'voided_date' => ['nullable', 'date'],
        'voided_by_id' => ['nullable', 'integer', 'exists:users,id'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];
}