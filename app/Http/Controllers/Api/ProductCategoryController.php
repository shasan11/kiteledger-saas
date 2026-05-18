<?php

namespace App\Http\Controllers\Api;

use App\Models\ProductCategory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProductCategoryController extends BaseCrudApiController
{
    protected string $modelClass = ProductCategory::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'parent',
        'children',
        'products',
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
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected function applyFilters(Builder $query, Request $request): void
    {
        parent::applyFilters($query, $request);

        if ($request->boolean('root_only')) {
            $query->whereNull($this->qualifiedColumn('parent_id'));
        }
    }

    protected array $storeRules = [
        'name'                => ['required', 'string', 'max:120'],
        'parent_id'           => ['nullable', 'uuid', 'exists:product_categories,id'],
        'description'         => ['nullable', 'string'],
        'active'              => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id'         => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name'                => ['sometimes', 'required', 'string', 'max:120'],
            'parent_id'           => ['sometimes', 'nullable', 'uuid', 'exists:product_categories,id'],
            'description'         => ['sometimes', 'nullable', 'string'],
            'active'              => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'         => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(
        array $parentData,
        array $nestedData
    ): array {
        $this->validateParent($parentData);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $this->validateParent($parentData, $record);

        return $parentData;
    }

    protected function validateParent(array $parentData, ?Model $record = null): void
    {
        if (
            !array_key_exists('parent_id', $parentData)
            || $parentData['parent_id'] === null
        ) {
            return;
        }

        if (
            $record
            && (string) $parentData['parent_id'] === (string) $record->id
        ) {
            abort(422, 'A product category cannot be its own parent.');
        }

        if ($record && $this->wouldCreateCircularParent($record, $parentData['parent_id'])) {
            abort(422, 'Circular parent category is not allowed.');
        }
    }

    protected function wouldCreateCircularParent(Model $record, string $parentId): bool
    {
        $currentParent = ProductCategory::query()->find($parentId);

        while ($currentParent) {
            if ((string) $currentParent->id === (string) $record->id) {
                return true;
            }

            if (!$currentParent->parent_id) {
                return false;
            }

            $currentParent = ProductCategory::query()->find($currentParent->parent_id);
        }

        return false;
    }
}
