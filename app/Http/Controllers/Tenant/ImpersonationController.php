<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Central\ImpersonationToken;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ImpersonationController extends Controller
{
    public function enter(Request $request, string $token)
    {
        $record = DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($token) {
            $record = ImpersonationToken::where('token_hash', hash('sha256', $token))->lockForUpdate()->first();
            abort_unless($record && ! $record->used_at && $record->expires_at->isFuture() && $record->tenant_id === tenant()->id, 404);
            $record->update(['used_at' => now()]);

            return $record;
        });
        $user = User::where('email', tenant()->owner_email)->firstOrFail();
        Auth::login($user);
        $request->session()->regenerate();
        $request->session()->put('impersonation', ['admin_id' => $record->admin_id, 'started_at' => now()->toIso8601String(), 'expires_at' => now()->addMinutes(15)->toIso8601String()]);
        DB::connection(config('tenancy.database.central_connection'))->table('central_audit_logs')->insert(['admin_id' => $record->admin_id, 'action' => 'impersonation.started', 'model_type' => get_class(tenant()), 'model_id' => tenant()->id, 'ip_address' => $request->ip(), 'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000), 'created_at' => now()]);

        return redirect()->route('dashboard');
    }

    public function exit(Request $request)
    {
        $context = $request->session()->pull('impersonation');
        Auth::logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        if ($context) {
            DB::connection(config('tenancy.database.central_connection'))->table('central_audit_logs')->insert(['admin_id' => $context['admin_id'], 'action' => 'impersonation.ended', 'model_type' => get_class(tenant()), 'model_id' => tenant()->id, 'ip_address' => $request->ip(), 'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000), 'created_at' => now()]);
        }

        return redirect()->away(config('app.url'));
    }
}
