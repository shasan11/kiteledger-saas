@extends('vendor.installer.layouts.master')

@section('title', 'Permissions')
@section('container')
    @php($hasErrors = collect($checks)->contains(fn ($check) => ! $check['ok']))
    @if ($hasErrors)
        <div class="alert alert-danger">Please fix the errors below, then click Check Permission Again.</div>
    @endif
    <ul class="list">
        @foreach($checks as $check)
        <li class="list__item list__item--permissions {{ $check['ok'] ? 'success' : 'error' }}" style="display:block;">
            <strong>{{ $check['label'] }}</strong>
            <div style="font-size:12px;margin-top:4px;word-break:break-word;">{{ $check['detail'] }}</div>
        </li>
        @endforeach
    </ul>


    <div class="buttons">
        @if (! $hasErrors)
            <a class="button" href="{{ route('kiteledger.install.type') }}">
                Next Step
            </a>
        @else
            <a class="button" href="javascript:window.location.href='';">
                Check Permission Again
            </a>
        @endif
    </div>

@stop
