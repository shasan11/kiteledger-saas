<?php

namespace Database\Seeders;

use App\Models\Central\PlatformSetting;
use DateTimeZone;
use Illuminate\Database\Seeder;
use Illuminate\Support\Str;
use Symfony\Component\Intl\Countries;

class PlatformSettingsSeeder extends Seeder
{
    public function run(): void
    {
        foreach ($this->groups() as $group => $labels) {
            foreach (array_values($labels) as $order => $definition) {
                [$label, $input, $default, $encrypted, $required] = array_pad(is_array($definition) ? $definition : [$definition], 5, null);
                $key = $group.'.'.Str::of($label)->lower()->replace(['/', ' & ', '-', ' '], ['_', '_', '_', '_'])->replaceMatches('/[^a-z0-9_.]/', '')->trim('_');
                $setting = PlatformSetting::firstOrNew(['key' => $key]);
                $setting->fill([
                    'group' => $group, 'label' => $label, 'description' => $this->description($label),
                    'input_type' => $input ?: $this->inputType($label), 'type' => $this->storageType($input ?: $this->inputType($label)),
                    'help_text' => $this->helpText($label, (bool) $encrypted),
                    'options' => $this->optionsFor($group, $label, $input ?: $this->inputType($label)),
                    'validation_rules' => $this->validationRules($input ?: $this->inputType($label), (bool) $required),
                    'is_encrypted' => (bool) $encrypted, 'is_public' => in_array($group, ['general', 'branding', 'company', 'support', 'privacy', 'seo'], true) && ! $encrypted,
                    'is_required' => (bool) $required, 'requires_confirmation' => (bool) $encrypted || in_array($label, ['Maintenance mode', 'Require MFA for all admins', 'Require MFA for superadmins'], true),
                    'sort_order' => $order, 'environment' => 'all',
                ]);
                if (! $setting->exists) {
                    $setting->default_value = is_array($default) ? json_encode($default) : (string) ($default ?? $this->defaultValue($label));
                    $setting->value = $default ?? $this->defaultValue($label);
                }
                $setting->save();
            }
        }

        $this->alias('platform.name', 'general', 'Platform name', 'KiteLedger SaaS');
        $this->alias('billing.currency', 'billing', 'Default currency', env('SAAS_BILLING_CURRENCY', 'USD'));
        $this->alias('tenant.allow_public_signup', 'tenant_registration', 'Allow public signup', false, 'boolean', 'switch');
    }

    private function alias(string $key, string $group, string $label, mixed $value, string $type = 'string', string $input = 'text'): void
    {
        $setting = PlatformSetting::firstOrNew(['key' => $key]);
        $setting->fill(['group' => $group, 'label' => $label, 'input_type' => $input, 'type' => $type, 'sort_order' => 0]);
        if (! $setting->exists) {
            $setting->default_value = is_bool($value) ? ($value ? '1' : '0') : $value;
            $setting->value = $value;
        }
        $setting->save();
    }

