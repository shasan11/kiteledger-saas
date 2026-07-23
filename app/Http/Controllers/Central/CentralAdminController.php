<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAdmin;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class CentralAdminController extends Controller
{
    public function index()
    {
        return Inertia::render('Central/Resources/Index', [
            'resource' => 'central-admins',
            'rows' => CentralAdmin::query()->select(['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at'])->latest()->paginate(25),
            'columns' => ['id', 'name', 'email', 'role', 'is_active', 'last_login_at', 'created_at'],
            'editable' => true, 'fields' => ['name', 'email', 'password', 'role', 'is_active'], 'summary' => null,
        ]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', Rule::unique('central_admin_users')], 'password' => ['required', 'string', 'min:12'], 'role' => ['required', Rule::in(['super_admin', 'operator'])], 'is_active' => ['boolean']]);
        $data['password'] = Hash::make($data['password']);
        $admin = CentralAdmin::query()->create($data);
        $audit->log($request, 'central-admin.created', $admin, [], $admin->only(['name', 'email', 'role', 'is_active']));

        return back()->with('success', 'Central administrator created.');
    }

    public function update(Request $request, CentralAdmin $centralAdmin, CentralAuditService $audit)
    {
        $old = $centralAdmin->only(['name', 'email', 'role', 'is_active']);
        $data = $request->validate(['name' => ['required', 'string', 'max:255'], 'email' => ['required', 'email', Rule::unique('central_admin_users')->ignore($centralAdmin)], 'password' => ['nullable', 'string', 'min:12'], 'role' => ['required', Rule::in(['super_admin', 'operator'])], 'is_active' => ['boolean']]);
        if (blank($data['password'] ?? null)) unset($data['password']); else $data['password'] = Hash::make($data['password']);
        $centralAdmin->update($data);
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
