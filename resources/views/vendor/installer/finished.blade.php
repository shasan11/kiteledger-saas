@extends('vendor.installer.layouts.master')

@section('title', 'Installation Complete')
@section('container')
    <style>
        .finish-card{max-width:760px;margin:14px auto;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:14px 16px}
        .finish-card h3{margin:0 0 10px}.finish-card code{display:block;white-space:pre-wrap;word-break:break-all;background:#111827;color:#f9fafb;padding:10px;border-radius:5px;margin:7px 0}
        .diagnostic{padding:6px 0;border-bottom:1px solid #e5e7eb}.diagnostic:last-child{border:0}.ok{color:#047857}.bad{color:#b91c1c}
    </style>

    <p class="paragraph" style="text-align:center;">{{ data_get(session('message'), 'message') ?: 'Installation complete.' }}</p>

    <div class="finish-card">
        <h3>Administrator login</h3>
        <p><strong>URL:</strong> <a href="{{ $adminLoginUrl }}">{{ $adminLoginUrl }}</a><br>
        <strong>Email:</strong> {{ $adminEmail }}<br>
        <strong>Password:</strong> Use the password you entered during setup.</p>
    </div>

    <div class="finish-card">
        <h3>Company database setup</h3>
        <p><strong>Mode:</strong> {{ str_replace('_', ' ', $provisioningMode) }}</p>
        <p>{{ $provisioningStatus }}</p>
        @if ($provisioningMode === 'pool')
            <p>Before creating companies, confirm the diagnostics below show at least one validated pool database. Add more from <strong>Tenant Databases</strong> as you grow.</p>
        @endif
    </div>

    <div class="finish-card">
        <h3>System diagnostics</h3>
        @foreach ($diagnostics as $check)
            <div class="diagnostic">
                <strong class="{{ $check['ok'] ? 'ok' : 'bad' }}">{{ $check['ok'] ? 'PASS' : 'ACTION NEEDED' }}</strong>
                — {{ $check['label'] }}: {{ $check['detail'] }}
            </div>
        @endforeach
    </div>

    <div class="finish-card">
        <h3>Cron Jobs Setup</h3>
        <ol>
            <li>Open <strong>cPanel → Advanced → Cron Jobs</strong>.</li>
            <li>Choose <strong>Once Per Minute</strong>, or enter <code>* * * * *</code></li>
            <li>Add the scheduler command:<code>cd {{ $projectPath }} &amp;&amp; /usr/local/bin/php artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code></li>
            <li>Add the queue worker command:<code>cd {{ $projectPath }} &amp;&amp; /usr/local/bin/php artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 &gt;&gt; /dev/null 2&gt;&amp;1</code></li>
            <li>To find the project path, open the uploaded folder in cPanel File Manager and use the folder containing <code>artisan</code>. It often looks like <code>/home/USERNAME/kiteledger</code> or <code>/home/USERNAME/public_html</code>.</li>
            <li>Try <code>/usr/local/bin/php</code> first. If it fails, ask your host for the PHP CLI path. Common alternatives are <code>/usr/bin/php</code> and <code>/opt/cpanel/ea-php83/root/usr/bin/php</code>.</li>
        </ol>
        <p><strong>Detected command examples:</strong></p>
        <code>cd {{ $projectPath }} &amp;&amp; {{ $phpBinary }} artisan schedule:run &gt;&gt; /dev/null 2&gt;&amp;1</code>
        <code>cd {{ $projectPath }} &amp;&amp; {{ $phpBinary }} artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 &gt;&gt; /dev/null 2&gt;&amp;1</code>
        <p><code>schedule:run</code> runs billing checks, quota cleanup, subscription checks, invoices, and recurring jobs. The queue worker processes tenant/company provisioning and exits safely when the queue is empty, which suits shared hosting.</p>
        <p class="bad"><strong>Without the queue cron, company creation can remain pending. Without the scheduler cron, subscriptions, cleanup, invoices, and recurring automation may not run.</strong></p>
    </div>

    <div class="finish-card">
        <h3>Domain and security checklist</h3>
        <ul>
            <li>Point the root domain to this application.</li>
            <li>If tenant subdomains are used, point <code>*.{{ config('saas.base_domain') }}</code> to the same application and enable wildcard TLS.</li>
            <li><code>/install</code> is now locked.</li>
            <li>Delete uploaded ZIPs and installation backups from public directories.</li>
        </ul>
    </div>

    <div class="buttons"><a href="{{ $adminLoginUrl }}" class="button">Go to admin login</a></div>
@stop
