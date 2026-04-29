<?php

namespace App\Http\Controllers\Api;

use App\Models\Branch;
use App\Models\ContactGroup;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ContactGroupController extends BaseCrudApiController
{
    protected string $modelClass = ContactGroup::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'parent',
        'contacts',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'parent' => 'parent_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'branch.name',
        'branch.code',
        'parent.name',
    ];

    protected array $filterable = [
        'branch_id',
        'parent_id',
    ];

    protected array $booleanFilters = [
        'active',
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
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
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
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'parent_id' => ['sometimes', 'nullable', 'uuid', 'exists:contact_groups,id'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    /**
     * Force branch assignment on create.
     */
    protected function applyBranchToCreatePayload(array $data, Request $request): array
    {
        if (!empty($data['branch_id'])) {
            return $data;
        }

        $branchId =
            $request->input('branch_id')
            ?: $request->query('branch_id')
            ?: $request->header('X-Branch-ID')
            ?: $request->user()?->current_branch_id
            ?: $request->user()?->branch_id
            ?: Branch::query()->where('code', 'MAIN')->value('id')
            ?: Branch::query()->value('id');

        if ($branchId) {
            $data['branch_id'] = (string) $branchId;
        }

        return $data;
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        if (
            array_key_exists('parent_id', $parentData)
            && $parentData['parent_id'] !== null
        ) {
            $parent = ContactGroup::query()->find($parentData['parent_id']);

            if (
                $parent
                && $parentData['branch_id'] !== null
                && $parent->branch_id !== null
                && (string) $parent->branch_id !== (string) $parentData['branch_id']
            ) {
                abort(422, 'Parent contact group must belong to the same branch.');
            }
        }

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

        if (
            array_key_exists('parent_id', $parentData)
            && $parentData['parent_id'] !== null
        ) {
            $parent = ContactGroup::query()->find($parentData['parent_id']);

            if (
                $parent
                && $record->branch_id !== null
                && $parent->branch_id !== null
                && (string) $parent->branch_id !== (string) $record->branch_id
            ) {
                abort(422, 'Parent contact group must belong to the same branch.');
            }
        }

        return $parentData;
    }
}