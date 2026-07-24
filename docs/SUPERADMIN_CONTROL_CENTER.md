# KiteLedger Control Center

The Control Center is the central application for KiteLedger's database-per-tenant SaaS architecture. Administrators, plans, subscriptions, invoices, payments, gateways, CMS content, media, platform settings, notifications, audit records, feature overrides, and support tickets always use the configured central database connection. Tenant accounting records remain in each tenant database.

## Fresh installation and seed behavior

`php artisan migrate:fresh --seed` builds the central schema and calls these idempotent seeders in dependency order: `CentralRolesAndPermissionsSeeder`, `CentralAdminSeeder`, `PlatformSettingsSeeder`, `PlansAndFeaturesSeeder`, `PaymentGatewaySeeder`, `DefaultDataTemplateSeeder`, `WebsiteSeeder`, `BlogSeeder`, `SupportSeeder`, and `NotificationTemplateSeeder`.

The browser installer runs the same `CentralDatabaseSeeder` before creating or updating the administrator supplied in the wizard. Seeders preserve existing setting values and gateway credentials. Demo tenant data is disabled unless `SAAS_SEED_DEMO_TENANT=true`.

```dotenv
CENTRAL_ADMIN_NAME="Platform Administrator"
CENTRAL_ADMIN_EMAIL=admin@example.com
CENTRAL_ADMIN_PASSWORD=
CENTRAL_ADMIN_PATH=superadmin
CENTRAL_DOMAINS=app.example.com
SAAS_BASE_DOMAIN=example.com
SAAS_BILLING_CURRENCY=USD
SAAS_SEED_DEMO_TENANT=false
```

Never commit administrator passwords, database credentials, provider secrets, storage keys, or webhook URLs. The interactive installer can create the first administrator without placing its password in a distributed environment file.

## Modules

- **Command Center** reports database-derived revenue, tenant lifecycle, attention items, provisioning status, platform health, and recent activity.
- **Customers** manages tenants, subscriptions, usage, domains, databases, and effective feature overrides.
- **Revenue** provides dedicated subscription, invoice, payment, manual-payment, gateway, and invoice-customization workflows.
- **Support** provides a central inbox, categories, saved replies, assignments, internal notes, private attachments, tenant conversations, and SLA deadlines.
- **Product** manages plans, the canonical feature registry, plan values, and default tenant-data templates.
- **Website** manages pages, homepage sections, menus, FAQs, testimonials, media, blog taxonomy/posts, branding, and SEO.
- **Administration** manages structured settings, notifications, administrators, roles, permissions, and masked audit history.

Global search covers tenants and owners, invoice numbers, payment references, support tickets, blog posts, pages, and settings. Notification counts use persistent central records.

## Roles and permissions

Installation creates Super Administrator, Platform Administrator, Billing Administrator, Support Manager, Support Agent, Content Manager, Operations Administrator, and Read-only Auditor roles. Route middleware protects central operations with granular permissions. Frontend navigation uses the same permission payload for visibility; backend authorization remains authoritative.

Sensitive operations such as secret settings, refunds, impersonation, and tenant deletion can require MFA or explicit confirmation according to Security settings. Grant the smallest necessary role.

## Platform settings and secrets

Settings use typed key-value storage plus UI metadata. Every seeded definition includes help text, server-side validation rules, environment scope, and options where relevant. Timezone, currency, country, locale, driver, format, and lifecycle selectors are populated with real choices; plan and default-data-template choices are loaded from active central records. Country choices use Symfony Intl when PHP's optional `intl` extension is available and an installer-safe common-country fallback otherwise. Values are cached individually and public values are cached as a set. Saves and resets invalidate affected keys and create settings revisions and audit entries.

Password, secret, token, credential, and webhook inputs are encrypted at rest. APIs and Inertia props return only `has_secret`; decrypted values never reach React. Leaving a secret blank retains it. Sensitive audit fields are replaced with `[REDACTED]`.

The UI includes section search, typed controls, save/reset, unsaved-change protection, connection tests, last-test timestamps, and history. Test email, storage, webhook, and gateway connectivity after production credentials are entered.

## Payment gateways and manual payments

Manual Payment is active after installation and supports bank transfer, cash, cheque, card terminal, and other methods. Stripe, PayPal, and Razorpay remain inactive sandbox configurations until valid credentials and webhooks have been verified.

A manual payment requires an invoice, positive amount, matching currency, date, method, unique reference, and UUID idempotency key. Optional proof is stored privately. A central transaction locks the invoice, rejects duplicate references and disallowed partial/overpayments, recomputes paid amount/balance, updates status, persists the payment, and creates a notification. The controller writes the audit record.

Gateway secrets are encrypted and masked. Webhook routes are rate limited; supported external drivers verify signatures and persist idempotent events. Do not enable a provider until its sandbox webhook and refund tests pass.