    private function groups(): array
    {
        return [
            'general' => [['Platform name', 'text', 'KiteLedger SaaS'], 'Legal platform name', 'Tagline', 'Description', ['Default locale', 'select', 'en'], ['Supported locales', 'multiselect', ['en']], ['Default timezone', 'timezone', 'UTC'], ['Date format', 'select', 'Y-m-d'], ['Time format', 'select', 'H:i'], ['Default currency', 'currency', env('SAAS_BILLING_CURRENCY', 'USD')], ['Currency position', 'select', 'before'], ['Environment label', 'text', env('APP_ENV', 'production')], ['Maintenance mode', 'switch', false], 'Maintenance message'],
            'branding' => [['Light logo', 'image'], ['Dark logo', 'image'], ['Icon logo', 'image'], ['Favicon', 'image'], ['Primary color', 'color', '#0f766e'], ['Secondary color', 'color', '#0f172a'], ['Email logo', 'image'], ['Invoice logo', 'image'], ['Login background', 'image'], 'Footer text'],
            'company' => ['Legal company name', 'Registration number', 'Tax number', ['Email', 'email'], 'Phone', ['Website', 'url'], 'Address line 1', 'Address line 2', 'City', 'State', 'Postal code', ['Country', 'country'], 'Authorized signatory'],
            'tenant_registration' => [['Allow public signup', 'switch', false], ['Require email verification', 'switch', true], ['Require administrator approval', 'switch', false], ['Default plan', 'select'], ['Default trial days', 'number', 14], ['Default country', 'country'], ['Default currency', 'currency', env('SAAS_BILLING_CURRENCY', 'USD')], ['Default timezone', 'timezone', 'UTC'], ['Default data template', 'select'], ['Allow custom domains', 'switch', false], ['Allow subdomain selection', 'switch', true], ['Minimum subdomain length', 'number', 3], ['Reserved subdomains', 'multiselect', config('saas.reserved_subdomains', [])], ['Owner invitation expiration', 'number', 72], ['Automatically activate after provisioning', 'switch', true], ['Suspend on expiration', 'switch', true], ['Delete expired tenants after configured days', 'number', 0]],
            'provisioning' => [['Provisioning mode', 'select', config('saas.database.mode', 'manual')], ['Database strategy', 'select', 'database_per_tenant'], ['Database prefix', 'text', config('saas.database.prefix', 'tenant_')], ['Run migrations', 'switch', true], ['Run seeders', 'switch', true], ['Send owner invitation', 'switch', true], ['Create default domain', 'switch', true], ['Maximum attempts', 'number', 3], ['Retry delay', 'number', 300], ['Timeout', 'number', 1800], ['Clean up failed databases', 'switch', true], ['Notify administrators on failure', 'switch', true], ['Notification email addresses', 'multiselect', []]],
            'database_pool' => [['Enable pool', 'switch', false], ['Minimum available databases', 'number', 2], ['Low-capacity threshold', 'number', 2], ['Automatic allocation', 'switch', true], ['Automatic revalidation', 'switch', true], ['Revalidation interval', 'number', 60], ['Health-check timeout', 'number', 10], ['Low-capacity notifications', 'switch', true], ['Notification emails', 'multiselect', []], ['Allow manual database creation', 'switch', true]],
            'billing' => [['Billing enabled', 'switch', true], ['Default currency', 'currency', env('SAAS_BILLING_CURRENCY', 'USD')], ['Supported currencies', 'multiselect', [env('SAAS_BILLING_CURRENCY', 'USD')]], ['Default billing cycle', 'select', 'monthly'], ['Grace period', 'number', config('saas.grace_period_days', 3)], ['Invoice due days', 'number', 14], ['Invoice prefix', 'text', 'INV-'], ['Invoice starting number', 'number', 1], ['Tax enabled', 'switch', false], 'Tax name', ['Tax rate', 'decimal', 0], ['Prices include tax', 'switch', false], ['Manual payments enabled', 'switch', true], ['Partial payments enabled', 'switch', true], ['Overpayments enabled', 'switch', false], ['Automatically generate invoices', 'switch', true], ['Automatically send invoices', 'switch', true], ['Automatic charging', 'switch', false], ['Retry failed payments', 'switch', true], ['Payment retry schedule', 'multiselect', [1, 3, 7]], ['Suspend after failed attempts', 'number', 3], ['Suspend after overdue days', 'number', 14], ['Cancel after overdue days', 'number', 60], ['Proration', 'switch', true], ['Credit notes', 'switch', true], ['Refunds', 'switch', true], ['Maximum refund period', 'number', 90], ['Default invoice notes', 'textarea'], ['Invoice footer', 'rich-text editor']],
            'trials' => [['Trials enabled', 'switch', true], ['Default trial days', 'number', 14], ['Require payment method', 'switch', false], ['Trial extension allowed', 'switch', true], ['Maximum extension', 'number', 14], ['Reminder schedule', 'multiselect', [7, 3, 1]], ['Automatic conversion', 'switch', false], ['Suspend on trial expiration', 'switch', true], ['Expiry email', 'switch', true], ['One trial per email', 'switch', true], ['One trial per company', 'switch', true]],
            'subscriptions' => [['Allow upgrades', 'switch', true], ['Allow downgrades', 'switch', true], ['Allow pause', 'switch', false], ['Allow self-cancellation', 'switch', true], ['Cancel at period end', 'switch', true], ['Reactivate before period end', 'switch', true], ['Prorate upgrades', 'switch', true], ['Prorate downgrades', 'switch', false], ['Renewal reminders', 'multiselect', [14, 7, 1]], ['Expiry reminders', 'multiselect', [14, 7, 1]]],
            'email' => [['Email enabled', 'switch', true], 'Sender name', ['Sender address', 'email'], ['Reply-to address', 'email'], ['Driver', 'select', 'smtp'], 'Host', ['Port', 'number', 587], 'Username', ['Password', 'secret', null, true], ['Encryption', 'select', 'tls'], ['Timeout', 'number', 30], ['Queue enabled', 'switch', true], ['Administrator alert address', 'email'], ['Email footer', 'rich-text editor'], ['Email logo', 'image']],
            'notifications' => [['Administrator notification emails', 'multiselect', []], ['Provisioning-failure notification', 'switch', true], ['Payment-failure notification', 'switch', true], ['Overdue-invoice notification', 'switch', true], ['Low database-pool notification', 'switch', true], ['Unhealthy database notification', 'switch', true], ['Backup-failure notification', 'switch', true], ['Expiring SSL notification', 'switch', true], ['Expiring trial notification', 'switch', true], ['Expiring subscription notification', 'switch', true], ['Tenant suspension notification', 'switch', true], ['Deletion request notification', 'switch', true], ['Gateway-failure notification', 'switch', true], ['Usage-limit notification', 'switch', true], ['Usage warning percentage', 'number', 80], ['Slack webhook URL', 'secret', null, true]],
            'security' => [['Require MFA for superadmins', 'switch', true], ['Require MFA for all admins', 'switch', false], ['Session lifetime', 'number', 120], ['Inactivity timeout', 'number', 30], ['Maximum login attempts', 'number', 5], ['Lockout duration', 'number', 15], ['Password minimum length', 'number', 12], ['Require uppercase', 'switch', true], ['Require lowercase', 'switch', true], ['Require numbers', 'switch', true], ['Require symbols', 'switch', true], ['Password expiration', 'number', 0], ['Password history', 'number', 5], ['Remember-me support', 'switch', false], ['Allowed administrator IPs', 'multiselect', []], ['Blocked administrator IPs', 'multiselect', []], ['Require MFA for impersonation', 'switch', true], ['Require impersonation reason', 'switch', true], ['Impersonation session duration', 'number', 30], ['Require MFA for refunds', 'switch', true], ['Require MFA for tenant deletion', 'switch', true], ['Audit-retention period', 'number', 365]],
            'domains' => [['Base domain', 'text', config('saas.base_domain')], ['Default scheme', 'select', 'https'], ['Custom domains enabled', 'switch', false], ['Domain verification required', 'switch', true], ['Automatic SSL', 'switch', true], ['SSL provider', 'select'], ['SSL-expiry warning period', 'number', 30], ['DNS verification interval', 'number', 15], ['Maximum custom domains', 'number', 3], ['Reserved subdomains', 'multiselect', config('saas.reserved_subdomains', [])], ['Force HTTPS', 'switch', true]],
            'backups' => [['Backups enabled', 'switch', true], ['Backup schedule', 'text', '0 2 * * *'], ['Retention days', 'number', config('saas.backup_retention_days', 30)], ['Include central database', 'switch', true], ['Include tenant databases', 'switch', true], ['Include uploaded files', 'switch', true], ['Compression', 'select', 'gzip'], ['Encryption', 'switch', true], ['Storage driver', 'select', 'local'], 'Bucket', 'Region', ['Access key', 'secret', null, true], ['Secret key', 'secret', null, true], ['Success notification', 'switch', false], ['Failure notification', 'switch', true], ['Maximum parallel jobs', 'number', 2]],
            'storage' => [['Storage driver', 'select', 'public'], ['Maximum upload size', 'number', 10240], ['Allowed file types', 'multiselect', ['jpg', 'jpeg', 'png', 'webp', 'pdf', 'doc', 'docx']], ['Image limit', 'number', 5120], ['Document limit', 'number', 10240], ['Virus scanning', 'switch', false], ['Private files', 'switch', true], ['Temporary URL expiry', 'number', 15], ['Temporary-file cleanup', 'number', 24]],
            'usage' => [['Usage tracking', 'switch', true], ['Collection interval', 'number', 60], ['Warning percentage', 'number', 80], ['Hard limits', 'switch', true], ['Temporary overage', 'switch', false], ['Overage grace period', 'number', 3], ['Storage tracking', 'switch', true], ['AI request tracking', 'switch', true], ['API request tracking', 'switch', true], ['Retention period', 'number', 365], ['Notify tenant', 'switch', true], ['Notify administrator', 'switch', true]],
            'queue_scheduler' => [['Queue enabled', 'switch', true], ['Queue connection', 'select', 'database'], ['Default queue', 'text', 'default'], ['Failed-job retention', 'number', 30], ['Retry attempts', 'number', 3], ['Retry delay', 'number', 60], ['Long-job timeout', 'number', 1800], ['Failure notifications', 'switch', true], ['Scheduler enabled', 'switch', true], ['Scheduler health interval', 'number', 5], ['Scheduler stale threshold', 'number', 15]],
            'monitoring' => [['Monitoring enabled', 'switch', true], ['Error tracking', 'switch', false], ['Error-tracking DSN', 'secret', null, true], ['Performance tracking', 'switch', true], ['Slow-request threshold', 'number', 2000], ['Health checks', 'switch', true], ['Health-check interval', 'number', 5], ['Log retention', 'number', 30], ['Sensitive-data masking', 'switch', true], ['Status page URL', 'url']],
            'api' => [['API enabled', 'switch', false], ['Default rate limit', 'number', 60], ['Maximum rate limit', 'number', 1000], ['Token expiry', 'number', 1440], ['Personal access tokens', 'switch', true], ['Tenant webhooks', 'switch', true], ['Webhook retry attempts', 'number', 3], ['Webhook timeout', 'number', 15], ['Webhook signatures', 'switch', true], ['Allowed origins', 'multiselect', []], ['Documentation URL', 'url'], ['API version', 'text', 'v1']],
            'support' => [['Support enabled', 'switch', true], ['Support email', 'email'], 'Support phone', ['Support portal URL', 'url'], ['Documentation URL', 'url'], ['Status page URL', 'url'], ['Default priority', 'select', 'normal'], ['Business hours', 'key-value editor', []], ['Timezone', 'timezone', 'UTC'], ['Attachments allowed', 'switch', true], ['Maximum attachment size', 'number', 10240], ['Allowed attachment types', 'multiselect', ['jpg', 'jpeg', 'png', 'pdf', 'txt', 'doc', 'docx']], ['Automatically close resolved tickets', 'switch', true], ['Ticket reopen period', 'number', 14], ['First-response SLA', 'number', 8], ['Resolution SLA', 'number', 72], ['Ticket prefix', 'text', 'TKT-']],
            'privacy' => [['Privacy policy URL', 'url', '/privacy-policy'], ['Terms URL', 'url', '/terms-of-service'], ['Cookie policy URL', 'url', '/cookie-policy'], ['Data processing agreement URL', 'url'], ['Require terms acceptance', 'switch', true], ['Terms version', 'text', '1.0'], ['Cookie consent', 'switch', true], ['Analytics consent', 'switch', true], ['Tenant deletion grace period', 'number', config('saas.deletion_wait_days', 14)], ['Deleted-tenant retention', 'number', 30], ['Audit retention', 'number', 365], ['Export expiration', 'number', 24], ['Anonymize deleted users', 'switch', true]],
            'analytics' => [['Analytics enabled', 'switch', false], ['Provider', 'select'], 'Tracking ID', ['Admin tracking', 'switch', false], ['Tenant tracking', 'switch', false], ['IP anonymization', 'switch', true], ['Product events', 'switch', true], ['Retention', 'number', 90], ['Session recording', 'switch', false]],
            'seo' => ['Default site title', 'Title separator', 'Default title template', 'Default meta description', ['Canonical base URL', 'url', env('APP_URL')], ['Default robots index', 'switch', true], ['Default robots follow', 'switch', true], ['Default Open Graph image', 'image'], ['Default X/Twitter card', 'select', 'summary_large_image'], 'X/Twitter username', ['Facebook page', 'url'], 'Organization name', ['Organization logo', 'image'], 'Organization type', 'Contact type', 'Contact phone', ['Social profile URLs', 'multiselect', []], ['Search-engine verification codes', 'key-value editor', []], 'Google Analytics ID', 'Google Tag Manager ID', ['Robots.txt editor', 'code editor', "User-agent: *\nAllow: /"], ['Sitemap enabled', 'switch', true], ['Include pages', 'switch', true], ['Include posts', 'switch', true], ['Include categories', 'switch', true], ['Include tags', 'switch', true], ['Sitemap cache duration', 'number', 60], ['Breadcrumbs', 'switch', true], ['Organization schema', 'code editor'], ['Website schema', 'code editor'], ['Article schema defaults', 'code editor']],
            'invoice_customization' => [['Invoice logo', 'image'], ['Accent color', 'color', '#0f766e'], ['Safe font selection', 'select', 'DejaVu Sans'], 'Company legal name', 'Company address', ['Email', 'email'], 'Phone', 'Tax number', 'Registration number', ['Prefix', 'text', 'INV-'], 'Suffix', ['Starting number', 'number', 1], ['Minimum digits', 'number', 6], ['Annual reset', 'switch', false], ['Invoice title', 'text', 'Invoice'], ['Payment terms', 'textarea'], ['Notes', 'textarea'], ['Footer', 'rich-text editor'], ['Bank details', 'textarea'], ['Payment instructions', 'textarea'], 'Authorized signatory', ['Signature', 'image'], ['Paid stamp', 'image'], ['QR code', 'switch', true], ['Show plan', 'switch', true], ['Show subscription period', 'switch', true], ['Show tax', 'switch', true], ['Show discount', 'switch', true], ['Show payment history', 'switch', true], ['Show balance', 'switch', true], ['Show billing address', 'switch', true], ['Show tenant tax number', 'switch', true], ['Show metadata', 'switch', false], ['Language', 'select', 'en'], ['Date format', 'select', 'Y-m-d'], ['Number format', 'select', '1,234.56'], ['Currency format', 'select', 'code'], ['Tax label', 'text', 'Tax'], ['Due-date label', 'text', 'Due date']],
        ];
    }

