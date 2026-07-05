# Tenant provisioning

Creating a tenant writes only central records synchronously. `ProvisionTenantJob` then records and executes these retryable steps:

1. Create the isolated database.
2. Run `database/migrations/tenant`.
3. Run the production-safe `DatabaseSeeder` inside that database.
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
* * * * * cd /path-to-project && php artisan queue:work --queue=provisioning,default --stop-when-empty >> /dev/null 2>&1
```

For a long-running worker manager, Supervisor/systemd is preferred over per-minute `--stop-when-empty` execution.
