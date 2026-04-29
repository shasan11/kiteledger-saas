<?php

namespace App\Http\Controllers\Api;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ChartOfAccountController extends BaseCrudApiController
{
    protected string $modelClass = ChartOfAccount::class;

    protected array $relations = [
        'branch',
        'account',
        'currency',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'account' => 'account_id',
        'currency' => 'currency_id',
    ];

    protected array $searchable = [
        'code',
        'name',
        'description',

        'branch.name',
        'branch.code',

        'account.name',
        'account.code',

        'currency.name',
        'currency.code',
    ];

    protected array $filterable = [
        'branch_id',
        'account_id',
        'currency_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'code',
        'name',
        'branch_id',
        'account_id',
        'currency_id',
        'is_system_generated',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected ?string $permissionPrefix = 'chart-of-accounts';

    protected array $storeRules = [
        'branch_id' => ['required', 'uuid', 'exists:branches,id'],
        'account_id' => ['required', 'uuid', 'exists:accounts,id'],
        'code' => ['required', 'string', 'max:30', 'unique:chart_of_accounts,code'],
        'name' => ['required', 'string', 'max:150'],
        'description' => ['nullable', 'string'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'is_system_generated' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'required', 'uuid', 'exists:branches,id'],
            'account_id' => ['sometimes', 'required', 'uuid', 'exists:accounts,id'],
            'code' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                'unique:chart_of_accounts,code,' . $record->id . ',id',
            ],
            'name' => ['sometimes', 'required', 'string', 'max:150'],
            'description' => ['sometimes', 'nullable', 'string'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}