    private function inputType(string $label): string
    {
        if (str_contains(strtolower($label), 'email')) {
            return 'email';
        }
        if (str_contains(strtolower($label), 'url')) {
            return 'url';
        }
        if (str_contains(strtolower($label), 'password') || str_contains(strtolower($label), 'secret') || str_contains(strtolower($label), 'token')) {
            return 'secret';
        }

        return 'text';
    }

    private function storageType(string $input): string
    {
        return match ($input) {
            'switch' => 'boolean', 'number' => 'integer', 'decimal' => 'decimal', 'multiselect', 'key-value editor' => 'json', default => 'string'
        };
    }

    private function defaultValue(string $label): mixed
    {
        return str_starts_with($label, 'Enable ') || str_starts_with($label, 'Allow ') ? false : '';
    }

    private function description(string $label): string
    {
        return 'Controls '.Str::lower($label).' across the KiteLedger platform.';
    }

    private function helpText(string $label, bool $encrypted): ?string
    {
        if ($encrypted) {
            return 'Stored encrypted; leave blank to keep the current secret.';
        }
        if (str_contains(Str::lower($label), 'retention')) {
            return 'Retention period in days unless the field states otherwise.';
        }

        return null;
    }

    private function validationRules(string $input, bool $required): string
    {
        $rules = [$required ? 'required' : 'nullable'];
        $rules[] = match ($input) {
            'email' => 'email', 'url' => 'url', 'number' => 'integer', 'decimal' => 'numeric',
            'switch' => 'boolean', 'multiselect', 'key-value editor' => 'array', 'color' => 'regex:/^#[0-9a-fA-F]{6}$/',
            default => 'string',
        };

        return implode('|', $rules);
    }

