<?php

namespace App\Services\Sms\Providers;

use App\Models\SmsConfig;
use App\Services\Sms\SmsResult;

class SmsGlobalProvider extends CustomHttpSmsProvider
{
    protected function defaultProvider(): string
    {
        return 'sms_global';
    }

    protected function defaultEndpoint(SmsConfig $config): string
    {
        return $config->api_base_url ?: 'https://api.smsglobal.com/http-api.php';
    }
}
