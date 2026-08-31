<?php

namespace App\Http\Controllers\Platform;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralUser;
use App\Services\SaaS\CentralAuditService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * "Continue with Google" for the customer account portal.
 *
 * Deliberately implemented against Google's OAuth endpoints directly rather
 * than through a socialite package: this ships as a self-hosted script, and one
 * fewer composer dependency is one fewer thing a buyer has to install.
 *
 * Sign-in only. A Google account is never allowed to create a portal user —
 * portal access comes from an invitation or a tenant membership, so an
 * unrecognised email is rejected rather than silently provisioned.
 */
class GoogleAuthController extends Controller
{
    private const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';

    private const TOKEN_URL = 'https://oauth2.googleapis.com/token';

    private const USERINFO_URL = 'https://openidconnect.googleapis.com/v1/userinfo';

    /** Whether an administrator has configured the OAuth client. */
    public static function configured(): bool
    {
        return filled(config('services.google.client_id')) && filled(config('services.google.client_secret'));
    }

    public function redirect(Request $request)
    {
        if (! self::configured()) {
            return redirect()->route('central.account.login')
                ->withErrors(['email' => 'Google sign-in is not configured on this installation.']);
        }

        if (Auth::guard('platform')->check()) {
            return redirect()->route('central.account.tenants.index');
        }

        // Single-use state, checked on the way back, so the callback cannot be
        // replayed or triggered from another site.
        $state = Str::random(40);
        $request->session()->put('google_oauth_state', $state);

        return redirect()->away(self::AUTHORIZE_URL.'?'.http_build_query([
            'client_id' => config('services.google.client_id'),
            'redirect_uri' => $this->callbackUrl(),
            'response_type' => 'code',
            'scope' => 'openid email profile',
            'state' => $state,
            'prompt' => 'select_account',
        ]));
    }

    public function callback(Request $request, CentralAuditService $audit)
    {
        $failure = fn (string $message) => redirect()
            ->route('central.account.login')
            ->withErrors(['email' => $message]);

        $expected = $request->session()->pull('google_oauth_state');

        if (! self::configured()) {
            return $failure('Google sign-in is not configured on this installation.');
        }

        if (blank($expected) || ! hash_equals($expected, (string) $request->query('state'))) {
            return $failure('That Google sign-in link has expired. Please try again.');
        }

        if ($request->filled('error') || blank($request->query('code'))) {
            return $failure('Google sign-in was cancelled.');
        }

        try {
            $token = Http::asForm()->timeout(15)->post(self::TOKEN_URL, [
                'code' => $request->query('code'),
                'client_id' => config('services.google.client_id'),
                'client_secret' => config('services.google.client_secret'),
                'redirect_uri' => $this->callbackUrl(),
                'grant_type' => 'authorization_code',
            ]);

            if (! $token->successful() || blank($accessToken = $token->json('access_token'))) {
                return $failure('Google did not confirm the sign-in. Please try again.');
            }

            $profile = Http::withToken($accessToken)->timeout(15)->get(self::USERINFO_URL);

            if (! $profile->successful()) {
                return $failure('Google did not return your profile. Please try again.');
            }
        } catch (\Throwable $exception) {
            // Network and TLS problems are an operator issue, not a user error.
            Log::warning('Google sign-in failed to reach Google.', ['message' => $exception->getMessage()]);

            return $failure('Could not reach Google right now. Please sign in with your password.');
        }

        $email = strtolower(trim((string) $profile->json('email')));

        // An unverified Google email proves nothing about who is signing in.
        if (blank($email) || $profile->json('email_verified') !== true) {
            return $failure('Your Google account does not have a verified email address.');
        }

        $user = CentralUser::whereRaw('LOWER(email) = ?', [$email])->first();

        if (! $user) {
            return $failure('No KiteLedger account uses that Google address. Ask your administrator for an invitation.');
        }

        if (! $user->isPlatformActive()) {
            return $failure(match ($user->status?->value) {
                'invited' => 'This invitation has not been accepted yet. Please use the link in your invitation email.',
                'suspended' => 'This account is suspended. Contact KiteLedger support.',
                default => 'This account is not active.',
            });
        }

        Auth::guard('platform')->login($user);
        $request->session()->regenerate();
        $request->session()->put('platform_login_at', now()->getTimestamp());

        // Google has verified the address, so an account that had never
        // confirmed its email is confirmed now.
        $user->forceFill(array_filter([
            'last_login_at' => now(),
            'last_login_ip' => $request->ip(),
            'last_active_at' => now(),
            'email_verified_at' => $user->email_verified_at ?: now(),
        ]))->save();

        $audit->log($request, 'platform-user.login.google', $user);

        return redirect()->intended(route('central.account.tenants.index'));
    }

    private function callbackUrl(): string
    {
        return config('services.google.redirect') ?: route('central.account.google.callback');
    }
}
