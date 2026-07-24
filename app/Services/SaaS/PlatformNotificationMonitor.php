<?php

namespace App\Services\SaaS;

use App\Models\Central\BackupManifest;
use App\Models\Central\Domain;
use App\Models\Central\Subscription;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Models\Central\TenantInvoice;
use Carbon\Carbon;

class PlatformNotificationMonitor
{
    public function __construct(private CentralNotificationService $notifications, private PlatformSettingsService $settings) {}

    public function run(): void
    {
        TenantInvoice::whereNotIn('status', ['paid', 'void'])->whereDate('due_date', '<', today())->limit(250)->get()->each(fn (TenantInvoice $invoice) => $this->notifications->notifyOnce('invoice_overdue', 'billing', 'warning', 'Invoice overdue', $invoice->invoice_number.' is overdue with '.$invoice->currency.' '.number_format((float) ($invoice->balance ?: $invoice->total), 2).' outstanding.', route('central.invoices.index', ['search' => $invoice->invoice_number]), $invoice));

        Tenant::whereIn('status', ['active', 'trialing'])->whereBetween('trial_ends_at', [now(), now()->addDays(7)])->limit(250)->get()->each(fn (Tenant $tenant) => $this->notifications->notifyOnce('trial_expiring', 'subscriptions', 'warning', 'Trial expiring', $tenant->company_name.' trial ends '.$tenant->trial_ends_at->diffForHumans().'.', route('central.tenants.show', $tenant), $tenant));

        Subscription::whereIn('status', ['active', 'trialing'])->whereBetween('current_period_ends_at', [now(), now()->addDays(14)])->limit(250)->get()->each(fn (Subscription $subscription) => $this->notifications->notifyOnce('subscription_expiring', 'subscriptions', 'warning', 'Subscription expiring', 'Subscription #'.$subscription->id.' ends '.$subscription->current_period_ends_at->diffForHumans().'.', route('central.subscriptions.index', ['search' => $subscription->tenant_id]), $subscription));

        $available = TenantDatabasePool::where('status', 'available')->count();
        $threshold = (int) $this->settings->get('database_pool.low_capacity_threshold', 2);
        if ($available <= $threshold) {
            $this->notifications->notifyOnce('database_pool_low', 'infrastructure', 'critical', 'Database pool capacity is low', $available.' databases remain available; the configured threshold is '.$threshold.'.', route('central.tenant-databases.index'));
        }
        TenantDatabasePool::where(fn ($query) => $query->whereNotNull('last_error')->orWhere('status', 'failed'))->limit(100)->get()->each(fn (TenantDatabasePool $database) => $this->notifications->notifyOnce('database_unhealthy', 'infrastructure', 'critical', 'Tenant database unhealthy', $database->database_name.' requires revalidation.', route('central.tenant-databases.index', ['search' => $database->database_name]), $database));

        BackupManifest::where('status', 'failed')->where('updated_at', '>=', now()->subDays(2))->limit(100)->get()->each(fn (BackupManifest $backup) => $this->notifications->notifyOnce('backup_failed', 'infrastructure', 'critical', 'Backup failed', 'Backup '.$backup->id.' failed with code '.($backup->error_code ?: 'unknown').'.', route('central.backups.index'), $backup));

        Domain::whereNotNull('metadata')->limit(500)->get()->filter(function (Domain $domain): bool {
            $expires = data_get($domain->metadata, 'ssl_expires_at');
            if (blank($expires)) {
                return false;
            }
            try {
                return Carbon::parse($expires)->between(now(), now()->addDays((int) $this->settings->get('domains.ssl_expiry_warning_period', 30)));
            } catch (\Throwable) {
                return false;
            }
        })->each(fn (Domain $domain) => $this->notifications->notifyOnce('ssl_expiring', 'infrastructure', 'warning', 'SSL certificate expiring', $domain->domain.' certificate expires soon.', route('central.tenants.index', ['search' => $domain->domain]), $domain));
    }
}
