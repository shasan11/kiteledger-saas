<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Platform\GoogleAuthController;
use App\Models\Central\CentralUser;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Auth\Events\PasswordReset;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Password;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;

/**
 * Customer account authentication. Uses the `platform` guard and the
 * `platform_users` password broker exclusively — tenant and central-admin
 * sign-in are entirely separate flows.
 */
class AuthController extends Controller
{
    public function create()
    {
        return Auth::guard('platform')->check()
            ? redirect()->route('central.account.tenants.index')
            : Inertia::render('Platform/Auth/Login', ['googleEnabled' => GoogleAuthController::configured()]);
    }

    public function store(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
            'remember' => ['boolean'],
        ]);

        if (! Auth::guard('platform')->attempt(['email' => $data['email'], 'password' => $data['password']], $request->boolean('remember'))) {
            return back()->withErrors(['email' => 'The credentials are invalid.'])->onlyInput('email');
        }

        $user = Auth::guard('platform')->user();
        if (! $user->isPlatformActive()) {
            Auth::guard('platform')->logout();

            return back()->withErrors(['email' => match ($user->status?->value) {
                'invited' => 'This invitation has not been accepted yet. Please use the link in your invitation email.',
                'suspended' => 'This account is suspended. Contact KiteLedger support.',
                default => 'This account is not active.',
            }])->onlyInput('email');
        }

        $request->session()->regenerate();
        $request->session()->put('platform_login_at', now()->getTimestamp());
        $user->forceFill(['last_login_at' => now(), 'last_login_ip' => $request->ip(), 'last_active_at' => now()])->save();
        $audit->log($request, 'platform-user.login', $user);

        return redirect()->intended(route('central.account.tenants.index'));
    }

    public function destroy(Request $request)
    {
        Auth::guard('platform')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('central.account.login');
    }

    public function forgot()
    {
        return Inertia::render('Platform/Auth/ForgotPassword');
    }

    public function emailResetLink(Request $request, PlatformSettingsService $settings)
    {
        $request->validate(['email' => ['required', 'email']]);
        $settings->applyMailConfiguration();
        Password::broker('platform_users')->sendResetLink($request->only('email'));

        // Always the same answer, so the endpoint cannot enumerate accounts.
        return back()->with('success', 'If an active KiteLedger account matches that email, a reset link has been sent.');
    }

    public function reset(Request $request, string $token)
    {
        return Inertia::render('Platform/Auth/ResetPassword', ['token' => $token, 'email' => $request->string('email')->toString()]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'token' => ['required', 'string'],
            'email' => ['required', 'email'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)],
        ]);

        $status = Password::broker('platform_users')->reset(
            $request->only('email', 'password', 'password_confirmation', 'token'),
            function (CentralUser $user, string $password): void {
                $user->forceFill([
                    'password' => Hash::make($password),
                    'password_changed_at' => now(),
                    'force_password_reset' => false,
                    'remember_token' => Str::random(60),
                    'sessions_invalidated_at' => now(),
                ])->save();
                event(new PasswordReset($user));
            },
        );

        return $status === Password::PasswordReset
            ? redirect()->route('central.account.login')->with('success', 'Your password has been reset. You can now sign in.')
            : back()->withErrors(['email' => __($status)]);
    }

    /** Shown when a central administrator has flagged the account for a reset. */
    public function forcedPassword(Request $request)
    {
        return Inertia::render('Platform/Auth/ForcePassword', ['email' => $request->user('platform')->email]);
    }

    public function updateForcedPassword(Request $request, CentralAuditService $audit)
    {
        $data = $request->validate([
            'current_password' => ['required', 'current_password:platform'],
            'password' => ['required', 'confirmed', PasswordRule::min(12)],
        ]);
        $user = $request->user('platform');
        $user->forceFill(['password' => Hash::make($data['password']), 'password_changed_at' => now(), 'force_password_reset' => false])->save();
        $audit->log($request, 'platform-user.password_changed', $user);

        return redirect()->route('central.account.tenants.index')->with('success', 'Your password has been updated.');
    }
}
