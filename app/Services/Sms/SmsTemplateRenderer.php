<?php

namespace App\Services\Sms;

use App\Models\SmsTemplate;

class SmsTemplateRenderer
{
    public function render(string|SmsTemplate $template, array $data = []): string
    {
        $body = $template instanceof SmsTemplate ? $template->body : $template;

        return preg_replace_callback('/{{\s*([A-Za-z0-9_.-]+)\s*}}/', function ($matches) use ($data) {
            return (string) data_get($data, $matches[1], '');
        }, $body) ?? '';
    }
}
