# KiteLedger

KiteLedger is an installable Laravel accounting and operations application.

## Packaged installation

A marketplace ZIP contains `vendor/`, `public/build/`, and preferably
`database/sql/mysql_install.sql`. Customers do not need Composer or Node.js.

1. Extract the ZIP and point the web root to `public/`.
2. Make `storage/`, `bootstrap/cache/`, and the project root writable.
3. Open `/install` and choose Fresh, Quick Demo, or Full Demo.

Fresh installs safe base data. Quick Demo adds a small product set. Full Demo
installs base data in the browser, then displays this CLI-only command:

```bash
php artisan kiteledger:seed-demo --profile=full --force
```

See [INSTALL.md](INSTALL.md) for deployment details and [PACKAGING.md](PACKAGING.md)
for release builds.

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
