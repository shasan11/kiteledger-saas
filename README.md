# KiteLedger

KiteLedger is a database-per-tenant Laravel/Inertia SaaS platform. The central
application owns plans, subscriptions, billing, website content and tenant
provisioning; each company gets an isolated database containing the existing
ERP and its branches.

## Packaged installation

A marketplace ZIP contains `vendor/`, `public/build/`, and preferably
`database/sql/mysql_install.sql`. Customers do not need Composer or Node.js.

Do not distribute or upload the GitHub source ZIP. Build the buyer package with
`./scripts/build-marketplace-package.sh`; release builds should use
`STRICT_MARKETPLACE_BUILD=1`.

1. Extract the ZIP and point the web root to `public/`.
2. Make `storage/`, `bootstrap/cache/`, and the project root writable.
3. Make the project root, `storage/`, and `bootstrap/cache/` writable.
4. Open `/install` and enter database, admin, domain, and company-database details.
5. Finish setup and copy both cron commands from the final screen.
6. Log in to `/admin/login` and create the first company at `/admin/tenants`.

The previous demo choices are retained for installer compatibility, but ERP
sample data is now selected as a tenant default-data template during tenant
provisioning.

```bash
php artisan kiteledger:seed-demo --profile=full --force
```

See [INSTALL.md](INSTALL.md) for deployment details and [PACKAGING.md](PACKAGING.md)
for release builds.

SaaS operations are documented in [docs/SAAS_ARCHITECTURE.md](docs/SAAS_ARCHITECTURE.md),
[docs/TENANCY_SETUP.md](docs/TENANCY_SETUP.md), and
[docs/TENANT_PROVISIONING.md](docs/TENANT_PROVISIONING.md).

## Developer setup

```bash
composer install
npm ci
cp .env.example .env
php artisan key:generate
npm run build
```

Then open `/install` or run `php artisan kiteledger:install`. Use
`php artisan kiteledger:doctor` to check a deployment.

## AI knowledge indexes

KiteLedger's AI Assistant uses exact, keyword, metadata, and optional embedding
ranking. The exact and keyword paths work on normal MySQL/MariaDB hosting without
an external vector database.

```bash
php artisan ai:index-app
php artisan ai:index-business
php artisan ai:index-all
php artisan ai:index-status
```

Use `--no-embeddings` with the indexing commands when provider embeddings are
not configured. Re-run indexing after adding routes/help documentation or after
material business-data changes; it is idempotent and skips unchanged chunks.
