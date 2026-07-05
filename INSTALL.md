# KiteLedger installation

## Requirements

- PHP 8.3+ with PDO, mbstring, OpenSSL, tokenizer, JSON, cURL, fileinfo, ctype,
  XML, and bcmath
- MySQL/MariaDB or PostgreSQL for production database-per-tenant provisioning
- Writable `storage/`, `bootstrap/cache/`, and project root

The marketplace package includes `vendor/` and `public/build/`; buyers do not
need Composer, Node.js, or npm.

Never upload `public/hot`. It is a local Vite development marker and would make
a hosted site attempt to load JavaScript from the visitor's localhost port 5173.

## Browser installer

Extract the package, point the document root to `public/`, configure wildcard
DNS plus `CENTRAL_DOMAINS`/`SAAS_BASE_DOMAIN`, and open `/install` on a central host.
On compatible Apache shared hosting, the root `.htaccess` forwards traffic.

The wizard checks PHP requirements and writable folders, securely collects the
MySQL host/port/database credentials, central and tenant domains, and the first
platform administrator. It then creates the database when needed, migrates and
seeds the central platform, and disables `/install` after successful completion.

- **Fresh:** installs the central SaaS schema and central seed data.
- **Quick/Full Demo:** retained for installer compatibility. ERP demo records
  are now applied only to an explicitly created demo tenant.

The installer no longer creates one fixed company. Create tenants afterward at
`/admin/tenants`; provisioning creates and seeds each isolated ERP database.

## CLI installer

```bash
php artisan kiteledger:install
```

Non-interactive example:

```bash
php artisan kiteledger:install --no-interaction --force \
  --db-host=127.0.0.1 --db-port=3306 --db-database=kiteledger \
  --db-username=kiteledger --db-password='secret' \
  --app-url=https://ledger.example.com \
  --admin-name='Site Admin' --admin-email=admin@example.com \
  --admin-password='strong-password' --install-type=fresh
```

`--force` permits destructive reinstallation into a database that already has
migration tables. After installation, run `php artisan storage:link` and
`php artisan kiteledger:doctor`.

Start the queue and scheduler after installation:

```bash
php artisan queue:work --queue=provisioning,default
php artisan schedule:work
```

See `docs/TENANCY_SETUP.md` and `docs/TENANT_PROVISIONING.md` for database
privileges, wildcard TLS, cPanel/Nginx configuration, and operational commands.
