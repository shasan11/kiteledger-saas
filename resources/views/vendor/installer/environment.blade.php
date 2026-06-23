@extends('vendor.installer.layouts.master')

@section('title', 'Setup')

@section('style')
<style>
    .kl-form { text-align: left; max-width: 640px; margin: 0 auto; }
    .kl-form h3 { font-size: 14px; text-transform: uppercase; letter-spacing: .04em; color: #6b7280; margin: 22px 0 10px; border-bottom: 1px solid #e5e7eb; padding-bottom: 6px; }
    .kl-form h3:first-child { margin-top: 0; }
    .kl-row { display: flex; gap: 12px; flex-wrap: wrap; }
    .kl-row > .kl-field { flex: 1; min-width: 160px; }
    .kl-field { margin-bottom: 12px; }
    .kl-field label { display: block; font-size: 13px; font-weight: 600; color: #374151; margin-bottom: 4px; }
    .kl-field input, .kl-field select {
        width: 100%; padding: 9px 11px; border: 1px solid #d1d5db; border-radius: 7px;
        font-size: 14px; color: #111827; background: #fff; box-sizing: border-box;
    }
    .kl-field input:focus, .kl-field select:focus { outline: none; border-color: #111827; box-shadow: 0 0 0 3px rgba(17,24,39,.08); }
    .kl-actions { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-top: 22px; flex-wrap: wrap; }
    .kl-msg { margin: 14px 0; padding: 11px 13px; border-radius: 7px; font-size: 13px; display: none; }
    .kl-msg.ok { display: block; background: #f0fdf4; color: #166534; border: 1px solid #bbf7d0; }
    .kl-msg.bad { display: block; background: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }
    .kl-hint { color: #6b7280; font-size: 12px; }
    #klSuccess { display: none; text-align: center; padding: 20px 0; }
    #klSuccess .tick { width: 54px; height: 54px; line-height: 54px; border-radius: 50%; background: #f0fdf4; color: #16a34a; font-size: 28px; margin: 0 auto 14px; border: 1px solid #bbf7d0; }
    .kl-spin { display:inline-block; width:14px; height:14px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:klspin .7s linear infinite; vertical-align:-2px; margin-right:6px; }
    @keyframes klspin { to { transform: rotate(360deg); } }
</style>
@endsection

@section('container')
<div class="kl-form" id="klForm">
    <h3>Database</h3>
    <div class="kl-row">
        <div class="kl-field">
            <label>Connection</label>
            <select id="db_connection">
                <option value="mysql">MySQL</option>
                <option value="mariadb">MariaDB</option>
                <option value="pgsql">PostgreSQL</option>
                <option value="sqlite">SQLite</option>
            </select>
        </div>
        <div class="kl-field"><label>Host</label><input id="db_host" value="127.0.0.1"></div>
        <div class="kl-field" style="max-width:110px"><label>Port</label><input id="db_port" value="3306"></div>
    </div>
    <div class="kl-field"><label>Database name</label><input id="db_database" placeholder="your_database"></div>
    <div class="kl-row">
        <div class="kl-field"><label>Username</label><input id="db_username" placeholder="db_user"></div>
        <div class="kl-field"><label>Password</label><input id="db_password" type="password"></div>
    </div>

    <h3>Application</h3>
    <div class="kl-row">
        <div class="kl-field"><label>Application name</label><input id="app_name" value="{{ config('app.name', 'KiteLedger') }}"></div>
        <div class="kl-field"><label>Application URL</label><input id="app_url" value="{{ rtrim(request()->getSchemeAndHttpHost(), '/') }}"></div>
    </div>
    <div class="kl-row">
        <div class="kl-field"><label>Timezone</label><input id="timezone" value="UTC"></div>
        <div class="kl-field" style="max-width:150px"><label>Currency code</label><input id="currency_code" value="USD" maxlength="10"></div>
        <div class="kl-field" style="max-width:120px"><label>Symbol</label><input id="currency_symbol" value="$" maxlength="10"></div>
    </div>

    <h3>Company &amp; Branch</h3>
    <div class="kl-row">
        <div class="kl-field"><label>Company name</label><input id="company_name" placeholder="Acme Inc"></div>
        <div class="kl-field"><label>Company email</label><input id="company_email" type="email" placeholder="info@acme.com"></div>
    </div>
    <div class="kl-row">
        <div class="kl-field"><label>Head office branch</label><input id="branch_name" value="Head Office"></div>
        <div class="kl-field" style="max-width:160px"><label>Branch code</label><input id="branch_code" value="MAIN" maxlength="30"></div>
    </div>

    <h3>Administrator</h3>
    <div class="kl-row">
        <div class="kl-field"><label>Full name</label><input id="admin_name" placeholder="Owner name"></div>
        <div class="kl-field"><label>Email</label><input id="admin_email" type="email" placeholder="admin@acme.com"></div>
    </div>
    <div class="kl-row">
        <div class="kl-field"><label>Password</label><input id="admin_password" type="password"><span class="kl-hint">Auto-filled with a strong password — shown again after install. Edit to set your own.</span></div>
        <div class="kl-field"><label>Confirm password</label><input id="admin_password_confirmation" type="password"></div>
    </div>

    <div id="klMsg" class="kl-msg"></div>

    <div class="kl-actions">
        <button type="button" class="button" style="background:#fff;color:#374151;border:1px solid #d1d5db" onclick="klTestDb()">Test connection</button>
        <button type="button" class="button" id="klInstallBtn" onclick="klInstall()">Install now</button>
    </div>
    <p class="kl-hint" style="margin-top:10px">The first install can take a minute or two while the database is created. Please keep this tab open.</p>
</div>

<div id="klSuccess">
    <div class="tick">&#10003;</div>
    <h2 style="margin:0 0 8px">Installation complete</h2>
    <p style="color:#374151;margin:0 0 14px">Your application is ready. Use the administrator credentials below to sign in.</p>
    <div style="max-width:420px;margin:0 auto 16px;text-align:left;background:#f9fafb;border:1px solid #e5e7eb;border-radius:9px;padding:14px 16px">
        <div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0"><span class="kl-hint">Admin email</span><strong id="klCredEmail" style="font-family:monospace"></strong></div>
        <div style="display:flex;justify-content:space-between;gap:12px;padding:4px 0"><span class="kl-hint">Password</span><strong id="klCredPass" style="font-family:monospace"></strong></div>
        <p class="kl-hint" style="margin:8px 0 0">Save these now — copy them somewhere safe. You can change the password after logging in.</p>
    </div>
    <p id="klStorageNote" class="kl-hint" style="margin:0 0 20px"></p>
    <a id="klLogin" href="/login"><button type="button" class="button">Go to login &rarr;</button></a>
</div>

<script>
    var KL_DB_URL = "{{ url('/install/setup/database') }}";
    var KL_RUN_URL = "{{ url('/install/setup/run') }}";

    function klVal(id) { var el = document.getElementById(id); return el ? (el.value || '').trim() : ''; }
    function klMsg(text, ok) {
        var el = document.getElementById('klMsg');
        el.textContent = text; el.className = 'kl-msg ' + (ok ? 'ok' : 'bad');
    }
    function klDbPayload() {
        return {
            db_connection: klVal('db_connection'), db_host: klVal('db_host'), db_port: klVal('db_port'),
            db_database: klVal('db_database'), db_username: klVal('db_username'), db_password: klVal('db_password')
        };
    }
    async function klPost(url, body) {
        var res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body)
        });
        var data = {}; try { data = await res.json(); } catch (e) {}
        return { ok: res.ok, data: data };
    }
    async function klTestDb() {
        klMsg('Testing connection…', true);
        var r = await klPost(KL_DB_URL, klDbPayload());
        klMsg(r.data.message || (r.ok ? 'Connection successful.' : 'Connection failed.'), r.ok);
    }
    function klValidate() {
        if (!klVal('db_database')) { klMsg('Enter the database name.', false); return false; }
        if (klVal('db_connection') !== 'sqlite' && !klVal('db_username')) { klMsg('Enter the database username.', false); return false; }
        if (!klVal('company_name')) { klMsg('Enter the company name.', false); return false; }
        if (!klVal('branch_name')) { klMsg('Enter the head office branch name.', false); return false; }
        if (!klVal('admin_name') || !klVal('admin_email')) { klMsg('Enter the administrator name and email.', false); return false; }
        if (klVal('admin_password').length < 8) { klMsg('Administrator password must be at least 8 characters.', false); return false; }
        if (klVal('admin_password') !== klVal('admin_password_confirmation')) { klMsg('Password confirmation does not match.', false); return false; }
        return true;
    }
    async function klInstall() {
        if (!klValidate()) return;
        var btn = document.getElementById('klInstallBtn');
        btn.disabled = true; btn.innerHTML = '<span class="kl-spin"></span> Installing…';
        klMsg('Setting up your database — this can take a minute…', true);

        var payload = Object.assign(klDbPayload(), {
            app_name: klVal('app_name'), app_url: klVal('app_url'), timezone: klVal('timezone'),
            currency_code: klVal('currency_code'), currency_symbol: klVal('currency_symbol'),
            company_name: klVal('company_name'), company_email: klVal('company_email'),
            branch_name: klVal('branch_name'), branch_code: klVal('branch_code'),
            admin_name: klVal('admin_name'), admin_email: klVal('admin_email'),
            admin_password: klVal('admin_password'), admin_password_confirmation: klVal('admin_password_confirmation'),
            default_language: 'en', enabled_languages: ['en']
        });

        var ok = false, data = {};
        try { var r = await klPost(KL_RUN_URL, payload); ok = r.ok; data = r.data; }
        catch (e) {
            btn.disabled = false; btn.textContent = 'Install now';
            klMsg('The install request could not be completed. Check your connection and try again.', false);
            return;
        }

        if (ok && data.success) {
            if (data.login_url) document.getElementById('klLogin').href = data.login_url;
            if (data.storage && data.storage.message) document.getElementById('klStorageNote').textContent = data.storage.message;
            // Show the exact admin credentials that were just created.
            document.getElementById('klCredEmail').textContent = payload.admin_email;
            document.getElementById('klCredPass').textContent = payload.admin_password;
            document.getElementById('klForm').style.display = 'none';
            document.getElementById('klSuccess').style.display = 'block';
        } else {
            btn.disabled = false; btn.textContent = 'Install now';
            var first = data.errors ? Object.values(data.errors)[0][0] : data.message;
            klMsg(first || 'Installation failed.', false);
        }
    }
    document.getElementById('db_connection').addEventListener('change', function (e) {
        var p = e.target.value === 'pgsql' ? '5432' : '3306';
        document.getElementById('db_port').value = e.target.value === 'sqlite' ? '' : p;
    });

    // Default every non-database field — including a strong admin password — so a
    // quick install only needs the database details. Everything stays editable,
    // and the password is shown on the finish screen.
    (function klPrefill() {
        function setIfEmpty(id, val) { var el = document.getElementById(id); if (el && !el.value) el.value = val; }
        function genPassword() {
            var c = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789';
            var s = ''; for (var i = 0; i < 10; i++) s += c.charAt(Math.floor(Math.random() * c.length));
            return s + '@' + (Math.floor(Math.random() * 90) + 10);
        }
        var host = (location.hostname || 'app').replace(/^www\./, '');
        setIfEmpty('company_name', 'My Company');
        setIfEmpty('admin_name', 'Administrator');
        setIfEmpty('admin_email', 'admin@' + host);
        var pw = document.getElementById('admin_password');
        if (pw && !pw.value) {
            var p = genPassword();
            pw.value = p;
            document.getElementById('admin_password_confirmation').value = p;
        }
    })();
</script>
@stop
