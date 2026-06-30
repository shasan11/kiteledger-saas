# Marketplace packaging

Build on a development machine with PHP/Composer, Node.js/npm, `rsync`, and
`zip`. For the fast MySQL path, configure a disposable database and run:

```bash
php artisan install:build-sql --force
```

That command destroys the configured database and writes the production-safe
schema/base seed to `database/sql/mysql_install.sql`; it excludes full demo data.

Build the package:

```bash
chmod +x scripts/build-marketplace-package.sh
./scripts/build-marketplace-package.sh
```

The script builds frontend assets, stages a clean copy, installs optimized
production Composer dependencies in the staging folder, clears its caches, and
creates `dist/kiteledger-marketplace.zip`. It does not delete developer files.

The ZIP excludes `.env`, Git/editor metadata, `node_modules`, tests, local
databases, logs, caches, install locks, storage links, and Vite hot files. It
includes `vendor/`, `public/build/`, shipped branding, and any prepared SQL dump.
The installer also removes any stale `public/hot` marker and switches `.env` to
`APP_ENV=production` with `APP_DEBUG=false` when installation finishes.

Extract the ZIP into a clean directory and verify `/install`, login,
`php artisan route:list`, and `php artisan kiteledger:doctor` before release.
