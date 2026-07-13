# cPanel production deployment

## Layout and upload

Place the Laravel application outside `public_html`, for example `/home/account/kiteledger`. Copy only the contents of `kiteledger/public` into `public_html`, then update `public_html/index.php` so its autoloader and bootstrap paths point to the application directory. If cPanel allows a domain document root to target `/home/account/kiteledger/public`, use that instead. Never expose `.env`, `vendor`, `storage`, backups, database dumps, or source code.

Use PHP 8.3 or newer with ctype, curl, DOM/XML, fileinfo, filter, intl, JSON, mbstring, OpenSSL, PDO MySQL, and tokenizer. Make `storage` and `bootstrap/cache` writable by the account user (normally `0755` or `0775`); never use `0777`.

## Domains, DNS, SSL, and proxies

Set the apex domain and optional `www` host in `CENTRAL_DOMAINS`, and set `SAAS_BASE_DOMAIN` to the apex host. Create an `A`/`AAAA` record for the apex and a wildcard record for `*.example.com`. In cPanel, point a wildcard subdomain or alias at the same public document root. Obtain a wildcard certificate when supported; AutoSSL installations that cannot issue wildcard certificates require DNS validation, Cloudflare origin certificates, or explicit subdomains.

Cloudflare must use Full (strict) TLS. Configure only known Cloudflare/cPanel proxy CIDRs as trusted proxies; never trust all forwarded headers. Custom domains require their own DNS verification and certificate support from the hosting provider.

## Databases

Run central migrations once. KiteLedger uses one central database plus one isolated database per tenant. Choose exactly one `TENANT_DATABASE_PROVISIONING_MODE`:

- `pool` (recommended for shared hosting): pre-create prefixed databases in cPanel, grant the application user privileges, and register each database under **Admin → Tenant Databases**.
- `cpanel_uapi`: set the HTTPS cPanel host, account, API token, and fully prefixed database user. The provider must permit MySQL UAPI operations.
- `automatic`: the configured MySQL account must have `CREATE DATABASE`; this is uncommon on shared hosting.

For pool mode:

1. Create the central database, for example `cpuser_kiteledger`.
2. Create tenant databases such as `cpuser_klt_001`, `cpuser_klt_002`, and `cpuser_klt_003`.
3. Grant the application MySQL user full privileges on the central database and every tenant database.
4. Set `TENANT_DATABASE_PROVISIONING_MODE=pool` and `TENANT_DB_PREFIX=cpuser_klt_`.
5. Add and validate each tenant database from the central admin panel before creating companies.

Identifiers must include the cPanel account prefix and remain at most 64 characters. The number of databases allowed by the hosting plan limits the number of active tenants. KiteLedger never falls back to shared-table tenancy.

## Environment and runtime

Copy `.env.example`, set a unique `APP_KEY`, use `APP_ENV=production`, `APP_DEBUG=false`, and an HTTPS `APP_URL`. Keep `SESSION_DOMAIN=null` so tenant cookies remain host-only. Use `QUEUE_CONNECTION=database`; database sessions, cache, locks, queues, and failed jobs use the explicit central connection. Configure SMTP before onboarding tenants.

If symlinks are allowed, run `php artisan storage:link`. Without symlinks, Laravel serves authorized files through application routes; private documents, PDFs, exports, and backups must never be copied into public storage.

## Cron

Replace the PHP and application paths with the values shown by cPanel:

```cron
* * * * * /usr/local/bin/php /home/account/kiteledger/artisan schedule:run >> /home/account/kiteledger/storage/logs/scheduler.log 2>&1
* * * * * /usr/local/bin/php /home/account/kiteledger/artisan queue:work --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 >> /home/account/kiteledger/storage/logs/queue.log 2>&1
```

Laravel overlap locks prevent duplicate scheduled work. `DB_QUEUE_RETRY_AFTER` must exceed the worker timeout. If queue cron is unavailable, set `TENANT_PROVISION_SYNC=true` only for controlled administrator provisioning; migrations may exceed web-request limits.

## Verification, updates, and rollback

Run `php artisan saas:health`, `php artisan migrate --force`, `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache`. Verify the central host, an active tenant subdomain, an unknown host, suspension, subscription expiry, mail, queue heartbeat, private uploads, and a test backup.

Before updating, back up the central database, every tenant database, `.env`, and tenant files. Deploy code, install production Composer dependencies, run additive migrations, build assets, refresh caches, and process the queue. Roll back code only when migrations are backward compatible; restore databases from verified backups when necessary.

For provisioning failures, check the selected provisioner, prefix/identifier limit, pool capacity or UAPI access, writable directories, queue heartbeat, and tenant migrations before retrying.
