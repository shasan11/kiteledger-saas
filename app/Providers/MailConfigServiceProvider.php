<?php

namespace App\Providers;

use App\Models\EmailConfig;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\ServiceProvider;

/**
 * Overrides Laravel's mail configuration at runtime with values from the
 * email_configs table, so admins can manage SMTP credentials from the UI
 * without redeploying or editing .env.
 *
 * Falls back silently to config/mail.php (env) if:
 *   - the email_configs table does not exist yet (fresh install, migration
 *     not run), or
 *   - no active row is found,
 *   - any other resolution error occurs.
 *
 * Runs in boot() — by the time the mail manager resolves a transport, the
 * config values it reads will already be overridden.
 */
class MailConfigServiceProvider extends ServiceProvider
{
    public function boot(): void
    {
        try {
            $config = $this->resolveActiveConfig();
            if (!$config) {
                return;
            }

            $this->applyConfig($config);

            // If the mail manager already instantiated a mailer earlier in
            // this request (rare during boot, but defensive), forget the
            // cached instance so the next Mail::* call rebuilds with the
            // new credentials.
            Mail::forgetMailers();
        } catch (\Throwable) {
            // Never let mail-config resolution break the boot pipeline —
            // worst case we fall back to env-driven config.
        }
    }

    private function resolveActiveConfig(): ?EmailConfig
    {
        // Guard against running before migrations have created the table.
        if (!Schema::hasTable('email_configs')) {
            return null;
        }

        return EmailConfig::query()
            ->where('active', true)
            ->orderByDesc('id')
            ->first();
    }

    private function applyConfig(EmailConfig $config): void
    {
        $mailer = strtolower((string) ($config->mailer ?: 'smtp'));

        // We only override the connection details for the mailer the DB
        // row points at, plus the default mailer + from address. Other
        // mailers configured in config/mail.php (log, ses, etc.) stay
        // untouched so developers can still switch to them via env if
        // needed.
        Config::set('mail.default', $mailer);

        if ($config->from_address) {
            Config::set('mail.from.address', $config->from_address);
        }
        if ($config->from_name) {
            Config::set('mail.from.name', $config->from_name);
        }

        // For SMTP-style mailers, push host/port/auth into the matching
        // mailer config block. Unknown mailers (sendmail, ses, etc.) get
        // the default + from override only.
        if (in_array($mailer, ['smtp', 'mailgun', 'postmark', 'resend'], true)) {
            $base = "mail.mailers.{$mailer}";

            if ($config->email_host) {
                Config::set("{$base}.host", $config->email_host);
            }
            if ($config->email_port) {
                Config::set("{$base}.port", (int) $config->email_port);
            }
            if ($config->email_user) {
                Config::set("{$base}.username", $config->email_user);
            }
            // email_pass is stored on the model. We do not log/echo it.
            if ($config->email_pass) {
                Config::set("{$base}.password", $config->email_pass);
            }
            if ($config->encryption) {
                // Laravel 11 prefers 'scheme' over the older 'encryption'
                // key, but accepts either. Set both for compatibility with
                // any custom transports that still read encryption.
                Config::set("{$base}.scheme", $config->encryption);
                Config::set("{$base}.encryption", $config->encryption);
            }
        }
    }
}
