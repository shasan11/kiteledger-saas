@extends('vendor.installer.layouts.master')

@section('title', 'Permissions')
@section('style')
    <style>
        .permission-check {
            display: block;
            margin-bottom: 10px;
            padding: 13px 14px;
            border: 1px solid #b7e4c7;
            border-left: 5px solid #2e7d32;
            border-radius: 4px;
            background: #f0fff4;
            color: #1b5e20;
        }
        .permission-check--error {
            border-color: #ef9a9a;
            border-left-color: #c62828;
            background: #ffebee;
            color: #b71c1c;
        }
        .permission-check__header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }
        .permission-check__status {
            flex: 0 0 auto;
            padding: 3px 8px;
            border-radius: 999px;
            background: #2e7d32;
            color: #fff;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
        }
        .permission-check--error .permission-check__status {
            background: #c62828;
        }
        .permission-check__detail {
            margin-top: 6px;
            font-size: 12px;
            line-height: 1.45;
            overflow-wrap: anywhere;
        }
        .permissions-alert {
            margin-bottom: 14px;
            padding: 12px 14px;
            border: 1px solid #ef9a9a;
            border-radius: 4px;
            background: #ffebee;
            color: #b71c1c;
            font-weight: 700;
        }
    </style>
@endsection
@section('container')
    @php($hasErrors = collect($checks)->contains(fn ($check) => ! $check['ok']))
    @if ($hasErrors)
        <div class="permissions-alert">Permission check failed. Fix every red item below, then click Check Permission Again.</div>
    @endif
    <ul class="list">
        @foreach($checks as $check)
            <li class="permission-check {{ $check['ok'] ? '' : 'permission-check--error' }}">
                <div class="permission-check__header">
                    <strong>{{ $check['label'] }}</strong>
                    <span class="permission-check__status">{{ $check['ok'] ? 'Passed' : 'Error' }}</span>
                </div>
                <div class="permission-check__detail">{{ $check['detail'] }}</div>
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
