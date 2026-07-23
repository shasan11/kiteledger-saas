@extends('vendor.installer.layouts.master')

@section('title', 'Environment Settings')
@section('style')
    <link href="{{ asset('installer/froiden-helper/helper.css') }}" rel="stylesheet"/>
    <style>
        .form-control{
            height: 14px;
            width: 100%;
        }
        .has-error{
            color: red;
        }
        .has-error input{
            color: black;
            border:1px solid red;
        }
    </style>
@endsection
@section('container')
    @php
        $requestHost = request()->getHost();
        $defaultUrl = request()->getSchemeAndHttpHost();
        $configuredDatabase = (string) env('DB_DATABASE', 'kiteledger');
        $defaultDatabase = blank($configuredDatabase) || strtolower($configuredDatabase) === 'laravel' ? 'kiteledger' : $configuredDatabase;
    @endphp
    <form method="post" action="{{ route('kiteledger.install.environment.save') }}" id="env-form">
        @csrf
        <p class="paragraph" style="text-align:center;">Connect the central database and create the platform administrator.</p>

        <h3>Database</h3>
        <div class="form-group">
            <label class="col-sm-2 control-label">Host</label>

            <div class="col-sm-10">
                <input type="text" name="hostname" class="form-control" value="{{ env('DB_HOST', '127.0.0.1') }}" required autocomplete="off">
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Port</label>
            <div class="col-sm-10">
                <input type="number" name="port" class="form-control" value="{{ env('DB_PORT', 3306) }}" min="1" max="65535" required>
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Username</label>
            <div class="col-sm-10">
                <input type="text" name="username" class="form-control" value="{{ env('DB_USERNAME', '') }}" required autocomplete="username">
            </div>
        </div>
        <div class="form-group">
            <label  class="col-sm-2 control-label">Password</label>
            <div class="col-sm-10">
                <input type="password" class="form-control" name="password" autocomplete="new-password">
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Database</label>
            <div class="col-sm-10">
                <input type="text" name="database" class="form-control" value="{{ $defaultDatabase }}" required>
            </div>
        </div>

        <h3>Application</h3>
        <div class="form-group">
            <label class="col-sm-2 control-label">Application URL</label>
            <div class="col-sm-10">
                <input type="url" name="app_url" class="form-control" value="{{ $defaultUrl }}" required>
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Central domains</label>
            <div class="col-sm-10">
                <input type="text" name="central_domains" class="form-control" value="{{ $requestHost }}" required>
                <small>Comma-separated domains that serve the website and admin panel.</small>
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Tenant base domain</label>
            <div class="col-sm-10">
                <input type="text" name="saas_base_domain" class="form-control" value="{{ $requestHost }}" required>
                <small>Tenant subdomains will use company.{{ $requestHost }}.</small>
            </div>
        </div>

        <h3>Platform administrator</h3>
        <div class="form-group">
            <label class="col-sm-2 control-label">Name</label>
            <div class="col-sm-10">
                <input type="text" name="admin_name" class="form-control" value="KiteLedger Administrator" required autocomplete="name">
            </div>
        </div>

        <h3>Company Database Setup</h3>
        <p style="font-size:13px;color:#6b7280;">KiteLedger uses a separate database for every company. Single-database mode is not available.</p>
        <div class="form-group">
            <label class="col-sm-2 control-label">Provisioning mode</label>
            <div class="col-sm-10">
                <select name="provisioning_mode" id="provisioning_mode" class="form-control" style="height:34px;" required>
                    <option value="manual" selected>Manual / pre-created database (recommended for shared hosting)</option>
                    <option value="cpanel">cPanel UAPI</option>
                    <option value="mysql">Privileged MySQL database creation</option>
                </select>
                <small>Pool mode works without CREATE DATABASE privileges and is safest on shared hosting.</small>
            </div>
        </div>
        <div id="cpanel_fields" style="display:none;border-left:3px solid #e5e7eb;padding-left:10px;">
            @foreach ([
                ['cpanel_host', 'cPanel host', 'url', 'https://server.example.com'],
                ['cpanel_port', 'cPanel port', 'number', '2083'],
                ['cpanel_username', 'cPanel username', 'text', ''],
                ['cpanel_api_token', 'cPanel API token', 'password', ''],
                ['cpanel_database_user', 'cPanel database user', 'text', ''],
                ['cpanel_database_password', 'Database user password', 'password', ''],
            ] as [$name, $label, $type, $placeholder])
                <div class="form-group">
                    <label class="col-sm-2 control-label">{{ $label }}</label>
                    <div class="col-sm-10"><input type="{{ $type }}" name="{{ $name }}" class="form-control" placeholder="{{ $placeholder }}" autocomplete="off"></div>
                </div>
            @endforeach
            <small>The cPanel connection is tested when you click Next Step. The API token is never displayed again.</small>
        </div>
        <div id="pool_fields" style="border-left:3px solid #e5e7eb;padding-left:10px;">
            <div class="alert alert-warning">
                Create this empty tenant database in cPanel first and assign the application database user full table privileges.
            </div>
            <div id="pool_database_rows">
                <div class="pool-database-row">
                    @foreach ([
                        ['database_name', 'Tenant database', 'text'],
                        ['username', 'Tenant DB username', 'text'],
                        ['password', 'Tenant DB password', 'password'],
                    ] as [$name, $label, $type])
                        <div class="form-group">
                            <label class="col-sm-2 control-label">{{ $label }}</label>
                            <div class="col-sm-10"><input type="{{ $type }}" name="pool_databases[0][{{ $name }}]" class="form-control" autocomplete="off"></div>
                        </div>
                    @endforeach
                    <div class="form-group">
                        <div class="col-sm-10 col-sm-offset-2"><button type="button" class="button remove-pool-row" style="display:none;">Remove database</button></div>
                    </div>
                </div>
            </div>
            <div class="form-group">
                <div class="col-sm-10 col-sm-offset-2"><button type="button" class="button" id="add_pool_database">Add database</button></div>
            </div>
            <small>Leave the username and password blank when the tenant database uses the same credentials as the central database.</small>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Email</label>
            <div class="col-sm-10">
                <input type="email" name="admin_email" class="form-control" required autocomplete="email">
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Password</label>
            <div class="col-sm-10">
                <input type="password" name="admin_password" class="form-control" minlength="12" required autocomplete="new-password">
            </div>
        </div>
        <div class="form-group">
            <label class="col-sm-2 control-label">Confirm password</label>
            <div class="col-sm-10">
                <input type="password" name="admin_password_confirmation" class="form-control" minlength="12" required autocomplete="new-password">
            </div>
        </div>
        <div class="modal-footer">
            <div class="buttons">
                <button class="button" onclick="checkEnv();return false">
                    Next Step
                </button>
            </div>
        </div>
    </form>
    <script>
        function checkEnv() {
            $.easyAjax({
                url: "{!! route('kiteledger.install.environment.save') !!}",
                type: "POST",
                data: $("#env-form").serialize(),
                container: "#env-form",
                messagePosition: "inline"
            });
        }
        function updateProvisioningFields() {
            var mode = $('#provisioning_mode').val();
            $('#cpanel_fields').toggle(mode === 'cpanel' || mode === 'cpanel_uapi');
            $('#pool_fields').toggle(mode === 'manual' || mode === 'pool');
        }
        function reindexPoolRows() {
            $('#pool_database_rows .pool-database-row').each(function (index) {
                $(this).find('input').each(function () {
                    var field = $(this).attr('name').match(/\]\[(.+)\]$/)[1];
                    $(this).attr('name', 'pool_databases[' + index + '][' + field + ']');
                });
            });
            $('.remove-pool-row').toggle($('#pool_database_rows .pool-database-row').length > 1);
        }
        document.addEventListener('DOMContentLoaded', function () {
            $('#provisioning_mode').on('change', updateProvisioningFields);
            $('#add_pool_database').on('click', function () {
                var row = $('#pool_database_rows .pool-database-row:first').clone();
                row.find('input').val('');
                $('#pool_database_rows').append(row);
                reindexPoolRows();
            });
            $('#pool_database_rows').on('click', '.remove-pool-row', function () {
                $(this).closest('.pool-database-row').remove();
                reindexPoolRows();
            });
            updateProvisioningFields();
            reindexPoolRows();
        });
    </script>
@stop
@section('scripts')
    <script src="{{ asset('installer/js/jQuery-2.2.0.min.js') }}"></script>
    <script src="{{ asset('installer/froiden-helper/helper.js')}}"></script>
    <script>
        $.ajaxSetup({
            headers: {
                'X-CSRF-TOKEN': $('meta[name="csrf-token"]').attr('content')
            }
        });
    </script>
@endsection
