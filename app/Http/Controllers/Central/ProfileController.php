<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAuditLog;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function edit(Request $request, TotpService $totp)
    {
        $admin = $request->user('central')->load('roles:id,label');
        $pendingMfa = $admin->mfa_secret && ! $admin->mfa_confirmed_at;

        return Inertia::render('Central/Profile/Edit', [
            'admin' => $admin,
            'activity' => CentralAuditLog::where('admin_id', $admin->id)
                ->latest('created_at')
                ->limit(12)
                ->get(['id', 'action', 'model_type', 'model_id', 'created_at']),
            'mfa' => [
                'enabled' => (bool) $admin->mfa_confirmed_at,
                'pending' => (bool) $pendingMfa,
                'secret' => $pendingMfa ? $admin->mfa_secret : null,
                'uri' => $pendingMfa ? $totp->uri($admin->mfa_secret, $admin->email) : null,
                'recovery_codes' => $request->session()->pull('mfa_recovery_codes', []),
            ],
        ]);
    }

    public function update(Request $request, CentralAuditService $audit)
    {
        $admin = $request->user('central');
        $before = $admin->only(['name', 'email', 'locale', 'timezone', 'avatar_path']);
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', Rule::unique('central_admin_users')->ignore($admin)],
            'locale' => ['required', 'string', 'max:12'],
            'timezone' => ['required', 'timezone'],
            'avatar' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],
        ]);

        if ($request->hasFile('avatar')) {
            if ($admin->avatar_path) {
                Storage::disk('public')->delete($admin->avatar_path);
            }
            $data['avatar_path'] = $request->file('avatar')->store('central/avatars', 'public');
        }
        unset($data['avatar']);

        $admin->update($data);
        $audit->log($request, 'profile.updated', $admin, $before, $admin->fresh()->only(array_keys($before)));

        return back()->with('success', 'Profile updated.');
    }

    public function password(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:central'],
            'password' => ['required', 'string', 'min:12', 'confirmed'],
        ]);
        $admin = $request->user('central');
        $admin->update(['password' => Hash::make($data['password'])]);
        $audit->log($request, 'profile.password_changed', $admin);

        return back()->with('success', 'Password changed.');
    }

    public function setupMfa(Request $request, TotpService $totp, CentralAuditService $audit)
    {
        $request->validate(['current_password' => ['required', 'current_password:central']]);
        $admin = $request->user('central');
        abort_if($admin->mfa_confirmed_at, 409, 'Disable the existing MFA configuration before replacing it.');

        $admin->update([
            'mfa_secret' => $totp->generateSecret(),
            'mfa_recovery_codes' => null,
            'mfa_confirmed_at' => null,
        ]);
        $audit->log($request, 'profile.mfa_setup_started', $admin);

        return back()->with('success', 'Scan the setup key in your authenticator app, then confirm a code.');
    }

    public function confirmMfa(Request $request, TotpService $totp, CentralAuditService $audit)
    {
        $data = $request->validate(['code' => ['required', 'string', 'size:6']]);
        $admin = $request->user('central');
        abort_unless($admin->mfa_secret && ! $admin->mfa_confirmed_at, 422, 'Start MFA setup first.');

        if (! $totp->verify($admin->mfa_secret, $data['code'])) {
            return back()->withErrors(['code' => 'The authenticator code is invalid.']);
        }

        $codes = $totp->recoveryCodes();
        $admin->update([
            'mfa_confirmed_at' => now(),
            'mfa_recovery_codes' => collect($codes)
                ->map(fn ($code) => hash('sha256', strtoupper($code)))
                ->all(),
        ]);
        $audit->log($request, 'profile.mfa_enabled', $admin);

        return back()
            ->with('mfa_recovery_codes', $codes)
            ->with('success', 'Multi-factor authentication enabled. Store the recovery codes securely.');
    }

    public function disableMfa(Request $request, TotpService $totp, CentralAuditService $audit)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:central'],
            'code' => ['required', 'string', 'max:32'],
        ]);
        $admin = $request->user('central');
        abort_unless($admin->mfa_confirmed_at, 422, 'Multi-factor authentication is not enabled.');

        $normalized = strtoupper(str_replace(' ', '', $data['code']));
        $valid = $totp->verify($admin->mfa_secret, $normalized)
            || in_array(hash('sha256', $normalized), $admin->mfa_recovery_codes ?? [], true);
        if (! $valid) {
            return back()->withErrors(['code' => 'The authenticator or recovery code is invalid.']);
        }

        $admin->update(['mfa_secret' => null, 'mfa_recovery_codes' => null, 'mfa_confirmed_at' => null]);
        $audit->log($request, 'profile.mfa_disabled', $admin);

        return back()->with('success', 'Multi-factor authentication disabled.');
    }
}
