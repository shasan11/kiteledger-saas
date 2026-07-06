# KiteLedger installation

## Requirements

- PHP 8.3+ with PDO, mbstring, OpenSSL, tokenizer, JSON, cURL, fileinfo, ctype,
  XML, and bcmath
- MySQL/MariaDB or PostgreSQL for production database-per-tenant provisioning
- Writable `storage/`, `bootstrap/cache/`, and project root

The marketplace package includes `vendor/` and `public/build/`; buyers do not
need Composer, Node.js, or npm.

Do not upload a GitHub source ZIP to a marketplace or customer server. Create
the marketplace ZIP with `./scripts/build-marketplace-package.sh`. It must
contain `vendor/`, `public/build/`, `.env.example`, installer assets, and the
prepared `database/sql/mysql_install.sql` release dump.

The first web request automatically creates `.env` from `.env.example` and
generates a unique `APP_KEY`. The application root must be writable by PHP for
that first request; `.env` is then created with a cPanel-compatible mode while
the included web-server rules block direct access to dotfiles.

Never upload `public/hot`. It is a local Vite development marker and would make
a hosted site attempt to load JavaScript from the visitor's localhost port 5173.

## Browser installer

Extract the package, point the document root to `public/`, configure wildcard
DNS plus `CENTRAL_DOMAINS`/`SAAS_BASE_DOMAIN`, and open `/install` on a central host.
On compatible Apache shared hosting, the root `.htaccess` forwards traffic.

Buyer flow:

1. Upload and extract the marketplace ZIP.
2. Point the domain document root to `public/` (or use the root `.htaccess` on compatible Apache hosting).
3. Make the project root, `storage/`, and `bootstrap/cache/` writable.
4. Open `/install`.
5. Enter database, administrator, central-domain, base-domain, and company-database settings.
6. Finish installation and add both cron jobs shown on the final page.
7. Log in to the admin panel and create the first company at `/admin/tenants`.

The wizard checks PHP requirements and writable folders, securely collects the
MySQL host/port/database credentials, central and tenant domains, and the first
platform administrator. It then creates the database when needed, migrates and
seeds the central platform, and disables `/install` after successful completion.

- **Fresh:** installs the central SaaS schema and central seed data.
- **Quick/Full Demo:** retained for installer compatibility. ERP demo records
  are now applied only to an explicitly created demo tenant.

The installer no longer creates one fixed company. Create tenants afterward at
`/admin/tenants`; provisioning creates and seeds each isolated ERP database.
Choose automatic provisioning when the MySQL user has `CREATE DATABASE`, cPanel
UAPI on shared hosting, or the advanced pre-created pool. Pool mode must contain
an available database before company creation. Single-database tenancy is not
supported and is not offered by the installer.
Pool-mode administrators can add and validate pre-created databases from
**Admin → Tenant Databases**; database usernames and passwords are encrypted and
never returned in the table or audit log.

## cPanel cron jobs

In cPanel, open **Advanced → Cron Jobs**, select **Once Per Minute** (`* * * * *`),
and add both commands using the folder that contains `artisan`:

```bash
cd /absolute/path/to/project && /usr/local/bin/php artisan schedule:run >> /dev/null 2>&1
cd /absolute/path/to/project && /usr/local/bin/php artisan queue:work --queue=provisioning,default --stop-when-empty >> /dev/null 2>&1
```

The project path is commonly `/home/USERNAME/kiteledger` or
`/home/USERNAME/public_html`. If `/usr/local/bin/php` fails, try `/usr/bin/php`
or `/opt/cpanel/ea-php83/root/usr/bin/php`, or ask the host for its PHP CLI path.
Without the queue cron, company provisioning can remain pending; without the
scheduler cron, billing, cleanup, subscription, invoice, and recurring jobs do
not run.

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
