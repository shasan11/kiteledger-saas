<?php

namespace App\Http\Controllers\Api;

use App\Models\CreditTerm;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CreditTermController extends BaseCrudApiController
{
    protected string $modelClass = CreditTerm::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['name', 'description'];

    protected array $filterable = [];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'days', 'created_at', 'updated_at'];

    protected string $defaultSort = 'days';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'days' => ['nullable', 'integer', 'min:0'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'days' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
