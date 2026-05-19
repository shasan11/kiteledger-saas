<?php

namespace App\Http\Controllers\Api;

use App\Models\Role;
use App\Models\Permission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Spatie\Permission\PermissionRegistrar;

class RoleController extends BaseCrudApiController
{
    protected string $modelClass = Role::class;

    protected ?string $permissionPrefix = 'hrm.roles';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;
    protected bool $autoFillBranchOnCreate = false;
    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'branch',
        'permissions',
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
        $guardName = $request->input('guard_name', 'web');

        return [
            'branch_id'          => ['nullable', 'uuid', 'exists:branches,id'],
            'name'               => [
                'required',
                'string',
                'max:150',
                Rule::unique('roles', 'name')->where(fn ($query) => $query->where('guard_name', $guardName)),
            ],
            'guard_name'         => ['nullable', 'string', 'max:80'],
            'description'        => ['nullable', 'string', 'max:255'],
            'active'             => ['nullable', 'boolean'],
            'is_system_generated'=> ['nullable', 'boolean'],
            'user_add_id'        => ['nullable', 'integer', 'exists:users,id'],
            'permissions'        => ['nullable', 'array'],
            'permissions.*'      => ['uuid', 'exists:permissions,id'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        $guardName = $request->input('guard_name', $record->guard_name ?: 'web');

        return [
            'branch_id'          => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name'               => [
                'sometimes',
                'required',
                'string',
                'max:150',
                Rule::unique('roles', 'name')
                    ->where(fn ($query) => $query->where('guard_name', $guardName))
                    ->ignore($record->id),
            ],
            'guard_name'         => ['sometimes', 'nullable', 'string', 'max:80'],
            'description'        => ['sometimes', 'nullable', 'string', 'max:255'],
            'active'             => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated'=> ['sometimes', 'nullable', 'boolean'],
            'user_add_id'        => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'permissions'        => ['sometimes', 'nullable', 'array'],
            'permissions.*'      => ['uuid', 'exists:permissions,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $this->pendingPermissions = $parentData['permissions'] ?? null;
        unset($parentData['permissions']);

        $parentData['guard_name'] = empty($parentData['guard_name']) ? 'web' : $parentData['guard_name'];

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $this->pendingPermissions = array_key_exists('permissions', $parentData)
            ? $parentData['permissions']
            : false;
        unset($parentData['permissions']);

        if ($record->is_system_generated) {
            unset($parentData['name'], $parentData['guard_name']);
        }

        if (array_key_exists('guard_name', $parentData)) {
            $parentData['guard_name'] = $parentData['guard_name'] ?: 'web';
        }

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        if (isset($this->pendingPermissions) && $this->pendingPermissions !== false) {
            if (method_exists($record, 'permissions')) {
                $permissions = Permission::query()
                    ->where('guard_name', $record->guard_name ?: 'web')
                    ->whereIn('id', $this->pendingPermissions ?? [])
                    ->get();

                $record->syncPermissions($permissions);
                app(PermissionRegistrar::class)->forgetCachedPermissions();
            }
        }

        return $record->load('permissions');
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        if ($record->is_system_generated) {
            return response()->json([
                'message' => 'System generated role cannot be deleted.',
            ], 422);
        }

        return parent::destroy($request, $id);
    }

    private mixed $pendingPermissions = false;
}
