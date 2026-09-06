@extends('vendor.installer.layouts.master')

@section('title', 'Installation')
@section('container')
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
