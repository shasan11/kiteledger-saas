@extends('vendor.installer.layouts.master')

@section('title', 'Installing Database')

@section('style')
    <style>
        .install-status {
            max-width: 520px;
            margin: 0 auto;
            text-align: center;
        }

        .install-spinner {
            width: 42px;
            height: 42px;
            margin: 12px auto;
            border: 4px solid #e5e7eb;
            border-top-color: #2563eb;
            border-radius: 50%;
            animation: install-spin 0.9s linear infinite;
        }

        .install-step {
            margin: 10px 0 6px;
            font-weight: 700;
        }

        .install-message {
            color: #4b5563;
            line-height: 1.5;
        }

        .install-warning {
            display: none;
            margin-top: 12px;
            padding: 10px 12px;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            background: #fffbeb;
            color: #92400e;
            text-align: left;
            line-height: 1.45;
        }

        .install-log {
            max-height: 180px;
            overflow: auto;
            margin-top: 14px;
            padding: 10px;
            text-align: left;
            background: #111827;
            color: #d1d5db;
            border-radius: 6px;
            font-family: monospace;
            font-size: 12px;
            line-height: 1.45;
            white-space: pre-wrap;
        }

        .install-actions {
            margin-top: 16px;
        }

        @keyframes install-spin {
            to {
                transform: rotate(360deg);
            }
        }
    </style>
@endsection

@section('container')
    <div class="install-status">
        <div id="install-spinner" class="install-spinner"></div>
        <div id="install-step" class="install-step">{{ ($status['state'] ?? 'idle') === 'idle' ? 'Starting installer' : ($status['step'] ?: 'Starting installer') }}</div>
        <p id="install-message" class="install-message">{{ ($status['state'] ?? 'idle') === 'idle' ? 'Preparing database installation. This can take a minute. Keep this tab open.' : ($status['message'] ?: 'Preparing database installation.') }}</p>
        <div id="install-warning" class="install-warning"></div>
        <pre id="install-log" class="install-log">{{ implode(PHP_EOL, $status['log'] ?? []) }}</pre>
        <div id="install-actions" class="install-actions" style="display:none;">
            <a id="install-retry" class="button" href="{{ url('/install/database?reset=1') }}">Try Again</a>
            <a id="install-login" class="button" href="{{ url('/login') }}" style="display:none;">Go to login</a>
        </div>
    </div>
@endsection

@section('scripts')
    <script>
        (function () {
            var startUrl = "{{ url('/install/database/start') }}";
            var statusUrl = "{{ url('/install/database/status') }}";
            var finalUrl = "{{ url('/install/final') }}";
            var stepEl = document.getElementById('install-step');
            var messageEl = document.getElementById('install-message');
            var warningEl = document.getElementById('install-warning');
            var logEl = document.getElementById('install-log');
            var spinnerEl = document.getElementById('install-spinner');
            var actionsEl = document.getElementById('install-actions');
            var retryEl = document.getElementById('install-retry');
            var loginEl = document.getElementById('install-login');
            var lastUpdatedAt = null;
            var lastStatusChangeAt = Date.now();

            function preview(text) {
                return String(text || '').replace(/\s+/g, ' ').trim().slice(0, 240);
            }

            function requestJson(url) {
                return fetch(url, { headers: { 'Accept': 'application/json' } })
                    .then(function (response) {
                        var contentType = response.headers.get('content-type') || '';

                        return response.text().then(function (body) {
                            if (!response.ok) {
                                throw new Error('Installer request failed with HTTP ' + response.status + '. ' + preview(body));
                            }

                            if (contentType.indexOf('application/json') === -1) {
                                throw new Error('Installer returned a non-JSON response. ' + preview(body));
                            }

                            try {
                                return JSON.parse(body);
                            } catch (error) {
                                throw new Error('Installer returned invalid JSON. ' + preview(body));
                            }
                        });
                    });
            }

            function showFailure(message) {
                spinnerEl.style.display = 'none';
                stepEl.textContent = 'Failed';
                messageEl.textContent = message;
                warningEl.style.display = 'none';
                actionsEl.style.display = 'block';
                retryEl.style.display = 'inline-block';
                loginEl.style.display = 'none';
            }

            function showStaleWarning() {
                warningEl.textContent = 'The installer may be stuck. Check storage/logs/laravel.log, or run php artisan install:run-web from the command line.';
                warningEl.style.display = 'block';
            }

            function render(payload) {
                stepEl.textContent = payload.step || 'Installing';
                messageEl.textContent = payload.message || 'Installation is running.';
                logEl.textContent = Array.isArray(payload.log) ? payload.log.join("\n") : '';
                logEl.scrollTop = logEl.scrollHeight;

                if (payload.updated_at && payload.updated_at !== lastUpdatedAt) {
                    lastUpdatedAt = payload.updated_at;
                    lastStatusChangeAt = Date.now();
                    warningEl.style.display = 'none';
                }

                if (payload.state === 'succeeded') {
                    spinnerEl.style.display = 'none';
                    actionsEl.style.display = 'block';
                    retryEl.style.display = 'none';
                    loginEl.style.display = 'inline-block';
                    window.location.href = finalUrl;
                    return false;
                }

                if (payload.state === 'failed') {
                    showFailure(payload.message || 'Installation failed.');
                    return false;
                }

                if (payload.state === 'running' && Date.now() - lastStatusChangeAt > 180000) {
                    showStaleWarning();
                }

                return payload.state === 'running' || payload.state === 'idle';
            }

            function poll() {
                requestJson(statusUrl)
                    .then(function (payload) {
                        if (render(payload)) {
                            window.setTimeout(poll, 2500);
                        }
                    })
                    .catch(function (error) {
                        showFailure(error.message || 'Could not read installer status.');
                    });
            }

            requestJson(startUrl)
                .then(function (payload) {
                    if (render(payload)) {
                        window.setTimeout(poll, 2500);
                    }
                })
                .catch(function (error) {
                    showFailure(error.message || 'Could not start installer.');
                });
        })();
    </script>
@endsection
