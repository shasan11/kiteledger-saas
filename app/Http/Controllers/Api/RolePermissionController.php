<?php

namespace App\Http\Controllers\Api;

use App\Models\RolePermission;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class RolePermissionController extends BaseCrudApiController
{
    protected string $modelClass = RolePermission::class;

    protected ?string $permissionPrefix = 'hrm.role_permissions';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'role',
        'permission',
    ];

    protected array $relationDetails = [
        'role' => 'role_id',
        'permission' => 'permission_id',
    ];

    protected array $searchable = [
        'role.name',
        'permission.name',
    ];

    protected array $filterable = [
        'role_id',
        'permission_id',
    ];

    protected array $booleanFilters = [];

    protected array $sortable = [
        'id',
        'role_id',
        'permission_id',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'role_id' => ['required', 'uuid', 'exists:roles,id'],
        'permission_id' => ['required', 'uuid', 'exists:permissions,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'role_id' => ['sometimes', 'required', 'uuid', 'exists:roles,id'],
            'permission_id' => ['sometimes', 'required', 'uuid', 'exists:permissions,id'],
        ];
    }
}
