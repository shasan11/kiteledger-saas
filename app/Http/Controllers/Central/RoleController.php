<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralPermission;
use App\Models\Central\CentralRole;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;

class RoleController extends Controller
{
    public function index()
    {
        return Inertia::render('Central/Administration/Roles', [
            'roles' => CentralRole::with(['permissions:id,name,label'])->withCount('permissions')->orderBy('label')->get(),
            'permissions' => CentralPermission::query()->orderBy('name')->get(['id', 'name', 'label'])->groupBy(fn (CentralPermission $permission) => str($permission->name)->before('.')->toString()),
        ]);
    }

    public function update(Request $request, CentralRole $role, CentralAuditService $audit)
    {
        $data = $request->validate([
            'label' => ['required', 'string', 'max:100'],
            'permissions' => ['present', 'array'],
            'permissions.*' => ['integer', 'exists:central_permissions,id'],
        ]);

        abort_if($role->name === 'super_administrator' && count($data['permissions']) !== CentralPermission::count(), 422, 'The Super Administrator role must retain every permission.');

        $beforeLabel = $role->label;
        $before = $role->permissions()->pluck('name')->sort()->values()->all();
        DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($role, $data): void {
            $role->update(['label' => $data['label']]);
            $role->permissions()->sync($data['permissions']);
        });
        $after = $role->permissions()->pluck('name')->sort()->values()->all();
        $audit->log($request, 'role.permissions_updated', $role, ['label' => $beforeLabel, 'permissions' => $before], ['label' => $role->label, 'permissions' => $after]);

        return back()->with('success', 'Role permissions saved.');
    }
}
