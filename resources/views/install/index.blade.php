<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{{ config('app.name', 'KiteLedger') }} Installer</title>
    <style>
        :root {
            --ink:#111827; --ink-soft:#1f2937; --muted:#6b7280; --faint:#9ca3af;
            --bg:#f4f5f7; --card:#ffffff; --bd:#e5e7eb; --bd-strong:#d1d5db;
            --accent:#111827; --ok:#15803d; --ok-bg:#f0fdf4; --bad:#b91c1c; --bad-bg:#fef2f2;
            --ring:rgba(17,24,39,.10);
        }
        * { box-sizing:border-box; }
        body {
            margin:0; min-height:100vh;
            font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,Helvetica,Arial,sans-serif;
            background:var(--bg); color:var(--ink);
            -webkit-font-smoothing:antialiased; line-height:1.5;
        }
        .wrap { max-width:640px; margin:0 auto; padding:56px 20px 72px; }
        .brand { text-align:center; margin-bottom:30px; }
        .brand .mark {
            width:46px; height:46px; margin:0 auto 14px; border-radius:12px;
            background:var(--ink); color:#fff; display:flex; align-items:center; justify-content:center;
            font-size:22px; font-weight:600; letter-spacing:-.5px;
        }
        .brand h1 { margin:0; font-size:21px; font-weight:600; letter-spacing:-.3px; }
        .brand p { margin:5px 0 0; color:var(--muted); font-size:14px; }

        /* Slim numbered stepper */
        .stepper-track { display:flex; align-items:center; margin:0 auto 8px; max-width:520px; }
        .stepper-track .dot {
            flex:0 0 auto; width:26px; height:26px; border-radius:50%;
            display:flex; align-items:center; justify-content:center;
            font-size:12px; font-weight:600; background:#fff; color:var(--faint);
            border:1.5px solid var(--bd-strong); transition:.2s; z-index:1;
        }
        .stepper-track .dot.active { background:var(--accent); color:#fff; border-color:var(--accent); }
        .stepper-track .dot.done { background:var(--accent); color:#fff; border-color:var(--accent); }
        .stepper-track .seg { flex:1 1 auto; height:1.5px; background:var(--bd-strong); margin:0 -1px; }
        .stepper-track .seg.filled { background:var(--accent); }
        .stepper-caption { text-align:center; font-size:12.5px; color:var(--muted); margin-bottom:22px; letter-spacing:.1px; }

        .card { background:var(--card); border:1px solid var(--bd); border-radius:16px; padding:30px 30px 26px; box-shadow:0 1px 2px rgba(16,24,40,.04), 0 8px 24px rgba(16,24,40,.05); }
        .card h2 { margin:0 0 6px; font-size:18px; font-weight:600; letter-spacing:-.2px; }
        .card .sub { color:var(--muted); margin:0 0 22px; font-size:14px; }
        .card > p { font-size:14px; color:var(--ink-soft); }

        label { display:block; font-size:13px; font-weight:500; color:var(--ink-soft); margin:14px 0 6px; }
        input, select {
            width:100%; padding:10px 12px; border:1px solid var(--bd-strong); border-radius:9px;
            font-size:14px; color:var(--ink); background:#fff; transition:border-color .15s, box-shadow .15s;
            font-family:inherit;
        }
        input::placeholder { color:var(--faint); }
        input:focus, select:focus { outline:none; border-color:var(--accent); box-shadow:0 0 0 3px var(--ring); }
        input[type="checkbox"], input[type="radio"] { width:auto; padding:0; accent-color:var(--accent); }
        .row { display:flex; gap:14px; }
        .row > div { flex:1; }

        .actions { display:flex; justify-content:space-between; align-items:center; gap:12px; margin-top:28px; }
        .actions span { display:inline-flex; gap:10px; flex-wrap:wrap; justify-content:flex-end; }
        button {
            padding:10px 18px; border-radius:9px; border:1px solid var(--accent); background:var(--accent);
            color:#fff; font-size:14px; font-weight:500; cursor:pointer; font-family:inherit; transition:.15s;
        }
        button:hover:not(:disabled) { background:var(--ink-soft); }
        button.ghost { background:#fff; color:var(--ink-soft); border-color:var(--bd-strong); }
        button.ghost:hover:not(:disabled) { background:#f9fafb; }
        button:disabled { opacity:.5; cursor:not-allowed; }

        .check { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:11px 0; border-bottom:1px solid var(--bd); font-size:14px; }
        .check:last-child { border-bottom:none; }
        .pill { white-space:nowrap; font-size:12px; font-weight:500; padding:3px 10px; border-radius:999px; display:inline-flex; align-items:center; gap:5px; }
        .pill::before { content:""; width:6px; height:6px; border-radius:50%; background:currentColor; }
        .pill.ok { background:var(--ok-bg); color:var(--ok); }
        .pill.bad { background:var(--bad-bg); color:var(--bad); }
        .msg { padding:11px 13px; border-radius:9px; font-size:13px; margin-top:14px; display:none; border:1px solid transparent; }
        .msg.ok { background:var(--ok-bg); color:#166534; border-color:#bbf7d0; display:block; }
        .msg.bad { background:var(--bad-bg); color:#991b1b; border-color:#fecaca; display:block; }
        .hint { color:var(--muted); font-size:12px; }
        .center { text-align:center; }
        .spinner { display:inline-block; width:15px; height:15px; border:2px solid currentColor; border-top-color:transparent; border-radius:50%; animation:spin .7s linear infinite; vertical-align:-2px; margin-right:4px; }
        @keyframes spin { to { transform:rotate(360deg); } }

        .success-mark {
            width:52px; height:52px; margin:4px auto 16px; border-radius:50%;
            background:var(--ok-bg); color:var(--ok); border:1.5px solid #bbf7d0;
            display:flex; align-items:center; justify-content:center; font-size:26px; line-height:1;
        }

        .progress-wrap { display:none; margin:22px 0 4px; }
        .progress-wrap.show { display:block; }
        .progress { height:8px; background:#eceef1; border-radius:999px; overflow:hidden; }
        .progress .bar { height:100%; width:0; background:var(--accent); border-radius:999px; transition:width .45s ease; }
        .progress-label { display:flex; justify-content:space-between; align-items:center; font-size:13px; color:var(--muted); margin-top:10px; }
        .progress-label .pct { font-weight:600; color:var(--ink); font-variant-numeric:tabular-nums; }

        @media (max-width:640px) {
            .wrap { padding:32px 16px 48px; }
            .card { padding:22px 18px; border-radius:14px; }
            .row, .actions { flex-direction:column; align-items:stretch; }
            .actions span { justify-content:stretch; }
            button { width:100%; }
            .stepper-caption { margin-bottom:18px; }
        }
    </style>
</head>
<body>
<div class="wrap">
    <div class="brand">
        <div class="mark">{{ strtoupper(substr(config('app.name', 'KiteLedger'), 0, 1)) }}</div>
        <h1>Install {{ config('app.name', 'KiteLedger') }}</h1>
        <p>Set up your accounting application in a few steps.</p>
    </div>

    <div id="steps"></div>

    <div class="card">
        <div id="stepMsg" class="msg"></div>

        <div class="panel" data-step="0">
            <h2>Welcome</h2>
            <p class="sub">This wizard will configure your database, company profile, storage, language, and administrator account.</p>
            <p>Have your database name, username, and password ready. The installer writes a production `.env`, runs migrations, creates the admin user, and prepares public file storage.</p>
            <div class="actions"><span></span><button type="button" onclick="go(1)">Get Started &rarr;</button></div>
        </div>

        <div class="panel" data-step="1" hidden>
            <h2>Server Requirements</h2>
            <p class="sub">Your server must pass these checks before installation.</p>
            <div id="reqList" class="center"><span class="spinner"></span> Checking...</div>
            <div class="actions">
                <button type="button" class="ghost" onclick="go(0)">&larr; Back</button>
                <button type="button" id="reqNext" onclick="go(2)" disabled>Next &rarr;</button>
            </div>
        </div>

        <div class="panel" data-step="2" hidden>
            <h2>Database Setup</h2>
            <p class="sub">Enter your database connection details.</p>
            <div class="row">
                <div><label for="db_connection">Connection</label>
                    <select id="db_connection">
                        <option value="mysql">MySQL</option>
                        <option value="mariadb">MariaDB</option>
                        <option value="pgsql">PostgreSQL</option>
                        <option value="sqlite">SQLite</option>
                    </select>
                </div>
                <div><label for="db_host">Host</label><input id="db_host" value="127.0.0.1"></div>
                <div style="max-width:120px"><label for="db_port">Port</label><input id="db_port" value="3306"></div>
            </div>
            <label for="db_database">Database Name</label><input id="db_database" placeholder="kiteledger">
            <div class="row">
                <div><label for="db_username">Username</label><input id="db_username" placeholder="root"></div>
                <div><label for="db_password">Password</label><input id="db_password" type="password"></div>
            </div>
            <div id="dbMsg" class="msg"></div>
            <div class="actions">
                <button type="button" class="ghost" onclick="go(1)">&larr; Back</button>
                <span>
                    <button type="button" class="ghost" onclick="testDb()">Test Connection</button>
                    <button type="button" onclick="go(3)">Next &rarr;</button>
                </span>
            </div>
        </div>

        <div class="panel" data-step="3" hidden>
            <h2>Application Setup</h2>
            <p class="sub">Basic application configuration.</p>
            <div class="row">
                <div><label for="app_name">Application Name</label><input id="app_name" value="{{ config('app.name', 'KiteLedger') }}"></div>
                <div><label for="app_url">Application URL</label><input id="app_url" value="{{ $detectedUrl }}"><span class="hint">Edit this if your app is installed in a subfolder or behind a proxy/CDN.</span></div>
            </div>
            <div class="row">
                <div><label for="timezone">Timezone</label><input id="timezone" value="UTC"></div>
                <div><label for="currency_code">Default Currency Code</label><input id="currency_code" value="USD" maxlength="10"></div>
                <div style="max-width:140px"><label for="currency_symbol">Currency Symbol</label><input id="currency_symbol" value="$" maxlength="10"></div>
            </div>
            <div class="actions">
                <button type="button" class="ghost" onclick="go(2)">&larr; Back</button>
                <button type="button" onclick="go(4)">Next &rarr;</button>
            </div>
        </div>

        <div class="panel" data-step="4" hidden>
            <h2>Company Profile</h2>
            <p class="sub">These details appear on documents and invoices.</p>
            <div class="row">
                <div><label for="company_name">Company Name *</label><input id="company_name"></div>
                <div><label for="legal_name">Legal Name</label><input id="legal_name"></div>
            </div>
            <div class="row">
                <div><label for="company_email">Email</label><input id="company_email" type="email"></div>
                <div><label for="company_phone">Phone</label><input id="company_phone"></div>
            </div>
            <div class="row">
                <div><label for="company_country">Country</label><input id="company_country"></div>
                <div><label for="company_website">Website</label><input id="company_website" placeholder="https://"></div>
            </div>
            <label for="company_address">Address</label><input id="company_address">
            <div class="actions">
                <button type="button" class="ghost" onclick="go(3)">&larr; Back</button>
                <button type="button" onclick="go(5)">Next &rarr;</button>
            </div>
        </div>

        <div class="panel" data-step="5" hidden>
            <h2>Branch Setup</h2>
            <p class="sub">Your company's first head office branch.</p>
            <div class="row">
                <div><label for="branch_name">Branch Name *</label><input id="branch_name" value="Main Branch"></div>
                <div style="max-width:160px"><label for="branch_code">Branch Code</label><input id="branch_code" value="MAIN" maxlength="30"></div>
            </div>
            <p class="hint">You can add more branches later from the admin panel.</p>
            <div class="actions">
                <button type="button" class="ghost" onclick="go(4)">&larr; Back</button>
                <button type="button" onclick="go(6)">Next &rarr;</button>
            </div>
        </div>

        <div class="panel" data-step="6" hidden>
            <h2>Administrator Account</h2>
            <p class="sub">Create the super administrator login.</p>
            <label for="admin_name">Full Name *</label><input id="admin_name">
            <label for="admin_email">Email *</label><input id="admin_email" type="email">
            <div class="row">
                <div><label for="admin_password">Password *</label><input id="admin_password" type="password"><span class="hint">Minimum 8 characters.</span></div>
                <div><label for="admin_password_confirmation">Confirm Password *</label><input id="admin_password_confirmation" type="password"></div>
            </div>
            <div class="actions">
                <button type="button" class="ghost" onclick="go(5)">&larr; Back</button>
                <button type="button" onclick="go(7)">Next &rarr;</button>
            </div>
        </div>

        <div class="panel" data-step="7" hidden>
            <h2>Language Setup</h2>
            <p class="sub">English is the installation default. Enable any extra languages your users should be able to choose.</p>
            <div id="langList"></div>
            <div id="runMsg" class="msg"></div>
            <div id="installProgress" class="progress-wrap">
                <div class="progress"><div class="bar" id="progressBar"></div></div>
                <div class="progress-label">
                    <span id="progressStage">Preparing&hellip;</span>
                    <span class="pct" id="progressPct">0%</span>
                </div>
                <p class="hint" style="margin-top:6px;">This can take a minute or two on the first install. Please keep this tab open.</p>
            </div>
            <div class="actions">
                <button type="button" class="ghost" id="installBack" onclick="go(6)">&larr; Back</button>
                <button type="button" id="installBtn" onclick="install()">Install Now</button>
            </div>
        </div>

        <div class="panel" data-step="8" hidden>
            <div class="center">
                <div class="success-mark">&#10003;</div>
                <h2 style="margin-bottom:8px;">Installation complete</h2>
                <p class="sub" style="margin-bottom:18px;">Your application is ready. Sign in with the administrator account you just created.</p>
                <p id="storageNotice" class="hint" style="margin-bottom:22px;"></p>
                <a id="loginLink" href="/login"><button type="button">Go to Login &rarr;</button></a>
            </div>
        </div>
    </div>
</div>

<script>
    const STEP_LABELS = ['Welcome','Requirements','Database','Application','Company','Branch','Admin','Language','Finish'];
    const LANGUAGES = [
        { code: 'en', name: 'English', default: true },
        { code: 'es', name: 'Spanish (Espanol)' },
        { code: 'fr', name: 'French (Francais)' },
        { code: 'ne', name: 'Nepali' },
        { code: 'ar', name: 'Arabic' },
    ];
    let current = 0;

    const val = (id) => (document.getElementById(id)?.value || '').trim();

    function renderSteps() {
        let track = '';
        STEP_LABELS.forEach((label, index) => {
            if (index > 0) track += `<div class="seg ${index <= current ? 'filled' : ''}"></div>`;
            const state = index === current ? 'active' : (index < current ? 'done' : '');
            const inner = index < current ? '&#10003;' : (index + 1);
            track += `<div class="dot ${state}" title="${label}">${inner}</div>`;
        });
        document.getElementById('steps').innerHTML =
            `<div class="stepper-track">${track}</div>
             <div class="stepper-caption">Step ${current + 1} of ${STEP_LABELS.length} &middot; ${STEP_LABELS[current]}</div>`;
    }

    function renderLanguages() {
        const el = document.getElementById('langList');
        if (el.dataset.rendered) return;
        el.dataset.rendered = '1';
        el.innerHTML = LANGUAGES.map((language) => `
            <div class="check">
                <label style="display:inline;font-weight:400;margin:0;">
                    <input type="checkbox" class="lang-enable" value="${language.code}" ${language.default ? 'checked disabled' : ''}>
                    ${language.name}
                </label>
                ${language.default ? '<span class="pill ok">Default</span>' : '<span class="hint">Optional</span>'}
            </div>`).join('');
    }

    function show(step) {
        document.querySelectorAll('.panel').forEach((panel) => {
            panel.hidden = Number(panel.dataset.step) !== step;
        });
        current = step;
        clearStepMessage();
        renderSteps();
        if (step === 1) loadRequirements();
        if (step === 7) renderLanguages();
    }

    function go(step) {
        if (step > current && !validateStep(current)) return;
        show(step);
    }

    function setStepMessage(text) {
        const el = document.getElementById('stepMsg');
        el.textContent = text;
        el.className = 'msg bad';
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    function clearStepMessage() {
        const el = document.getElementById('stepMsg');
        el.textContent = '';
        el.className = 'msg';
    }

    function requireFields(ids, message) {
        const missing = ids.find((id) => !val(id));
        if (missing) {
            document.getElementById(missing)?.focus();
            setStepMessage(message);
            return false;
        }
        return true;
    }

    function validateStep(step) {
        if (step === 2) {
            if (!requireFields(['db_database'], 'Enter the database name before continuing.')) return false;
            if (val('db_connection') !== 'sqlite' && !requireFields(['db_host', 'db_port', 'db_username'], 'Enter the database host, port, and username.')) return false;
        }
        if (step === 3 && !requireFields(['app_name', 'app_url', 'timezone', 'currency_code'], 'Complete the application name, URL, timezone, and currency code.')) return false;
        if (step === 4 && !requireFields(['company_name'], 'Enter your company name.')) return false;
        if (step === 5 && !requireFields(['branch_name'], 'Enter the branch name.')) return false;
        if (step === 6) {
            if (!requireFields(['admin_name', 'admin_email', 'admin_password', 'admin_password_confirmation'], 'Complete the administrator account fields.')) return false;
            if (val('admin_password').length < 8) {
                setStepMessage('Administrator password must be at least 8 characters.');
                return false;
            }
            if (val('admin_password') !== val('admin_password_confirmation')) {
                setStepMessage('Administrator password confirmation does not match.');
                return false;
            }
        }
        return true;
    }

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
        el.innerHTML = '<span class="spinner"></span> Checking...';
        try {
            const res = await fetch('{{ url('/install/requirements') }}', { headers: { 'Accept': 'application/json' } });
            const data = await res.json();
            el.innerHTML = data.checks.map((check) =>
                `<div class="check"><span>${check.label}${check.hint ? ` <span class="hint">${check.hint}</span>` : ''}</span>
                 <span class="pill ${check.passed ? 'ok' : 'bad'}">${check.passed ? 'OK' : 'Missing'}</span></div>`
            ).join('');
            document.getElementById('reqNext').disabled = !data.passed;
        } catch (e) {
            el.innerHTML = '<div class="msg bad">Could not run requirement checks.</div>';
        }
    }

    function dbPayload() {
        return {
            db_connection: val('db_connection'),
            db_host: val('db_host'),
            db_port: val('db_port'),
            db_database: val('db_database'),
            db_username: val('db_username'),
            db_password: val('db_password'),
        };
    }

    function msg(id, text, ok) {
        const el = document.getElementById(id);
        el.textContent = text;
        el.className = 'msg ' + (ok ? 'ok' : 'bad');
    }

    async function testDb() {
        if (!validateStep(2)) return;
        msg('dbMsg', 'Testing...', true);
        const { ok, data } = await post('{{ url('/install/database') }}', dbPayload());
        msg('dbMsg', data.message || (ok ? 'Connection successful.' : 'Connection failed.'), ok);
    }

    // The /install/run request runs the whole install in one blocking call
    // (no server-side streaming), so this drives a believable progress bar:
    // it eases up toward 95% with labels matching the real server steps, then
    // snaps to 100% when the request actually returns. Stage `at` = percent
    // at which each label appears.
    const INSTALL_STAGES = [
        { at: 0,  text: 'Writing configuration…' },
        { at: 10, text: 'Connecting to the database…' },
        { at: 18, text: 'Running database migrations…' },
        { at: 62, text: 'Seeding initial data…' },
        { at: 80, text: 'Creating company, branch & admin…' },
        { at: 92, text: 'Finalizing installation…' },
    ];
    let progressTimer = null;

    function setProgress(pct) {
        const p = Math.max(0, Math.min(100, Math.round(pct)));
        document.getElementById('progressBar').style.width = p + '%';
        document.getElementById('progressPct').textContent = p + '%';
        const stage = INSTALL_STAGES.filter((s) => p >= s.at).pop();
        if (stage) document.getElementById('progressStage').textContent = stage.text;
    }

    function startProgress() {
        document.getElementById('installProgress').classList.add('show');
        let pct = 0;
        setProgress(0);
        clearInterval(progressTimer);
        progressTimer = setInterval(() => {
            // Ease-out: approach 95% asymptotically so it keeps moving on slow
            // hosts but never claims to be finished before the server is.
            pct += Math.max(0.25, (95 - pct) * 0.015);
            if (pct > 95) pct = 95;
            setProgress(pct);
        }, 400);
    }

    function stopProgress(success) {
        clearInterval(progressTimer);
        progressTimer = null;
        if (success) {
            setProgress(100);
            document.getElementById('progressStage').textContent = 'Complete';
        } else {
            document.getElementById('installProgress').classList.remove('show');
            setProgress(0);
        }
    }

    async function install() {
        if (!validateStep(7)) return;

        const btn = document.getElementById('installBtn');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner"></span> Installing...';
        document.getElementById('installBack').disabled = true;
        clearStepMessage();
        msg('runMsg', '', true);
        document.getElementById('runMsg').className = 'msg';
        startProgress();

        const payload = Object.assign(dbPayload(), {
            app_name: val('app_name'),
            app_url: val('app_url'),
            timezone: val('timezone'),
            currency_code: val('currency_code'),
            currency_symbol: val('currency_symbol'),
            company_name: val('company_name'),
            legal_name: val('legal_name'),
            company_email: val('company_email'),
            company_phone: val('company_phone'),
            company_address: val('company_address'),
            company_country: val('company_country'),
            company_website: val('company_website'),
            branch_name: val('branch_name'),
            branch_code: val('branch_code'),
            admin_name: val('admin_name'),
            admin_email: val('admin_email'),
            admin_password: val('admin_password'),
            admin_password_confirmation: val('admin_password_confirmation'),
            default_language: 'en',
            enabled_languages: Array.from(document.querySelectorAll('.lang-enable:checked')).map((checkbox) => checkbox.value),
        });

        let ok = false, data = {};
        try {
            ({ ok, data } = await post('{{ url('/install/run') }}', payload));
        } catch (e) {
            stopProgress(false);
            btn.disabled = false;
            btn.textContent = 'Install Now';
            document.getElementById('installBack').disabled = false;
            msg('runMsg', 'The install request could not be completed. Check your network and try again.', false);
            return;
        }

        if (ok && data.success) {
            stopProgress(true);
            if (data.login_url) document.getElementById('loginLink').href = data.login_url;
            if (data.storage?.message) document.getElementById('storageNotice').textContent = data.storage.message;
            // Brief beat so the user sees 100% before the Finish screen.
            setTimeout(() => show(8), 500);
        } else {
            stopProgress(false);
            btn.disabled = false;
            btn.textContent = 'Install Now';
            document.getElementById('installBack').disabled = false;
            const first = data.errors ? Object.values(data.errors)[0][0] : data.message;
            msg('runMsg', first || 'Installation failed.', false);
        }
    }

    document.getElementById('db_connection').addEventListener('change', (event) => {
        const port = event.target.value === 'pgsql' ? '5432' : '3306';
        document.getElementById('db_port').value = event.target.value === 'sqlite' ? '' : port;
    });

    show(0);
</script>
</body>
</html>
