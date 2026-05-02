<?php

namespace App\Http\Controllers\Api;

use App\Models\BankAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BankAccountController extends BaseCrudApiController
{
    protected string $modelClass = BankAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

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
        'currency_id',
    ];

    protected array $booleanFilters = [
        'active',
    ];

    protected array $sortable = [
        'id',
        'display_name',
        'code',
        'type',
        'opening_balance',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'created_at';

    protected array $storeRules = [
        // backend-owned fields
        'branch_id' => ['exclude'],
        'code' => ['exclude'],
        'account_id' => ['exclude'],
        'is_system_generated' => ['exclude'],
        'user_add_id' => ['exclude'],

        // frontend fields
        'type' => ['required', 'in:bank,cash'],
        'display_name' => ['required', 'string', 'max:150'],
        'currency_id' => ['required', 'uuid', 'exists:currencies,id'],

        'description' => ['nullable', 'string'],
        'bank_name' => ['nullable', 'string', 'max:150'],
        'account_name' => ['nullable', 'string', 'max:150'],
        'account_number' => ['nullable', 'string', 'max:80'],
        'account_type' => ['nullable', 'string', 'max:50'],
        'swift_code' => ['nullable', 'string', 'max:50'],

        'opening_balance' => ['nullable', 'numeric'],
        'active' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            // backend-owned fields
            'branch_id' => ['exclude'],
            'code' => ['exclude'],
            'account_id' => ['exclude'],
            'is_system_generated' => ['exclude'],
            'user_add_id' => ['exclude'],

            // frontend fields
            'type' => ['sometimes', 'required', 'in:bank,cash'],
            'display_name' => ['sometimes', 'required', 'string', 'max:150'],
            'currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],

            'description' => ['sometimes', 'nullable', 'string'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],

            'opening_balance' => ['sometimes', 'nullable', 'numeric'],
            'active' => ['sometimes', 'nullable', 'boolean'],
        ];
    }
}