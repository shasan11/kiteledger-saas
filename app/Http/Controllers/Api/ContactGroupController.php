<?php

namespace App\Http\Controllers\Api;

use App\Models\ContactGroup;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ContactGroupController extends BaseCrudApiController
{
    protected string $modelClass = ContactGroup::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'parent',
        'contacts',
    ];

    protected array $relationDetails = [
        'parent' => 'parent_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'parent.name',
    ];

    protected array $filterable = [
        'parent_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'branch_id',
        'parent_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'parent_id' => ['nullable', 'uuid', 'exists:contact_groups,id'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
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
            abort(422, 'Parent cannot be the same as the current contact group.');
        }

        return $parentData;
    }
}
