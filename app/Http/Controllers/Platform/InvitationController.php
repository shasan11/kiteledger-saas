<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralUser;
use App\Services\SaaS\PlatformInvitationService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rules\Password as PasswordRule;
use Inertia\Inertia;

class InvitationController extends Controller
{
    public function show(Request $request, string $token, PlatformInvitationService $invitations)
    {
        $invitation = $invitations->findByToken($token);
        if (! $invitation) {
            return Inertia::render('Platform/Auth/InvitationInvalid');
        }

        return Inertia::render('Platform/Auth/AcceptInvitation', [
            'token' => $token,
            'email' => $invitation->email,
            'tenant' => $invitation->tenant?->company_name,
            'role' => $invitation->role?->label(),
            'expiresAt' => $invitation->expires_at,
            'accountExists' => CentralUser::where('email', $invitation->email)->whereNotNull('password')->exists(),
        ]);
    }

    public function accept(Request $request, PlatformInvitationService $invitations)
    {
        $invitation = $invitations->findByToken((string) $request->input('token'));
        abort_unless($invitation !== null, 404, 'This invitation is no longer valid.');
        $existing = CentralUser::where('email', $invitation->email)->whereNotNull('password')->first();

        $data = $request->validate([
            'token' => ['required', 'string'],
            'first_name' => [$existing ? 'nullable' : 'required', 'string', 'max:120'],
            'last_name' => [$existing ? 'nullable' : 'required', 'string', 'max:120'],
            'password' => [$existing ? 'nullable' : 'required', 'confirmed', PasswordRule::min(12)],
        ]);

        $user = $invitations->accept($invitation, $data);
        if (! $existing) {
            Auth::guard('platform')->login($user);
            $request->session()->regenerate();
            $request->session()->put('platform_login_at', now()->getTimestamp());

            return redirect()->route('central.account.tenants.index')->with('success', 'Welcome to KiteLedger.');
        }

        return redirect()->route('central.account.login')->with('success', 'Invitation accepted. Sign in to open your new company.');
    }
}
