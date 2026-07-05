<?php

use App\Providers\AppServiceProvider;
use App\Providers\MailConfigServiceProvider;
use App\Providers\TenancyServiceProvider;
use Froiden\LaravelInstaller\Providers\LaravelInstallerServiceProvider;

return [
    AppServiceProvider::class,
    MailConfigServiceProvider::class,
    TenancyServiceProvider::class,
    // Froiden installer: serves the intro screens at /install (welcome,
    // requirements, permissions). Its composer.json declares no provider, so
    // Laravel cannot auto-discover it — it must be listed here.
    LaravelInstallerServiceProvider::class,
];
