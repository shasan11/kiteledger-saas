<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductCategoryController extends BaseCrudApiController
{
    protected string $modelClass = ProductCategory::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'parent',
        'childrens',
        'products',
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
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id'           => ['nullable', 'uuid', 'exists:branches,id'],
        'name'                => ['required', 'string', 'max:150'],
        'parent_id'           => ['nullable', 'uuid', 'exists:product_categories,id'],
        'description'         => ['nullable', 'string'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id'           => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name'                => ['sometimes', 'required', 'string', 'max:150'],
            'parent_id'           => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'description'         => ['sometimes', 'nullable', 'string'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        // Prevent self-reference as parent
        if (
            array_key_exists('parent_id', $parentData)
            && $parentData['parent_id'] !== null
            && (string) $parentData['parent_id'] === (string) $record->id
        ) {
            abort(422, 'A product category cannot be its own parent.');
        }

        // Ensure parent belongs to same branch
        if (
            array_key_exists('parent_id', $parentData)
            && $parentData['parent_id'] !== null
        ) {
            $parent = ProductCategory::query()->find($parentData['parent_id']);

            if (
                $parent
                && $record->branch_id !== null
                && $parent->branch_id !== null
                && (string) $parent->branch_id !== (string) $record->branch_id
            ) {
                abort(422, 'Parent category must belong to the same branch.');
            }
        }

        return $parentData;
    }
}
