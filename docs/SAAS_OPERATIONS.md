# SaaS operations and security

Tenant operational state and subscription billing state are independent. Billing expiry restricts access but never deletes tenant data. Permanent deletion requires a separate delayed request, password and typed confirmation, authorization, an immutable audit entry, and either a verified final backup or an explicit waiver.

Central infrastructure includes tenant-bound sessions, prefixed cache entries, locks, queues, lifecycle records, usage reservations, provisioning attempts, billing records, backup manifests, and deletion requests. ERP records remain exclusively in tenant databases. Tenant models fail closed when tenancy is not initialized in production.

Quota values use `null` for unlimited, `0` for disabled, and positive values as hard limits. Mutating requests reserve quota atomically, finalize successful work, release failed work, and expire abandoned reservations. Reconciliation corrects drift and produces usage snapshots.

Hosted gateways receive no raw card details. Webhooks are signature-checked before persistence, deduplicated by provider event ID, sanitized, queued centrally, and transactionally reconcile payment, invoice, and subscription state. Paid invoices are immutable; corrections use refunds or credit notes.

Backups must cover the central database, each tenant database, and tenant file roots. Retain an off-host encrypted copy and test restores regularly. Provider-level cPanel backups remain the safest fallback when `mysqldump` is unavailable.

## Updating

Back up the central database, every tenant database, tenant files, `.env`, and any uploaded package archives. Put the platform into maintenance when the update changes schema or tenant workflows. Deploy the code, run `composer install --no-dev --optimize-autoloader`, run `npm run build` when frontend assets changed, remove `public/hot`, run central migrations, then run tenant migrations with `php artisan tenants:migrate --force`. Clear and rebuild config, route, view, and event caches, then let the scheduler and central queue cron process jobs.

## Recovery checklist

Missing install lock: do not run the browser installer against a non-empty central database; restore the lock or use installer recovery. Failed tenant provisioning: review safe error codes in provisioning logs and retry only after fixing the cause. Pool exhaustion: register another empty validated database. cPanel API failure: verify token permissions, cPanel port, prefixed database user, and `CPANEL_DATABASE_PASSWORD`. Tenant migration failure: fix the tenant migration and rerun provisioning retry. Queue not running: verify the `central` queue cron, `jobs` table, and that `queue:work central --queue=provisioning,default` updates the queue heartbeat. Wildcard DNS or SSL failure: verify `*.example.com` DNS, cPanel wildcard routing, and wildcard certificate coverage. Restore tenant backups only after matching the central tenant record to the tenant database ownership marker.
