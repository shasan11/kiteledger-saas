<?php

namespace Database\Seeders;

use App\Models\Central\NotificationTemplate;
use Illuminate\Database\Seeder;

class NotificationTemplateSeeder extends Seeder
{
    public function run(): void
    {
        foreach (['provisioning_completed', 'provisioning_failed', 'payment_failed', 'manual_payment_recorded', 'refund_completed', 'refund_failed', 'invoice_overdue', 'trial_expiring', 'subscription_expiring', 'subscription_cancelled', 'tenant_suspended', 'database_pool_low', 'database_unhealthy', 'backup_failed', 'ssl_expiring', 'support_ticket_created', 'ticket_escalated', 'ticket_sla_breached', 'deletion_approval_pending'] as $key) {
            NotificationTemplate::firstOrCreate(['key' => $key], [
                'name' => str($key)->replace('_', ' ')->title(), 'subject' => '{{ title }}',
                'body' => '<p>{{ message }}</p>', 'channels' => ['database', 'mail'],
                'variables' => ['title', 'message', 'action_url'], 'is_active' => true,
            ]);
        }
    }
}
