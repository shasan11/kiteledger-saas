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
                <input type="text" name="database" class="form-control" value="{{ env('DB_DATABASE', 'kiteledger') }}" required>
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
