<?php

namespace App\Http\Controllers\Api;

use App\Models\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AccountController extends BaseCrudApiController
{
    protected string $modelClass = Account::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'branch',
        'parent',
        'currency',
        'children',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'parent' => 'parent_id',
        'currency' => 'currency_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'nature',
        'description',
        'bank_name',
        'account_name',
        'account_number',
        'account_type',
        'swift_code',
        'branch.name',
        'branch.code',
        'parent.name',
        'parent.code',
        'currency.name',
        'currency.code',
    ];

    protected array $filterable = [
        'branch_id',
        'parent_id',
        'currency_id',
        'nature',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'nature',
        'branch_id',
        'parent_id',
        'currency_id',
        'opening_balance',
        'dr_amount',
        'cr_amount',
        'balance',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],

        'name' => ['required', 'string', 'max:120'],
        'code' => ['nullable', 'string', 'max:30'],

        'nature' => [
            'nullable',
            'string',
            'in:actor,coa,bank,cash,employee',
        ],

        'parent_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],

        'description' => ['nullable', 'string'],

        'bank_name' => ['nullable', 'string', 'max:150'],
        'account_name' => ['nullable', 'string', 'max:150'],
        'account_number' => ['nullable', 'string', 'max:80'],
        'account_type' => ['nullable', 'string', 'max:50'],
        'swift_code' => ['nullable', 'string', 'max:50'],

        'opening_balance' => ['nullable', 'numeric'],
        'dr_amount' => ['nullable', 'numeric'],
        'cr_amount' => ['nullable', 'numeric'],
        'balance' => ['nullable', 'numeric'],

        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],

            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'code' => ['sometimes', 'nullable', 'string', 'max:30'],

            'nature' => [
                'sometimes',
                'nullable',
                'string',
                'in:actor,coa,bank,cash,employee',
            ],

            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],

            'description' => ['sometimes', 'nullable', 'string'],

            'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],

            'opening_balance' => ['sometimes', 'nullable', 'numeric'],
            'dr_amount' => ['sometimes', 'nullable', 'numeric'],
            'cr_amount' => ['sometimes', 'nullable', 'numeric'],
            'balance' => ['sometimes', 'nullable', 'numeric'],

            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        $parentData['nature'] = $parentData['nature'] ?? 'coa';
        $parentData['opening_balance'] = $parentData['opening_balance'] ?? 0;
        $parentData['dr_amount'] = $parentData['dr_amount'] ?? 0;
        $parentData['cr_amount'] = $parentData['cr_amount'] ?? 0;
        $parentData['balance'] = $parentData['balance'] ?? $parentData['opening_balance'] ?? 0;
        $parentData['active'] = $parentData['active'] ?? true;
        $parentData['is_system_generated'] = $parentData['is_system_generated'] ?? false;

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        if (
            array_key_exists('parent_id', $parentData)
            && $parentData['parent_id'] !== null
            && (string) $parentData['parent_id'] === (string) $record->id
        ) {
            abort(422, 'Parent account cannot be the same as the current account.');
        }

        return $parentData;
    }
}