<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAdmin;
use App\Services\SaaS\TotpService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Str;
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
        if ($admin->mfa_secret) {
            $request->session()->put('central_mfa_pending_id', $admin->id);
            Auth::guard('central')->logout();

            return redirect()->route('central.mfa.challenge');
        }
        $request->session()->regenerate();
        $request->session()->put('auth.password_confirmed_at', time());
        $request->session()->forget('central_mfa_verified_at');
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

    public function mfaChallenge(Request $request)
    {
        abort_unless($request->session()->has('central_mfa_pending_id'), 404);

        return Inertia::render('Central/Auth/MfaChallenge');
    }

    public function mfaVerify(Request $request, TotpService $totp)
    {
        $data = $request->validate(['code' => ['required', 'string', 'max:64']]);
        $admin = CentralAdmin::findOrFail($request->session()->get('central_mfa_pending_id'));
        $recovery = collect($admin->mfa_recovery_codes ?? []);
        $hash = hash('sha256', Str::upper($data['code']));
        $recoveryMatch = $recovery->contains(fn ($value) => hash_equals($value, $hash));
        abort_unless($totp->verify($admin->mfa_secret, $data['code']) || $recoveryMatch, 422, 'The MFA code is invalid.');
        if ($recoveryMatch) {
            $admin->update(['mfa_recovery_codes' => $recovery->reject(fn ($value) => hash_equals($value, $hash))->values()->all()]);
        }
        Auth::guard('central')->login($admin);
        $request->session()->forget('central_mfa_pending_id');
        $request->session()->regenerate();
        $request->session()->put('auth.password_confirmed_at', time());
        $request->session()->put('central_mfa_verified_at', time());

        return redirect()->route('central.dashboard');
    }

    public function mfaSetup(Request $request, TotpService $totp)
    {
        $secret = $totp->generateSecret();
        $request->session()->put('central_mfa_setup_secret', $secret);

        return response()->json(['secret' => $secret, 'otpauth_uri' => $totp->uri($secret, $request->user('central')->email)]);
    }

    public function mfaEnable(Request $request, TotpService $totp)
    {
        $data = $request->validate(['code' => ['required', 'digits:6']]);
        $secret = $request->session()->pull('central_mfa_setup_secret');
        abort_unless($secret && $totp->verify($secret, $data['code']), 422, 'The MFA code is invalid.');
        $plain = collect(range(1, 8))->map(fn () => Str::upper(Str::random(10)));
        $request->user('central')->update(['mfa_secret' => $secret, 'mfa_recovery_codes' => $plain->map(fn ($code) => hash('sha256', $code))->all(), 'mfa_confirmed_at' => now()]);

        return response()->json(['recovery_codes' => $plain]);
    }
}
