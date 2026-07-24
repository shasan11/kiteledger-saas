<?php

namespace App\Services\SaaS;

use App\Jobs\SaaS\DeliverCentralNotificationJob;
use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralNotification;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class CentralNotificationService
{
    public function notifyOnce(string $type, string $category, string $severity, string $title, string $message, ?string $url = null, ?Model $related = null, array $data = [], int $hours = 24): void
    {
        $query = CentralNotification::where('type', $type)->where('created_at', '>=', now()->subHours($hours));
        if ($related) {
            $query->where('related_type', $related->getMorphClass())->where('related_id', $related->getKey());
        }
        if ($query->exists()) {
            return;
        }
        $this->notify($type, $category, $severity, $title, $message, $url, $related, $data);
    }

    public function notify(string $type, string $category, string $severity, string $title, string $message, ?string $url = null, ?Model $related = null, array $data = [], ?array $adminIds = null): void
    {
        $ids = $adminIds ?? CentralAdmin::where('is_active', true)->pluck('id')->all();
        foreach ($ids as $adminId) {
            CentralNotification::create([
                'id' => (string) Str::uuid(), 'admin_id' => $adminId, 'type' => $type, 'category' => $category,
                'severity' => $severity, 'title' => $title, 'message' => $message, 'action_url' => $url,
                'action_label' => $url ? 'View details' : null, 'related_type' => $related?->getMorphClass(),
                'related_id' => $related?->getKey(), 'data' => $data,
            ]);
        }

        $payload = compact('title', 'message') + ['action_url' => $url, 'severity' => $severity, 'category' => $category];
        try {
            $settings = app(PlatformSettingsService::class);
            if ($settings->get('email.email_enabled', false) || filled($settings->get('notifications.slack_webhook_url'))) {
                $job = new DeliverCentralNotificationJob($payload);
                if (app()->environment('testing') || ! $settings->get('queue_scheduler.queue_enabled', true)) {
                    dispatch_sync($job);
                } else {
                    dispatch($job);
                }
            }
        } catch (\Throwable $exception) {
            report($exception);
        }
    }
}
