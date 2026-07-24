<?php

namespace App\Jobs\SaaS;

use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Mail;

class DeliverCentralNotificationJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public array $payload)
    {
        $this->onConnection('central')->onQueue('default')->afterCommit();
    }

    public function handle(PlatformSettingsService $settings): void
    {
        if ($settings->get('email.email_enabled', false)) {
            $settings->applyMailConfiguration();
            $recipients = array_values(array_filter((array) $settings->get('notifications.administrator_notification_emails', [])));
            foreach ($recipients as $recipient) {
                Mail::html('<p>'.e($this->payload['message']).'</p>'.(filled($this->payload['action_url'] ?? null) ? '<p><a href="'.e($this->payload['action_url']).'">View details</a></p>' : ''), fn ($mail) => $mail->to($recipient)->subject($this->payload['title']));
            }
        }

        $webhook = $settings->get('notifications.slack_webhook_url');
        if (filled($webhook)) {
            Http::timeout(10)->retry(2, 250)->post($webhook, ['text' => '*'.$this->payload['title'].'*'."\n".$this->payload['message'].(filled($this->payload['action_url'] ?? null) ? "\n".$this->payload['action_url'] : '')])->throw();
        }
    }
}
