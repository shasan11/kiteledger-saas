<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class BranchController extends BaseCrudApiController
{
    protected string $modelClass = Branch::class;

    protected ?string $permissionPrefix = 'system.branch';

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['code', 'name', 'phone', 'email', 'address'];

    protected array $filterable = [];

    protected array $booleanFilters = [
        'active',
        'is_head_office',
        'is_transaction_enabled',
        'is_pos_enabled',
        'is_warehouse_enabled',
        'is_ai_enabled',
        'is_billing_location_enabled',
        'abbreviated_tax_enabled',
        'track_location',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'code',
        'name',
        'is_head_office',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'code';

    protected array $storeRules = [
        'code' => ['required', 'string', 'max:30', 'unique:branches,code'],
        'name' => ['required', 'string', 'max:120'],
        'phone' => ['nullable', 'string', 'max:40'],
        'email' => ['nullable', 'email', 'max:120'],
        'address' => ['nullable', 'string'],
        'is_head_office' => ['nullable', 'boolean'],
        'is_transaction_enabled' => ['nullable', 'boolean'],
        'is_pos_enabled' => ['nullable', 'boolean'],
        'is_warehouse_enabled' => ['nullable', 'boolean'],
        'is_ai_enabled' => ['nullable', 'boolean'],
        'is_billing_location_enabled' => ['nullable', 'boolean'],
        'abbreviated_tax_enabled' => ['nullable', 'boolean'],
        'track_location' => ['nullable', 'boolean'],
        'logo' => ['nullable', 'string', 'max:255'],
        'favicon' => ['nullable', 'string', 'max:255'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'code' => ['sometimes', 'required', 'string', 'max:30', 'unique:branches,code,' . $record->id . ',id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'address' => ['sometimes', 'nullable', 'string'],
            'is_head_office' => ['sometimes', 'nullable', 'boolean'],
            'is_transaction_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_pos_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_warehouse_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_ai_enabled' => ['sometimes', 'nullable', 'boolean'],
            'is_billing_location_enabled' => ['sometimes', 'nullable', 'boolean'],
            'abbreviated_tax_enabled' => ['sometimes', 'nullable', 'boolean'],
            'track_location' => ['sometimes', 'nullable', 'boolean'],
            'logo' => ['sometimes', 'nullable', 'string', 'max:255'],
            'favicon' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
