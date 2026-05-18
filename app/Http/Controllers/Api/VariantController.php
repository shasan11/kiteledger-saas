<?php

namespace App\Http\Controllers\Api;

use App\Models\Variant;
use App\Models\VariantLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class VariantController extends BaseCrudApiController
{
    protected string $modelClass = Variant::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

   

    protected array $relations = [
         
        'variantLines',
    ];

     

    protected array $searchable = [
        'name',
    ];
 

    protected array $booleanFilters = [
        'active',
    ];

    protected array $sortable = [
        'id',
        'name',
        'active',
        'created_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'variantLines',
            'model' => VariantLine::class,
            'foreign_key' => 'variant_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'value' => ['required', 'string', 'max:80'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'value' => ['required', 'string', 'max:80'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        
        'name' => ['required', 'string', 'max:80'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    public function destroy(Request $request, mixed $id)
    {
        $variant = $this->findRecord($id);

        if ($variant->variantLines()->whereHas('productVariantItems')->exists()) {
            $variant->forceFill(['active' => false])->save();

            return response()->json(['message' => 'Variant is used by products and was deactivated.']);
        }

        return parent::destroy($request, $id);
    }

    public function update(Request $request, mixed $id)
    {
        $deletedIds = array_filter((array) $request->input('deleted_item_ids', []));

        if (!empty($deletedIds) && VariantLine::query()
            ->whereIn('id', $deletedIds)
            ->whereHas('productVariantItems')
            ->exists()) {
            throw ValidationException::withMessages([
                'deleted_item_ids' => ['Variant values already used by products cannot be deleted. Deactivate them instead.'],
            ]);
        }

        return parent::update($request, $id);
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
             
            'name' => ['sometimes', 'required', 'string', 'max:80'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateNestedRowBeforeSave(array $row, Model $parent, array $config, bool $isUpdate): array
    {
        if (!empty($row['_destroy']) && !empty($row['id'])) {
            $line = VariantLine::query()->find($row['id']);

            if ($line && $line->productVariantItems()->exists()) {
                throw ValidationException::withMessages([
                    'items' => ['Variant values already used by products cannot be deleted. Deactivate them instead.'],
                ]);
            }
        }

        return $row;
    }
}
