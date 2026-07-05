@extends('vendor.installer.layouts.master')

@section('title', 'Finished')
@section('container')
    <p class="paragraph" style="text-align: center;">{{ data_get(session('message'), 'message') ?: 'Installation complete.' }}</p>

    <div style="max-width:420px;margin:14px auto;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px;">
        <p style="margin:0 0 8px;font-weight:600;">Administrator login</p>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;">
            <span>Email</span><strong style="font-family:monospace;">{{ env('CENTRAL_ADMIN_EMAIL', 'admin@kiteledger.test') }}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:3px 0;">
            <span>Password</span><strong style="font-family:monospace;">The password you entered</strong>
        </div>
        <p style="margin:8px 0 0;font-size:12px;color:#6b7280;">Sign in, then change this password from your profile.</p>
    </div>

    <div class="buttons">
        <a href="{{ url('/'.trim(config('saas.admin_path', 'admin'), '/').'/login') }}" class="button">Go to admin login</a>
    </div>
@stop
