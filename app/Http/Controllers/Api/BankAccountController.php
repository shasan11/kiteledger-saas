<?php

namespace App\Http\Controllers\Api;

use App\Models\BankAccount;

class BankAccountController extends BaseCrudApiController
{
    protected string $modelClass = BankAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'branch',
        'currency',
        'account',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'currency' => 'currency_id',
        'account' => 'account_id',
    ];

    protected array $searchable = [
        'display_name',
        'code',
        'description',
        'bank_name',
        'account_name',
        'account_number',
        'account_type',
        'swift_code',

        'branch.name',
        'branch.code',

        'currency.name',
        'currency.code',

        'account.name',
        'account.code',
    ];

    protected array $filterable = [
        'type',
        'branch_id',
        'currency_id',
        'account_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'display_name',
        'code',
        'type',
        'opening_balance',
        'active',
        'is_system_generated',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],

        'type' => ['required', 'in:bank,cash'],
        'display_name' => ['required', 'string', 'max:150'],
        'code' => ['required', 'string', 'max:30'],

        'currency_id' => ['required', 'uuid', 'exists:currencies,id'],

        'description' => ['nullable', 'string'],
        'bank_name' => ['nullable', 'string', 'max:150'],
        'account_name' => ['nullable', 'string', 'max:150'],
        'account_number' => ['nullable', 'string', 'max:80'],
        'account_type' => ['nullable', 'string', 'max:50'],
        'swift_code' => ['nullable', 'string', 'max:50'],

        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],

        'opening_balance' => ['nullable', 'numeric'],

        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],

        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected array $updateRules = [
        'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],

        'type' => ['sometimes', 'required', 'in:bank,cash'],
        'display_name' => ['sometimes', 'required', 'string', 'max:150'],
        'code' => ['sometimes', 'required', 'string', 'max:30'],

        'currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],

        'description' => ['sometimes', 'nullable', 'string'],
        'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
        'account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
        'account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
        'account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
        'swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],

        'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],

        'opening_balance' => ['sometimes', 'nullable', 'numeric'],

        'active' => ['sometimes', 'nullable', 'boolean'],
        'is_system_generated' => ['sometimes', 'nullable', 'boolean'],

        'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
    ];
}