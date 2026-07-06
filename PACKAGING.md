# Marketplace packaging

Build on a development machine with PHP/Composer, Node.js/npm, `rsync`, and
`zip`. For the fast MySQL path, configure a disposable database and run:

```bash
php artisan install:build-sql --force
```

That command destroys the configured database and writes the production-safe
central SaaS schema/base seed to `database/sql/mysql_install.sql`; it uses
`CentralDatabaseSeeder` and excludes tenant ERP/demo data. Always use a clean,
disposable MySQL database.

Build the package:

```bash
chmod +x scripts/build-marketplace-package.sh
./scripts/build-marketplace-package.sh
```

For a release build, require the SQL dump:

```bash
STRICT_MARKETPLACE_BUILD=1 ./scripts/build-marketplace-package.sh
```

The script builds frontend assets, stages a clean copy, installs optimized
production Composer dependencies in the staging folder, clears its caches, and
creates `dist/kiteledger-marketplace.zip`. It does not delete developer files.

The ZIP excludes `.env`, Git/editor metadata, `node_modules`, tests, local
databases, logs, caches, install locks, storage links, and Vite hot files. It
includes `vendor/`, `public/build/`, shipped branding, and any prepared SQL dump.
The installer also removes any stale `public/hot` marker and switches `.env` to
`APP_ENV=production` with `APP_DEBUG=false` when installation finishes.

Never upload the GitHub source ZIP to CodeCanyon/Codester. The staged package
is validated for `vendor/autoload.php`, `public/build/manifest.json`,
`.env.example`, `artisan`, `bootstrap/app.php`, runtime directories, installer
views/assets, and the canonical SQL dump in strict mode. A non-strict build
warns (but continues) when the dump is absent.

Extract the ZIP into a clean directory and verify `/install`, login,
`php artisan route:list`, and `php artisan kiteledger:doctor` before release.
