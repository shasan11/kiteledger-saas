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
        <div id="install-step" class="install-step">{{ $status['step'] ?: 'Starting installer' }}</div>
        <p id="install-message" class="install-message">{{ $status['message'] ?: 'Preparing database installation.' }}</p>
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
            var statusUrl = "{{ url('/install/database/status') }}";
            var finalUrl = "{{ url('/install/final') }}";
            var stepEl = document.getElementById('install-step');
            var messageEl = document.getElementById('install-message');
            var logEl = document.getElementById('install-log');
            var spinnerEl = document.getElementById('install-spinner');
            var actionsEl = document.getElementById('install-actions');
            var retryEl = document.getElementById('install-retry');
            var loginEl = document.getElementById('install-login');

            function render(payload) {
                stepEl.textContent = payload.step || 'Installing';
                messageEl.textContent = payload.message || 'Installation is running.';
                logEl.textContent = Array.isArray(payload.log) ? payload.log.join("\n") : '';
                logEl.scrollTop = logEl.scrollHeight;

                if (payload.state === 'succeeded') {
                    spinnerEl.style.display = 'none';
                    actionsEl.style.display = 'block';
                    retryEl.style.display = 'none';
                    loginEl.style.display = 'inline-block';
                    window.location.href = finalUrl;
                    return;
                }

                if (payload.state === 'failed') {
                    spinnerEl.style.display = 'none';
                    actionsEl.style.display = 'block';
                    retryEl.style.display = 'inline-block';
                    loginEl.style.display = 'none';
                }
            }

            function poll() {
                fetch(statusUrl, { headers: { 'Accept': 'application/json' } })
                    .then(function (response) { return response.json(); })
                    .then(function (payload) {
                        render(payload);

                        if (payload.state === 'running' || payload.state === 'idle') {
                            window.setTimeout(poll, 2500);
                        }
                    })
                    .catch(function () {
                        window.setTimeout(poll, 5000);
                    });
            }

            poll();
        })();
    </script>
@endsection
