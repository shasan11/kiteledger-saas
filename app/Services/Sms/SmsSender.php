<?php

namespace App\Services\Sms;

use App\Models\SmsConfig;
use App\Models\SmsLog;
use App\Models\SmsTemplate;
use App\Services\Sms\Providers\CustomHttpSmsProvider;
use App\Services\Sms\Providers\SmsGlobalProvider;
use App\Services\Sms\Providers\SparrowSmsProvider;
use App\Services\Sms\Providers\TwilioSmsProvider;
use App\Services\Sms\Providers\VonageSmsProvider;

class SmsSender
{
    public function __construct(
        private readonly SmsConfigResolver $resolver,
        private readonly SmsPhoneNormalizer $normalizer,
        private readonly SmsTemplateRenderer $renderer,
    ) {}

    public function send(string $phone, string $message, array $options = []): SmsResult
    {
        $config = $options['config'] ?? null;
        if (!$config instanceof SmsConfig) {
            $config = $this->resolver->activeDefault($options['provider'] ?? null, $options['sms_config_id'] ?? null);
        }

        if (!$config) {
            return $this->failedBeforeProvider($phone, $message, $options, $this->resolver->missingProviderMessage());
        }

        return $this->sendWithConfig($config, $phone, $message, $options);
    }

    public function sendBulk(array $recipients, string $message, array $options = []): array
    {
        $results = [];
        foreach ($recipients as $recipient) {
            $phone = is_array($recipient) ? (string) ($recipient['phone'] ?? '') : (string) $recipient;
            $recipientOptions = is_array($recipient) ? array_merge($options, $recipient) : $options;
            $results[] = $this->send($phone, $message, $recipientOptions);
        }

        return $results;
    }

    public function sendUsingTemplate(string $templateCode, array $data, string $phone, array $options = []): SmsResult
    {
        $template = SmsTemplate::query()
            ->where('code', $templateCode)
            ->where(function ($query) {
                $query->where('is_active', true)->orWhere('active', true);
            })
            ->first();

        if (!$template) {
            return $this->failedBeforeProvider($phone, '', $options, "SMS template [{$templateCode}] is not configured.");
        }

        $options['sms_template_id'] = $template->id;

        return $this->send($phone, $this->renderer->render($template, $data), $options);
    }

    public function test(SmsConfig $config, string $phone, string $message): SmsResult
    {
        return $this->sendWithConfig($config, $phone, $message, [
            'config' => $config,
            'module' => 'sms_config_test',
        ]);
    }

    public function retry(SmsLog $log): SmsResult
    {
        return $this->send($log->phone, $log->message, [
            'sms_config_id' => $log->sms_config_id,
            'sms_template_id' => $log->sms_template_id,
            'campaign_id' => $log->campaign_id,
            'campaign_sms_message_id' => $log->campaign_sms_message_id,
            'campaign_sms_recipient_id' => $log->campaign_sms_recipient_id,
            'module' => $log->module,
            'module_id' => $log->module_id,
            'recipient_name' => $log->recipient_name,
            'retry_of' => $log->id,
        ]);
    }

    public function segmentCount(string $message): int
    {
        $length = mb_strlen($message);

        return max(1, (int) ceil(max($length, 1) / 160));
    }

    private function sendWithConfig(SmsConfig $config, string $phone, string $message, array $options = []): SmsResult
    {
        $message = trim($message);
        $normalized = $this->normalizer->normalize($phone, $config->default_country_code ?: $config->country_code);
        $length = mb_strlen($message);

        $log = SmsLog::query()->create([
            'sms_config_id' => $config->id,
            'sms_template_id' => $options['sms_template_id'] ?? null,
            'campaign_id' => $options['campaign_id'] ?? null,
            'campaign_sms_message_id' => $options['campaign_sms_message_id'] ?? null,
            'campaign_sms_recipient_id' => $options['campaign_sms_recipient_id'] ?? null,
            'module' => $options['module'] ?? null,
            'module_id' => $options['module_id'] ?? null,
            'recipient_name' => $options['recipient_name'] ?? null,
            'phone' => $phone,
            'normalized_phone' => $normalized,
            'sender_id' => $options['sender_id'] ?? $config->sender_id,
            'provider' => $config->provider,
            'message' => $message,
            'message_length' => $length,
            'segment_count' => $this->segmentCount($message),
            'status' => 'queued',
            'queued_at' => now(),
            'created_by' => auth()->id(),
        ]);

        if ($message === '') {
            return $this->markFailed($log, SmsResult::fail($config->provider, 'SMS message is required.'));
        }

        if (!$this->normalizer->isValid($normalized)) {
            return $this->markFailed($log, SmsResult::fail($config->provider, 'A valid phone number is required.'));
        }

        if (!$config->is_active && !$config->active) {
            return $this->markFailed($log, SmsResult::fail($config->provider, 'Inactive SMS provider cannot send messages.'));
        }

        $result = $this->providerFor($config)->send($config, $normalized, $message);

        $log->update([
            'status' => $result->success ? 'sent' : 'failed',
            'provider_message_id' => $result->providerMessageId,
            'provider_response' => is_array($result->providerResponse) ? $result->providerResponse : ['response' => $result->providerResponse],
            'error_code' => $result->errorCode,
            'error_message' => $result->error,
            'sent_at' => $result->success ? now() : null,
            'failed_at' => $result->success ? null : now(),
        ]);

        return new SmsResult(
            $result->success,
            $result->providerMessageId,
            $result->error,
            $result->provider,
            $result->providerResponse,
            $result->errorCode,
            $result->statusCode,
            $log->id
        );
    }

    private function failedBeforeProvider(string $phone, string $message, array $options, string $error): SmsResult
    {
        SmsLog::query()->create([
            'sms_template_id' => $options['sms_template_id'] ?? null,
            'campaign_id' => $options['campaign_id'] ?? null,
            'campaign_sms_message_id' => $options['campaign_sms_message_id'] ?? null,
            'campaign_sms_recipient_id' => $options['campaign_sms_recipient_id'] ?? null,
            'module' => $options['module'] ?? null,
            'module_id' => $options['module_id'] ?? null,
            'recipient_name' => $options['recipient_name'] ?? null,
            'phone' => $phone,
            'message' => $message,
            'message_length' => mb_strlen($message),
            'segment_count' => $this->segmentCount($message),
            'status' => 'failed',
            'error_message' => $error,
            'failed_at' => now(),
            'created_by' => auth()->id(),
        ]);

        return SmsResult::fail('none', $error);
    }

    private function markFailed(SmsLog $log, SmsResult $result): SmsResult
    {
        $log->update([
            'status' => 'failed',
            'error_code' => $result->errorCode,
            'error_message' => $result->error,
            'failed_at' => now(),
        ]);

        return $result;
    }

    private function providerFor(SmsConfig $config): object
    {
        return match ($config->provider) {
            SmsConfig::PROVIDER_TWILIO => app(TwilioSmsProvider::class),
            SmsConfig::PROVIDER_SPARROW => app(SparrowSmsProvider::class),
            SmsConfig::PROVIDER_SMS_GLOBAL => app(SmsGlobalProvider::class),
            SmsConfig::PROVIDER_VONAGE, SmsConfig::PROVIDER_MESSAGE_BIRD => app(VonageSmsProvider::class),
            SmsConfig::PROVIDER_INFOBIP => app(InfobipDriver::class),
            default => app(CustomHttpSmsProvider::class),
        };
    }
}
