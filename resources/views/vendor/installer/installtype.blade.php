@extends('vendor.installer.layouts.master')

@section('title', 'Installation Type')
@section('container')
    <form method="post" action="{{ route('kiteledger.install.type.store') }}">
        @csrf
        @if ($errors->any())
            <div class="alert alert-danger" style="margin-bottom:14px;">
                {{ $errors->first() }}
            </div>
        @endif
        <p class="paragraph" style="text-align:center;">Choose how to set up your data.</p>

        <ul class="list" style="text-align:left;">
            <li class="list__item" style="display:block;padding:12px;">
                <label style="display:block;cursor:pointer;">
                    <input type="radio" name="install_type" value="fresh" checked>
                    <strong>Fresh Installation</strong>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                        Recommended for real company setup. No sample transactions.
                    </div>
                </label>
            </li>
            <li class="list__item" style="display:block;padding:12px;">
                <label style="display:block;cursor:pointer;">
                    <input type="radio" name="install_type" value="quick">
                        <strong>Quick Setup</strong>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                        Installs the platform now; demo data can be added to a tenant later.
                    </div>
                </label>
            </li>
            <li class="list__item" style="display:block;padding:12px;">
                <label style="display:block;cursor:pointer;">
                    <input type="radio" name="install_type" value="full">
                        <strong>Full Demo Preparation</strong>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                        Installs the platform. Seed a selected demo tenant by command line afterward.
                        <br>
                        <code>php artisan kiteledger:seed-demo --profile=full --force</code>
                    </div>
                </label>
            </li>
        </ul>

        <div class="buttons">
            <button type="submit" class="button">Next Step</button>
        </div>
    </form>
@stop
