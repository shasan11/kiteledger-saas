<?php

use App\Providers\AppServiceProvider;
use App\Providers\MailConfigServiceProvider;
use App\Providers\TenancyServiceProvider;

return [
    AppServiceProvider::class,
    MailConfigServiceProvider::class,
    TenancyServiceProvider::class,
];
