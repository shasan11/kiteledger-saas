<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Install · {{ config('app.name', 'KiteLedger') }}</title>
    <style>
        :root { --pri:#1677ff; --ok:#16a34a; --bad:#dc2626; --bg:#f1f5f9; --card:#fff; --bd:#e2e8f0; --muted:#64748b; }
        * { box-sizing:border-box; }
        body { margin:0; font-family:-apple-system,Segoe UI,Roboto,Arial,sans-serif; background:var(--bg); color:#0f172a; }
        .wrap { max-width:760px; margin:0 auto; padding:32px 16px; }
        .brand { text-align:center; margin-bottom:20px; }
        .brand h1 { margin:0; font-size:24px; }
        .brand p { margin:4px 0 0; color:var(--muted); }
        .steps { display:flex; gap:6px; margin-bottom:18px; flex-wrap:wrap; }
        .steps .s { flex:1; min-width:80px; text-align:center; font-size:12px; padding:8px 4px; border-radius:8px; background:#e8edf3; color:var(--muted); }
        .steps .s.active { background:var(--pri); color:#fff; }
        .steps .s.done { background:#dcfce7; color:var(--ok); }
        .card { background:var(--card); border:1px solid var(--bd); border-radius:12px; padding:24px; box-shadow:0 1px 4px rgba(0,0,0,.04); }
        .card h2 { margin:0 0 4px; font-size:18px; }
        .card .sub { color:var(--muted); margin:0 0 18px; font-size:14px; }
        label { display:block; font-size:13px; font-weight:600; margin:12px 0 4px; }
        input, select { width:100%; padding:10px 12px; border:1px solid var(--bd); border-radius:8px; font-size:14px; }
        .row { display:flex; gap:12px; } .row > div { flex:1; }
        .actions { display:flex; justify-content:space-between; margin-top:22px; }
        button { padding:10px 20px; border-radius:8px; border:1px solid var(--pri); background:var(--pri); color:#fff; font-size:14px; cursor:pointer; }
        button.ghost { background:#fff; color:#334155; border-color:var(--bd); }
        button:disabled { opacity:.55; cursor:not-allowed; }
        .check { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid #f1f5f9; font-size:14px; }
        .pill { font-size:12px; padding:2px 10px; border-radius:20px; }
        .pill.ok { background:#dcfce7; color:var(--ok); } .pill.bad { background:#fee2e2; color:var(--bad); }
        .msg { padding:10px 12px; border-radius:8px; font-size:13px; margin-top:12px; display:none; }
        .msg.ok { background:#dcfce7; color:#166534; display:block; } .msg.bad { background:#fee2e2; color:#991b1b; display:block; }
        .hint { color:var(--muted); font-size:12px; }
        .center { text-align:center; }
        .spinner { display:inline-block; width:16px; height:16px; border:2px solid #fff; border-top-color:transparent; border-radius:50%; animation:spin .7s linear infinite; vertical-align:middle; }
        @keyframes spin { to { transform:rotate(360deg); } }
    </style>
</head>
<body>
<div class="wrap">
    <div class="brand">
        <h1>{{ config('app.name', 'KiteLedger') }} Installer</h1>
        <p>Set up your accounting application in a few steps.</p>
    </div>

    <div class="steps" id="steps"></div>

    <div class="card">
        {{-- 0 Welcome --}}
        <div class="panel" data-step="0">
            <h2>Welcome</h2>
            <p class="sub">This wizard will configure your database, company profile and administrator account, then install the application.</p>
            <p>Make sure you have your database credentials ready. The process takes about a minute.</p>
            <div class="actions"><span></span><button onclick="go(1)">Get Started →</button></div>
        </div>

        {{-- 1 Requirements --}}
        <div class="panel" data-step="1" hidden>
            <h2>Server Requirements</h2>
            <p class="sub">Your server must meet these requirements.</p>
            <div id="reqList" class="center"><span class="spinner"></span> Checking…</div>
            <div class="actions">
                <button class="ghost" onclick="go(0)">← Back</button>
                <button id="reqNext" onclick="go(2)" disabled>Next →</button>
            </div>
        </div>

        {{-- 2 Database --}}
        <div class="panel" data-step="2" hidden>
            <h2>Database Setup</h2>
            <p class="sub">Enter your database connection details.</p>
            <div class="row">
                <div><label>Connection</label>
                    <select id="db_connection">
                        <option value="mysql">MySQL</option>
                        <option value="mariadb">MariaDB</option>
                        <option value="pgsql">PostgreSQL</option>
                        <option value="sqlite">SQLite</option>
                    </select>
                </div>
                <div><label>Host</label><input id="db_host" value="127.0.0.1"></div>
                <div style="max-width:120px"><label>Port</label><input id="db_port" value="3306"></div>
            </div>
            <label>Database Name</label><input id="db_database" placeholder="kiteledger">
            <div class="row">
                <div><label>Username</label><input id="db_username" placeholder="root"></div>
                <div><label>Password</label><input id="db_password" type="password"></div>
            </div>
            <div id="dbMsg" class="msg"></div>
            <div class="actions">
                <button class="ghost" onclick="go(1)">← Back</button>
                <span>
                    <button class="ghost" onclick="testDb()">Test Connection</button>
                    <button onclick="go(3)">Next →</button>
                </span>
            </div>
        </div>

        {{-- 3 Application --}}
        <div class="panel" data-step="3" hidden>
            <h2>Application Setup</h2>
            <p class="sub">Basic application configuration.</p>
            <div class="row">
                <div><label>Application Name</label><input id="app_name" value="{{ config('app.name', 'KiteLedger') }}"></div>
                <div><label>Application URL</label><input id="app_url" value="{{ url('/') }}"></div>
            </div>
            <div class="row">
                <div><label>Timezone</label><input id="timezone" value="UTC"></div>
                <div><label>Default Currency Code</label><input id="currency_code" value="USD" maxlength="10"></div>
                <div style="max-width:140px"><label>Currency Symbol</label><input id="currency_symbol" value="$" maxlength="10"></div>
            </div>
            <div class="actions">
                <button class="ghost" onclick="go(2)">← Back</button>
                <button onclick="go(4)">Next →</button>
            </div>
        </div>

        {{-- 4 Company --}}
        <div class="panel" data-step="4" hidden>
            <h2>Company Profile</h2>
            <p class="sub">These details appear on documents and invoices.</p>
            <div class="row">
                <div><label>Company Name *</label><input id="company_name"></div>
                <div><label>Legal Name</label><input id="legal_name"></div>
            </div>
            <div class="row">
                <div><label>Email</label><input id="company_email" type="email"></div>
                <div><label>Phone</label><input id="company_phone"></div>
            </div>
            <div class="row">
                <div><label>Country</label><input id="company_country"></div>
                <div><label>Website</label><input id="company_website" placeholder="https://"></div>
            </div>
            <label>Address</label><input id="company_address">
            <div class="actions">
                <button class="ghost" onclick="go(3)">← Back</button>
                <button onclick="go(5)">Next →</button>
            </div>
        </div>

        {{-- 5 Admin --}}
        <div class="panel" data-step="5" hidden>
            <h2>Administrator Account</h2>
            <p class="sub">Create the super administrator login.</p>
            <label>Full Name *</label><input id="admin_name">
            <label>Email *</label><input id="admin_email" type="email">
            <div class="row">
                <div><label>Password *</label><input id="admin_password" type="password"><span class="hint">Minimum 8 characters.</span></div>
                <div><label>Confirm Password *</label><input id="admin_password_confirmation" type="password"></div>
            </div>
            <div id="runMsg" class="msg"></div>
            <div class="actions">
                <button class="ghost" onclick="go(4)">← Back</button>
                <button id="installBtn" onclick="install()">Install Now</button>
            </div>
        </div>

        {{-- 6 Finish --}}
        <div class="panel" data-step="6" hidden>
            <h2>🎉 Installation Complete</h2>
            <p class="sub">Your application is ready to use.</p>
            <p>You can now sign in with the administrator account you created.</p>
            <div class="actions center" style="justify-content:center">
                <a id="loginLink" href="/login"><button>Go to Login →</button></a>
            </div>
        </div>
    </div>
</div>

<script>
    const STEP_LABELS = ['Welcome','Requirements','Database','Application','Company','Admin','Finish'];
    let current = 0;

    function renderSteps() {
        document.getElementById('steps').innerHTML = STEP_LABELS.map((l, i) =>
            `<div class="s ${i === current ? 'active' : (i < current ? 'done' : '')}">${i + 1}. ${l}</div>`).join('');
    }
    function show(step) {
        document.querySelectorAll('.panel').forEach(p => p.hidden = Number(p.dataset.step) !== step);
        current = step; renderSteps();
        if (step === 1) loadRequirements();
        if (step === 6) renderSteps();
    }
    function go(step) { show(step); }

    async function post(url, body) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify(body),
        });
        let data = {};
        try { data = await res.json(); } catch (e) {}
        return { ok: res.ok, data };
    }

    async function loadRequirements() {
        const el = document.getElementById('reqList');
        el.innerHTML = '<span class="spinner"></span> Checking…';
        try {
            const res = await fetch('{{ url('/install/requirements') }}', { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            el.innerHTML = data.checks.map(c =>
                `<div class="check"><span>${c.label}${c.hint ? ` <span class="hint">${c.hint}</span>` : ''}</span>
                 <span class="pill ${c.passed ? 'ok' : 'bad'}">${c.passed ? 'OK' : 'Missing'}</span></div>`).join('');
            document.getElementById('reqNext').disabled = !data.passed;
        } catch (e) {
            el.innerHTML = '<div class="msg bad">Could not run requirement checks.</div>';
        }
    }

    function dbPayload() {
        return {
            db_connection: val('db_connection'), db_host: val('db_host'), db_port: val('db_port'),
            db_database: val('db_database'), db_username: val('db_username'), db_password: val('db_password'),
        };
    }
    const val = (id) => (document.getElementById(id)?.value || '').trim();
    function msg(id, text, ok) { const el = document.getElementById(id); el.textContent = text; el.className = 'msg ' + (ok ? 'ok' : 'bad'); }

    async function testDb() {
        msg('dbMsg', 'Testing…', true);
        const { ok, data } = await post('{{ url('/install/database') }}', dbPayload());
        msg('dbMsg', data.message || (ok ? 'OK' : 'Failed'), ok);
    }

    async function install() {
        const btn = document.getElementById('installBtn');
        btn.disabled = true; btn.innerHTML = '<span class="spinner"></span> Installing…';
        const payload = Object.assign(dbPayload(), {
            app_name: val('app_name'), app_url: val('app_url'), timezone: val('timezone'),
            currency_code: val('currency_code'), currency_symbol: val('currency_symbol'),
            company_name: val('company_name'), legal_name: val('legal_name'),
            company_email: val('company_email'), company_phone: val('company_phone'),
            company_address: val('company_address'), company_country: val('company_country'),
            company_website: val('company_website'),
            admin_name: val('admin_name'), admin_email: val('admin_email'),
            admin_password: val('admin_password'), admin_password_confirmation: val('admin_password_confirmation'),
        });
        const { ok, data } = await post('{{ url('/install/run') }}', payload);
        btn.disabled = false; btn.textContent = 'Install Now';
        if (ok && data.success) {
            if (data.login_url) document.getElementById('loginLink').href = data.login_url;
            show(6);
        } else {
            const first = data.errors ? Object.values(data.errors)[0][0] : data.message;
            msg('runMsg', first || 'Installation failed.', false);
        }
    }

    document.getElementById('db_connection').addEventListener('change', (e) => {
        document.getElementById('db_port').value = e.target.value === 'pgsql' ? '5432' : '3306';
    });

    show(0);
</script>
@include('partials.localization-script')
</body>
</html>
