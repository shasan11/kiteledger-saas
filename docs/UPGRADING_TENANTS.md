# Upgrading tenant databases

Deploy application code and back up the central and tenant databases before migrating. Run central migrations first, then queue or run tenant migrations:

```bash
php artisan migrate --force
php artisan tenants:migrate --force
```

Seed tenant reference data only when the release notes require it:

```bash
php artisan tenants:seed --class=Database\\Seeders\\TenantDatabaseSeeder --force
```

For one tenant, use Stancl's `--tenants={tenant_id}` option. Check it before and after with `php artisan tenant:health {tenant}`. Failed tenant operations remain in central provisioning/operation logs and may be retried without rerunning successful provisioning steps.

Never run `database/migrations/tenant` through the central `migrate` command and never point `tenant_template` at the central database.
