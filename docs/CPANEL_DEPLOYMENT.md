# cPanel production deployment

## Layout and upload

Place the Laravel application outside `public_html`, for example `/home/account/kiteledger`. Copy only the contents of `kiteledger/public` into `public_html`, then update `public_html/index.php` so its autoloader and bootstrap paths point to the application directory. If cPanel allows a domain document root to target `/home/account/kiteledger/public`, use that instead. Never expose `.env`, `vendor`, `storage`, backups, database dumps, or source code.

Use PHP 8.3 or newer with ctype, curl, DOM/XML, fileinfo, filter, intl, JSON, mbstring, OpenSSL, PDO MySQL, and tokenizer. Make `storage` and `bootstrap/cache` writable by the account user (normally `0755` or `0775`); never use `0777`.

## Domains, DNS, SSL, and proxies

Set the apex domain and optional `www` host in `CENTRAL_DOMAINS`, and set `SAAS_BASE_DOMAIN` to the apex host. Create an `A`/`AAAA` record for the apex and a wildcard record for `*.example.com`. In cPanel, point a wildcard subdomain or alias at the same public document root. Obtain a wildcard certificate when supported; AutoSSL installations that cannot issue wildcard certificates require DNS validation, Cloudflare origin certificates, or explicit subdomains.

Cloudflare must use Full (strict) TLS. Configure only known Cloudflare/cPanel proxy CIDRs as trusted proxies; never trust all forwarded headers. Custom domains require their own DNS verification and certificate support from the hosting provider.

## Databases

Run central migrations once. Choose exactly one `TENANT_DATABASE_PROVISIONING_MODE`:

- `pool` (recommended): pre-create prefixed databases in cPanel, grant the application user privileges, and register each database in the central pool.
- `cpanel_uapi`: set the HTTPS cPanel host, account, API token, database user, and `CPANEL_DATABASE_PASSWORD` when that user differs from `DB_USERNAME`. The provider must permit MySQL UAPI create, privilege, and delete operations.
- `automatic`: the configured MySQL account must pass a real temporary create/drop database probe; this is uncommon on shared hosting.

Identifiers must include the cPanel account prefix and remain at most 64 characters. KiteLedger never falls back to shared-table tenancy.

## Pool-mode installation

1. Create the central database and database user in cPanel.
2. Grant the application user privileges on the central database.
3. Create one or more empty tenant databases.
4. Grant the same application user or database-specific users full table privileges on each tenant database.
5. Open `/install`, enter central settings, and keep pool mode selected.
6. Register the first empty tenant database in the installer. Password fields are never redisplayed.
7. Complete installation, then add more pool databases from the central admin tenant-databases screen.
8. Configure wildcard DNS and SSL before creating production tenants.

Pool rows are allocated atomically, stored with encrypted credentials, and recycled only after the tenant ownership marker inside the database matches the tenant being deleted.

## cPanel UAPI setup

Create an API token that can manage MySQL databases for the cPanel account. Enter the HTTPS cPanel host, port `2083`, cPanel username, API token, database user, and database-user password when different from the central database password. The installer tests the full create, grant, connect, and cleanup workflow with a temporary probe database.

## Environment and runtime

Copy `.env.example`, set a unique `APP_KEY`, use `APP_ENV=production`, `APP_DEBUG=false`, and an HTTPS `APP_URL`. Keep `SESSION_DOMAIN=null` so tenant cookies remain host-only. Database sessions, cache, locks, queues, and failed jobs use the explicit central connection. Configure SMTP before onboarding tenants.

If symlinks are allowed, run `php artisan storage:link`. Without symlinks, Laravel serves authorized files through application routes; private documents, PDFs, exports, and backups must never be copied into public storage.

## Cron

Replace the PHP and application paths with the values shown by cPanel:

```cron
* * * * * /usr/local/bin/php /home/account/kiteledger/artisan schedule:run >> /home/account/kiteledger/storage/logs/scheduler.log 2>&1
* * * * * /usr/local/bin/php /home/account/kiteledger/artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300 >> /home/account/kiteledger/storage/logs/queue.log 2>&1
```

Laravel overlap locks prevent duplicate scheduled work. `DB_QUEUE_RETRY_AFTER` must exceed the worker timeout. If queue cron is unavailable, set `TENANT_PROVISION_SYNC=true` only for controlled administrator provisioning; migrations may exceed web-request limits.

## Verification, updates, and rollback

Run `php artisan saas:health`, `php artisan migrate --force`, `php artisan tenants:migrate --force`, `php artisan config:cache`, `php artisan route:cache`, and `php artisan view:cache`. Verify the central host, an active tenant subdomain, an unknown host, suspension, subscription expiry, mail, queue heartbeat, private uploads, and a test backup. The queue heartbeat turns healthy only after the scheduler enqueues the heartbeat job and the `queue:work central --queue=provisioning,default` cron processes the `default` queue.

Before updating, back up the central database, every tenant database, `.env`, and tenant files. Deploy code, install production Composer dependencies, run additive migrations, build assets, refresh caches, and process the queue. Roll back code only when migrations are backward compatible; restore databases from verified backups when necessary.

For provisioning failures, check the selected provisioner, prefix/identifier limit, pool capacity or UAPI access, writable directories, queue heartbeat, and tenant migrations before retrying. If the install lock is missing but migrations exist, do not rerun browser installation against that database; restore the lock, use recovery, or point the installer at an empty central database. For pool exhaustion, add another empty validated tenant database. For wildcard DNS or SSL failures, verify both the DNS wildcard and cPanel wildcard virtual host point to the application public directory.
