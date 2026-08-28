<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Http\Requests\Platform\UpdatePlatformProfileRequest;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\CentralUserService;
use App\Services\SaaS\PlatformProfileService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;

class ProfileController extends Controller
{
    public function edit(Request $request)
    {
        $user = $request->user('platform')->load('profile');

        return Inertia::render('Platform/Profile', ['profile' => $user->profile, 'account' => $user->only(['first_name', 'last_name', 'name', 'email', 'phone', 'avatar', 'timezone', 'country', 'locale'])]);
    }

    public function update(UpdatePlatformProfileRequest $request, PlatformProfileService $service)
    {
        $service->update($request->user('platform'), $request->validated());

        return back()->with('success', 'Profile updated.');
    }

    public function security(Request $request)
    {
        $user = $request->user('platform');

        return Inertia::render('Platform/Security', [
            'security' => [
                'email' => $user->email,
                'email_verified_at' => $user->email_verified_at,
                'last_login_at' => $user->last_login_at,
                'last_login_ip' => $user->last_login_ip,
                'password_changed_at' => $user->password_changed_at,
                'sessions_invalidated_at' => $user->sessions_invalidated_at,
            ],
        ]);
    }

    public function updatePassword(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:platform'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)],
        ]);
        $user = $request->user('platform');
        $user->forceFill(['password' => Hash::make($data['password']), 'password_changed_at' => now(), 'force_password_reset' => false])->save();
        $audit->log($request, 'platform-user.password_changed', $user);

        return back()->with('success', 'Password updated.');
    }

    /** Ends every other browser session; the current one is re-stamped. */
    public function signOutOtherSessions(Request $request, CentralUserService $service)
    {
        $request->validate(['current_password' => ['required', 'current_password:platform']]);
        $service->signOutEverywhere($request->user('platform'));
        $request->session()->put('platform_login_at', now()->addSecond()->getTimestamp());

        return back()->with('success', 'All other sessions have been signed out.');
    }
}
