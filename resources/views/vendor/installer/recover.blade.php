@extends('vendor.installer.layouts.master')

@section('title', 'Installation Recovery')
@section('container')
    <div class="alert alert-danger" style="text-align:left;">
        <strong>The application looks partially installed.</strong>
        <p>A lock file exists, but the environment, encryption key, database settings, or marketplace runtime files are invalid.</p>
    </div>

    <ul class="list" style="text-align:left;">
        @forelse ($problems as $problem)
            <li class="list__item error" style="display:block;">{{ $problem }}</li>
        @empty
            <li class="list__item error" style="display:block;">The installation state could not be validated.</li>
        @endforelse
    </ul>

    @if ($hasStaleConfigCache)
        <div class="alert alert-warning" style="text-align:left;">
            Laravel config cache may contain old database/app key values. Delete <code>bootstrap/cache/config.php</code> or run <code>php artisan optimize:clear</code>.
        </div>
    @endif

    @if ($resetAllowed)
        <form method="post" action="{{ route('kiteledger.install.recover.reset') }}">
            @csrf
            <p class="paragraph">Resetting removes installer lock/status files only. It does not delete database data.</p>
            <div class="buttons"><button type="submit" class="button">Reset installer lock and continue installation</button></div>
        </form>
    @endif
@stop