Refunds require the dedicated permission, a reason, the administrator's current password, a stable idempotency key, an eligible successful transaction, available refundable balance, and compliance with the configured refund window. When `security.require_mfa_for_refunds` is enabled, the administrator must have completed MFA for the current sign-in session. Partial and full refunds update the local transaction exactly once, create durable refund/notification records, and write an audit event.

## Invoice customization and history

Invoice customization has a dedicated settings section and live preview. New invoices use a locked sequence with configurable prefix, suffix, starting number, minimum digits, and optional annual reset. Billing tax, tax-inclusive pricing, due days, and default notes are calculated when the invoice is issued. New invoices snapshot seller, buyer, tax configuration, customization, plan/period line items, and currency. The PDF uses that snapshot with configured date/number/currency formats, local logo/signature/paid-stamp assets, visibility switches, repeated table headers, guarded row breaks, A4 print styling, totals, balance, notes, page numbers, and an optional self-contained QR code. The QR code uses `metadata.payment_url` when present; otherwise it encodes a non-secret invoice payment summary. Later setting changes do not rewrite historical invoices.

## CMS, media, blog, and SEO

Published content is read from the central CMS and cached; page and section changes invalidate cache. Draft, scheduled, archived, and private records are excluded from public queries.

The media library stores paths and metadata through Laravel disks, never base64 CMS data. Deletion is rejected while referenced. Configure `FILESYSTEM_DISK` and run `php artisan storage:link` for the public disk.

The blog uses TipTap, relational categories/tags, publishing states, featured media, reading time, autosave, focus mode, tables, links, code, alignment, and record SEO/social fields. Rich HTML is sanitized before persistence. Public routes provide `/blog`, post pages, category/tag archives, related posts, and pagination.

SEO output includes the global title template/separator, default description and social image, canonical and robots directives, Open Graph fields, X/Twitter card/username fields, search-engine verification tags, validated Google Analytics/Tag Manager IDs, JSON-LD, `/sitemap.xml`, and `/robots.txt`. Global defaults live in SEO Settings; record values override them. Public pages, archives, featured/recent/related posts, and sitemap queries all exclude private, draft, and future-scheduled records.

## Support tickets

Tenant users access `/support-center`. Every query and download verifies the initialized tenant ID. Users can create tickets, upload validated private files, view their organization's conversation, reply, and reopen within the configured period. Internal notes are filtered from tenant responses.

Agents can filter, assign, change category/priority/status, use saved replies, attach files, reply, add private notes, resolve, close, and reopen. Categories and saved replies have dedicated management screens; categories can provide a default priority and assignee, and reply HTML is sanitized on write. Allowed attachment types and maximum sizes come from Support Settings and remain restricted to a safe server whitelist. Ticket numbers are generated in a central transaction. First-response and resolution deadlines are set at creation.

Run the scheduler every minute so the five-minute SLA task can mark breaches and notify administrators:

```cron
* * * * * cd /path/to/kiteledger && php artisan schedule:run >> /dev/null 2>&1
```

## Queues and notifications

Production should run a central/provisioning queue worker:

```bash
php artisan queue:work central --queue=provisioning,default --tries=3 --timeout=1800
```

Database notifications are the durable baseline. Email and optional Slack delivery are controlled by Email and Notifications settings. Keep failure retention, retries, scheduler health, and recipients configured. Installation/tests use the synchronous queue fallback.

## Production security checklist

- Use HTTPS, a dedicated central host, secure cookies, and trusted proxies.
- Use distinct central and tenant database users with least privilege.
- Require MFA for privileged users and sensitive actions.
- Rotate installer credentials before external access.
- Use private storage for tickets and payment proof.
- Validate queue/scheduler heartbeats and backup restoration.
- Configure mail, webhooks, rate limits, and alerts.
- Review gateways before enabling them.
- Remove unused administrators and review role assignments.
- Retain audit records according to policy and keep secrets out of logs.
- Run tests, the production build, and fresh installation on a disposable database before deployment.

## Verification

```bash
php artisan test tests/Feature/SaaS/SuperadminControlCenterTest.php
php artisan test tests/Feature/SaaS/SuperadminRequirementsTest.php
php artisan test
npm run build
php artisan migrate:fresh --seed --force
php artisan route:cache
php artisan config:cache
```

Run destructive migration verification only against a disposable database. Installer diagnostics should show a healthy central connection, writable storage, scheduler heartbeat, and queue activity.

## Dependency security

Run both `composer audit --locked` and `npm audit` during every release. The verified July 24, 2026 lockfile has no Composer advisories. npm still reports one high-severity advisory against the direct `xlsx` 0.18.5 dependency (prototype pollution and regular-expression denial of service); npm publishes no fixed version, so `npm audit fix` cannot resolve it. Until the spreadsheet workflows are migrated to a supported replacement, restrict spreadsheet imports to authenticated users, enforce file-size limits, and treat uploaded workbooks as untrusted input.
