<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
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

}
