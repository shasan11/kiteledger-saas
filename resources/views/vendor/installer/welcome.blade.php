@extends('vendor.installer.layouts.master')

@section('title', 'Welcome To The Installer')
@section('container')
    <p class="paragraph" style="text-align: center;">Welcome to the setup wizard.</p>
    <div class="buttons">
        <a href="{{ route('LaravelInstaller::environment') }}" class="button">Next Step</a>
    </div>
@stop
