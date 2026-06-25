@extends('vendor.installer.layouts.master')

@section('title', 'Installation Type')
@section('container')
    <form method="post" action="{{ route('kiteledger.install.type.store') }}">
        @csrf
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
                    <strong>Quick Demo Data</strong>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                        Small demo dataset. Safe for browser installation.
                    </div>
                </label>
            </li>
            <li class="list__item" style="display:block;padding:12px;">
                <label style="display:block;cursor:pointer;">
                    <input type="radio" name="install_type" value="full">
                    <strong>Full Demo Data</strong>
                    <div style="font-size:13px;color:#6b7280;margin-top:4px;">
                        Large dataset. Must be seeded by command line after installation.
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
