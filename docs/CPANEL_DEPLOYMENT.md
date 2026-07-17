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

## Manual end-to-end verification

Run this checklist before accepting a shared-host installation:

1. Upload the production package after `composer install --no-dev --optimize-autoloader` and `npm run build`.
2. Confirm `public/hot` is absent, `vendor` and `public/build` are present, and `.env.example` contains no secrets.
3. Create one empty central database and two empty tenant databases in cPanel.
4. Grant the application database user full table privileges on the central database and both tenant databases.
5. Open `/install`, enter the central settings, choose pool mode, and register both empty tenant databases.
6. Complete installation and confirm the final page shows the selected provisioning mode, central DB status, queue command, wildcard DNS/SSL reminders, and no passwords or API tokens.
7. Configure wildcard DNS and SSL, then run `php artisan saas:health`.
8. Configure both cron entries from this document and wait for scheduler and queue heartbeats to become healthy.
9. Log in to the central admin, create Tenant A, and confirm it receives the first pool database and reaches active status.
10. Open Tenant A on `tenant-a.example.com`, add a small record such as a contact or product, and note its ID.
11. Create Tenant B, confirm it receives the second pool database, reaches active status, and opens on `tenant-b.example.com`.
12. Confirm Tenant B does not contain Tenant A's record, and that the same record IDs can exist independently in each tenant database.
13. Confirm the central database contains platform tables only and no tenant ERP rows such as tenant contacts, products, invoices, journal vouchers, or users.
14. Retry provisioning for an already active tenant only from the documented retry action and confirm no duplicate owner, branch, role, subscription, or seed data is created.
15. Attempt a third tenant while the pool is empty and confirm a safe `pool_exhausted` failure is shown.
16. Add a third empty database from central admin, revalidate it, retry the failed tenant, and confirm it provisions successfully.
17. Request and approve a test deletion only after a verified backup or explicit waiver. Confirm the database ownership marker is checked before the database is recycled.

## cPanel UAPI manual test

Use this mode only when the host allows UAPI database management:

1. Create a cPanel API token with MySQL database create, list, privilege, and delete capability.
2. Set `CPANEL_HOST`, `CPANEL_PORT=2083`, `CPANEL_USERNAME`, `CPANEL_API_TOKEN`, `CPANEL_DATABASE_USER`, and `CPANEL_DATABASE_PASSWORD` when the database user password differs from `DB_PASSWORD`.
3. In `/install`, select cPanel UAPI mode and save the environment form.
4. Confirm the installer creates a temporary probe database, grants privileges, connects through PDO, and deletes the probe database.
5. Create a tenant and confirm cPanel shows the tenant database with the cPanel account prefix exactly once.
6. Confirm the tenant row stores the effective database name, mode `cpanel_uapi`, cPanel host, encrypted username/password, ownership identifier, and `provisioned_at`.
7. Force a safe failure in a staging account by using an invalid token. Confirm administrators see `cpanel_authentication_failed`, not the raw provider error or token.
8. Delete the staging tenant only after verifying the `kiteledger_tenant_identity` marker matches the tenant. An existing unowned database must not be deleted.

## Automatic-mode manual test

Automatic mode is uncommon on shared hosting. Enable it only after this probe succeeds in staging:

1. Configure `TENANT_DATABASE_PROVISIONING_MODE=automatic` with a database account allowed to create and drop databases.
2. Run `php artisan saas:health` and confirm the automatic create/drop probe succeeds.
3. Create a tenant and confirm the generated database name is valid, prefixed, at most 64 characters, and not the central database.
4. Confirm tenant migrations and seeders run only in the tenant database.
5. Retry provisioning and confirm no second database or duplicate owner/seed/subscription data is created.
6. Delete the staging tenant and confirm the ownership marker is verified before the physical database is dropped.
7. Switch back to pool mode for production shared hosting unless the provider explicitly supports direct database creation.

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
