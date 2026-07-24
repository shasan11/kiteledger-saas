<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralRole;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CentralAdminController extends Controller
{
    public function index()
    {
        return Inertia::render('Central/Administration/AdminUsers', [
            'admins' => CentralAdmin::query()->with('roles:id,name,label')->select(['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at'])->latest()->paginate(25),
            'roles' => CentralRole::query()->orderBy('label')->get(['id', 'name', 'label']),
        ]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', Rule::unique('central_admin_users')], 'password' => ['required', 'string', 'min:12'], 'role_id' => ['required', 'exists:central_roles,id'], 'is_active' => ['boolean']]);
        $role = CentralRole::findOrFail($data['role_id']);
        unset($data['role_id']);
        $data['role'] = $role->name === 'super_administrator' ? 'super_admin' : 'operator';
        $data['password'] = Hash::make($data['password']);
        $admin = CentralAdmin::query()->create($data);
        $admin->roles()->sync([$role->id]);
        $audit->log($request, 'central-admin.created', $admin, [], $admin->only(['name', 'email', 'role', 'is_active']));

        return back()->with('success', 'Central administrator created.');
    }

    public function update(Request $request, CentralAdmin $centralAdmin, CentralAuditService $audit)
    {
        $old = $centralAdmin->only(['name', 'email', 'role', 'is_active']);
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', Rule::unique('central_admin_users')->ignore($centralAdmin)], 'password' => ['nullable', 'string', 'min:12'], 'role_id' => ['required', 'exists:central_roles,id'], 'is_active' => ['boolean']]);
        $role = CentralRole::findOrFail($data['role_id']);
        unset($data['role_id']);
        $data['role'] = $role->name === 'super_administrator' ? 'super_admin' : 'operator';
        if (blank($data['password'] ?? null)) {
            unset($data['password']);
        } else {
            $data['password'] = Hash::make($data['password']);
        }
        $centralAdmin->update($data);
        $centralAdmin->roles()->sync([$role->id]);
        $audit->log($request, 'central-admin.updated', $centralAdmin, $old, $centralAdmin->only(['name', 'email', 'role', 'is_active']));

        return back()->with('success', 'Central administrator updated.');
    }

    public function destroy(Request $request, CentralAdmin $centralAdmin, CentralAuditService $audit)
    {
        abort_if($request->user('central')?->is($centralAdmin), 422, 'You cannot delete your own account.');
        $audit->log($request, 'central-admin.deleted', $centralAdmin, $centralAdmin->only(['name', 'email', 'role', 'is_active']));
        $centralAdmin->delete();

        return back()->with('success', 'Central administrator removed.');
    }
}
