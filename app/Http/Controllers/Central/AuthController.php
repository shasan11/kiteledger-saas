<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAdmin;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;

class AuthController extends Controller
{
    public function create(Request $request)
    {
        if (Auth::guard('central')->check()) {
            return redirect()->route('central.dashboard');
        }

        return Inertia::render('Central/Auth/Login');
    }

    public function store(Request $request)
    {
        $data = $request->validate(['email' => ['required', 'email'], 'password' => ['required', 'string']]);
        if (! Auth::guard('central')->attempt($data, false)) {
            return back()->withErrors(['email' => 'The credentials are invalid.'])->onlyInput('email');
        }
        $admin = Auth::guard('central')->user();
        if (! $admin->is_active) {
            Auth::guard('central')->logout();

            return back()->withErrors(['email' => 'The account is disabled.']);
        }
        if ($admin->mfa_confirmed_at && $admin->mfa_secret) {
            $request->session()->regenerate();
            $request->session()->put('central_mfa_admin_id', $admin->id);
            Auth::guard('central')->logout();

            return redirect()->route('central.mfa.challenge');
        }
        $request->session()->regenerate();
        $request->session()->put('auth.password_confirmed_at', time());
        $admin->update(['last_login_at' => now()]);

        return redirect()->intended(route('central.dashboard'));
    }

    public function destroy(Request $request)
    {
        Auth::guard('central')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return redirect()->route('central.login');
    }

    public function forgot()
    {
        return Inertia::render('Central/Auth/ForgotPassword');
    }

    public function emailResetLink(Request $request, PlatformSettingsService $settings)
    {
        $data = $request->validate(['email' => ['required', 'email']]);
        $admin = CentralAdmin::where('email', $data['email'])->where('is_active', true)->first();
        if ($admin) {
            $token = Str::random(64);
            DB::connection(config('tenancy.database.central_connection'))->table('central_password_reset_tokens')->updateOrInsert(
                ['email' => $admin->email],
                ['token' => Hash::make($token), 'created_at' => now()],
            );
            $settings->applyMailConfiguration();
            $url = route('central.password.reset', ['token' => $token, 'email' => $admin->email]);
            Mail::html('<p>A password reset was requested for your KiteLedger Super Admin account.</p><p><a href="'.e($url).'">Reset your password</a></p><p>This link expires in 60 minutes. If you did not request it, no action is required.</p>', fn ($message) => $message->to($admin->email)->subject('Reset your KiteLedger Super Admin password'));
        }

        return back()->with('success', 'If an active administrator account matches that email, a reset link has been sent.');
    }

    public function reset(Request $request, string $token)
    {
        return Inertia::render('Central/Auth/ResetPassword', ['token' => $token, 'email' => $request->string('email')->toString()]);
    }

    public function updatePassword(Request $request)
    {
        $data = $request->validate([
            'email' => ['required', 'email'],
            'token' => ['required', 'string'],
            'password' => ['required', 'confirmed', Password::min(12)],
        ]);
        $connection = DB::connection(config('tenancy.database.central_connection'));
        $reset = $connection->table('central_password_reset_tokens')->where('email', $data['email'])->first();
        if (! $reset || ! $reset->created_at || now()->diffInMinutes($reset->created_at, true) > 60 || ! Hash::check($data['token'], $reset->token)) {
            return back()->withErrors(['email' => 'This password reset link is invalid or has expired.']);
        }
        $admin = CentralAdmin::where('email', $data['email'])->where('is_active', true)->first();
        if (! $admin) {
            return back()->withErrors(['email' => 'This password reset link is invalid or has expired.']);
        }
        $admin->update(['password' => Hash::make($data['password'])]);
        $connection->table('central_password_reset_tokens')->where('email', $data['email'])->delete();

        return redirect()->route('central.login')->with('success', 'Your password has been reset. You can now sign in.');
    }

    public function mfaChallenge(Request $request)
    {
        abort_unless($request->session()->has('central_mfa_admin_id'), 403);

        return Inertia::render('Central/Auth/MfaChallenge');
    }

    public function verifyMfaChallenge(Request $request, TotpService $totp)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:32']]);
        $admin = CentralAdmin::find($request->session()->get('central_mfa_admin_id'));
        if (! $admin || ! $admin->is_active || ! $admin->mfa_confirmed_at) {
            $request->session()->forget('central_mfa_admin_id');

            return redirect()->route('central.login')->withErrors(['email' => 'The authentication session has expired.']);
        }
        $normalized = strtoupper(str_replace(' ', '', $data['code']));
        $valid = $totp->verify((string) $admin->mfa_secret, $normalized);
        if (! $valid) {
            $hash = hash('sha256', $normalized);
            $codes = $admin->mfa_recovery_codes ?? [];
            $index = array_search($hash, $codes, true);
            if ($index !== false) {
                unset($codes[$index]);
                $admin->update(['mfa_recovery_codes' => array_values($codes)]);
                $valid = true;
            }
        }
        if (! $valid) {
            return back()->withErrors(['code' => 'The authenticator or recovery code is invalid.']);
        }
        $request->session()->forget('central_mfa_admin_id');
        $request->session()->regenerate();
        $request->session()->put('auth.password_confirmed_at', time());
        Auth::guard('central')->login($admin);
        $admin->update(['last_login_at' => now()]);

        return redirect()->intended(route('central.dashboard'));
    }
}
