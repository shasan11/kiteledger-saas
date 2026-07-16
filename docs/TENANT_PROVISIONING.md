# Tenant provisioning

Creating a tenant writes only central records synchronously. `ProvisionTenantJob` then records and executes these retryable steps:

1. Create the isolated database.
2. Run `database/migrations/tenant`.
3. Run the production-safe `TenantDatabaseSeeder` inside that database.
4. Apply the selected central default-data template.
5. Create/update the owner, assign an owner/full-access role, and configure the head-office branch.
6. Start the selected trial/subscription and mark the tenant active or trialing.

The owner password is encrypted in the tenant's provisioning metadata and removed after success. Every step writes `tenant_provisioning_logs`. A failure marks the company `provisioning_failed`; use the Retry button or:

```bash
php artisan tenants:provision TENANT_UUID
```

Useful commands:

```bash
php artisan tenants:migrate
php artisan tenants:migrate-one TENANT_UUID
php artisan tenants:seed --tenants=TENANT_UUID
php artisan tenants:calculate-usage
php artisan tenants:check-subscriptions
php artisan billing:generate-invoices
```

Run workers and scheduler in production:

```cron
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
* * * * * cd /path-to-project && php artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 >> /dev/null 2>&1
```

The scheduler writes a scheduler heartbeat directly and enqueues a queue heartbeat job on the central `default` queue. `php artisan saas:health` reports both so operators can tell whether cron reached Laravel and whether the central queue worker processed jobs.

For a long-running worker manager, Supervisor/systemd is preferred over per-minute `--stop-when-empty` execution.

## Provisioning modes

`pool` is the shared-host default. The administrator creates empty tenant databases in cPanel, grants privileges, and registers them in the central pool. Allocation uses a central transaction and row lock so concurrent provisioning cannot receive the same database.

`cpanel_uapi` creates databases through cPanel, grants the configured database user privileges, confirms PDO connectivity, stores the effective credentials, and cleans up failed probe databases where possible.

`automatic` uses direct MySQL create/drop only when the account passes an actual temporary database probe. It is not enabled by grant text alone.

Each tenant stores the provisioning mode, database name, optional encrypted credentials, ownership identifier, and provisioned timestamp. Retry, backup, health, deletion, and release use the tenant's stored mode rather than the current global setting.

Before a database is deleted or recycled, KiteLedger verifies `kiteledger_tenant_identity` inside the tenant database. A missing or mismatched marker blocks destructive cleanup.
