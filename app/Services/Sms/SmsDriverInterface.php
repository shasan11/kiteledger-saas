<?php

namespace App\Services\Sms;

use App\Models\SmsConfig;

interface SmsDriverInterface
{
    public function send(SmsConfig $config, string $to, string $message): SmsResult;
}
