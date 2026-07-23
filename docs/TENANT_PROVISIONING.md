# Tenant provisioning

Froiden installs only the central database and creates the first superadmin. Tenant databases are created manually by the superadmin in cPanel or another hosting control panel, then connected from `/superadmin/tenants/create`.

## Create a tenant

1. Create an empty database in the hosting control panel.
2. Create or select a database user and grant it all privileges on that database.
3. Open `/superadmin/tenants/create`.
4. Enter the tenant details and the database host, port, name, username, and password.
5. Submit the form. KiteLedger verifies the credentials and create/alter/drop-table privileges with a temporary probe table.

The application never creates or deletes the tenant database. It stores the database password encrypted.

After the connection succeeds, `ProvisionTenantJob` performs these retryable steps:

1. Verify the supplied empty database and credentials.
2. Run `database/migrations/tenant`.
3. Run the production-safe `TenantDatabaseSeeder`.
4. Apply the selected central default-data template.
5. Create or update the owner, assign full access, and configure the head-office branch.
6. Start the selected trial or subscription and activate the tenant.

Every step writes to `tenant_provisioning_logs`. A failure marks the company as `provisioning_failed`; retry it from the superadmin tenant screen or run:

```bash
php artisan tenants:provision TENANT_UUID
```

Useful operational commands:

```bash
php artisan tenants:migrate
php artisan tenants:migrate-one TENANT_UUID
php artisan tenants:seed --tenants=TENANT_UUID
php artisan tenants:calculate-usage
php artisan tenants:check-subscriptions
php artisan billing:generate-invoices
```

Run the scheduler and central queue worker in production:

```cron
* * * * * cd /path-to-project && php artisan schedule:run >> /dev/null 2>&1
* * * * * cd /path-to-project && php artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 >> /dev/null 2>&1
```

For continuous processing, Supervisor or systemd is preferred over a per-minute `--stop-when-empty` worker.

Legacy `pool`, `automatic`, and `cpanel_uapi` records remain readable for upgrade compatibility, but the installer and new superadmin tenant workflow use manual database creation only.