    private function optionsFor(string $group, string $label, string $input): ?array
    {
        if ($input === 'timezone') {
            return DateTimeZone::listIdentifiers();
        }
        if ($input === 'country') {
            $countries = extension_loaded('intl')
                ? Countries::getNames('en')
                : [
                    'NP' => 'Nepal', 'IN' => 'India', 'US' => 'United States', 'GB' => 'United Kingdom',
                    'AE' => 'United Arab Emirates', 'AU' => 'Australia', 'BR' => 'Brazil', 'CA' => 'Canada',
                    'CN' => 'China', 'DE' => 'Germany', 'ES' => 'Spain', 'FR' => 'France', 'ID' => 'Indonesia',
                    'IT' => 'Italy', 'JP' => 'Japan', 'KR' => 'South Korea', 'MX' => 'Mexico', 'MY' => 'Malaysia',
                    'NL' => 'Netherlands', 'NZ' => 'New Zealand', 'PH' => 'Philippines', 'PT' => 'Portugal',
                    'SA' => 'Saudi Arabia', 'SG' => 'Singapore', 'TH' => 'Thailand', 'ZA' => 'South Africa',
                ];

            return collect($countries)->map(fn ($name, $code) => ['value' => $code, 'label' => $name])->values()->all();
        }
        if ($input === 'currency') {
            return ['USD', 'EUR', 'GBP', 'NPR', 'INR', 'AED', 'AUD', 'CAD', 'JPY', 'CHF'];
        }

        return match ($group.'.'.$label) {
            'general.Default locale' => ['en', 'de', 'es', 'fr', 'pt', 'ne'],
            'general.Supported locales' => ['en', 'de', 'es', 'fr', 'pt', 'ne'],
            'general.Date format', 'invoice_customization.Date format' => ['Y-m-d', 'd/m/Y', 'm/d/Y', 'M j, Y'],
            'general.Time format' => ['H:i', 'h:i A'], 'general.Currency position' => ['before', 'after'],
            'provisioning.Provisioning mode' => ['manual', 'cpanel', 'pool'], 'provisioning.Database strategy' => ['database_per_tenant'],
            'billing.Default billing cycle' => ['monthly', 'yearly'],
            'email.Driver' => ['smtp', 'sendmail', 'ses', 'mailgun', 'postmark', 'log'], 'email.Encryption' => ['tls', 'ssl', 'none'],
            'domains.Default scheme' => ['https', 'http'], 'domains.SSL provider' => ['letsencrypt', 'custom'],
            'backups.Compression' => ['gzip', 'zip', 'none'], 'backups.Storage driver' => ['local', 's3'],
            'storage.Storage driver' => ['public', 'local', 's3'], 'queue_scheduler.Queue connection' => ['database', 'redis', 'sync'],
            'analytics.Provider' => ['none', 'google', 'plausible', 'matomo'],
            'seo.Default X/Twitter card' => ['summary', 'summary_large_image'],
            'invoice_customization.Safe font selection' => ['DejaVu Sans', 'Helvetica', 'Times New Roman'],
            'invoice_customization.Language' => ['en', 'de', 'es', 'fr', 'pt', 'ne'],
            'invoice_customization.Number format' => ['1,234.56', '1.234,56', '1 234,56'],
            'invoice_customization.Currency format' => ['code', 'symbol'],
            'support.Default priority' => ['low', 'normal', 'high', 'urgent'],
            default => null,
        };
    }
}
