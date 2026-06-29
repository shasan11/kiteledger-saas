# KiteLedger installation

## Requirements

- PHP 8.3+ with PDO, mbstring, OpenSSL, tokenizer, JSON, cURL, fileinfo, ctype,
  XML, and bcmath
- MySQL/MariaDB, PostgreSQL, or SQLite
- Writable `storage/`, `bootstrap/cache/`, and project root

The marketplace package includes `vendor/` and `public/build/`; buyers do not
need Composer, Node.js, or npm.

## Browser installer

Extract the package, point the document root to `public/`, and open `/install`.
On compatible Apache shared hosting, the root `.htaccess` forwards traffic.

- **Fresh:** imports the packaged MySQL dump when available; otherwise runs
  fresh migrations and the production-safe base seed.
- **Quick Demo:** Fresh, followed by the small `DemoLiteSeeder` dataset.
- **Full Demo:** Fresh only. Heavy demo transactions never run over HTTP. Run
  the command shown on the completion screen afterward.

PostgreSQL and SQLite always use migrations because the dump is MySQL-specific.

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

Uploaded branding overrides the shipped defaults in `public/branding/`. Full
demo data is CLI-only:

```bash
php artisan kiteledger:seed-demo --profile=full --force
```
