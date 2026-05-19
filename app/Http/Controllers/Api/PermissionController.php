<?php

namespace App\Http\Controllers\Api;

use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PermissionController extends BaseCrudApiController
{
    protected string $modelClass = Permission::class;

    protected ?string $permissionPrefix = 'hrm.permissions';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;
    protected bool $autoFillBranchOnCreate = false;
    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'branch',
        'roles',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'branch.name',
        'branch.code',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'name';

    protected function storeRules(Request $request): array
    {
        $guardName = $request->input('guard_name', 'web') ?: 'web';

        return [
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'name' => [
                'required',
                'string',
                'max:150',
                Rule::unique('permissions', 'name')->where(fn ($query) => $query->where('guard_name', $guardName)),
            ],
            'guard_name' => ['nullable', 'string', 'max:80'],
            'description' => ['nullable', 'string', 'max:255'],
            'active' => ['nullable', 'boolean'],
            'is_system_generated' => ['nullable', 'boolean'],
            'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $guardName = $request->input('guard_name', $record->guard_name ?: 'web') ?: 'web';

        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name' => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('permissions', 'name')
                    ->where(fn ($query) => $query->where('guard_name', $guardName))
                    ->ignore($record->id),
            ],
            'guard_name' => ['sometimes', 'nullable', 'string', 'max:80'],
            'description' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $parentData['guard_name'] = $parentData['guard_name'] ?: 'web';

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

        if ($record->is_system_generated) {
            unset($parentData['name'], $parentData['guard_name']);
        }

        if (array_key_exists('guard_name', $parentData)) {
            $parentData['guard_name'] = $parentData['guard_name'] ?: 'web';
        }

        return $parentData;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ($record->is_system_generated) {
            return response()->json([
                'message' => 'System generated permission cannot be deleted.',
            ], 422);
        }

        return parent::destroy($request, $id);
    }
}
