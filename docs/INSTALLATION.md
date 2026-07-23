# Installation

## Web root: cPanel and local development

The preferred cPanel setup is to extract the complete package outside `public_html` and set the application domain's document root to the package's `public/` directory. Apache then uses `public/.htaccess` and exposes only public assets plus `index.php`.

When shared hosting does not allow changing the document root, extract the complete package directly into the assigned document root. The project-root `.htaccess` blocks Laravel internals and internally forwards web requests into `public/`; do not move individual files out of `public/`.

For local development, run:

```bash
php artisan serve
```

Laravel's development server serves `public/index.php` directly and does not use either `.htaccess` file. The application routes and installer URLs are otherwise identical.

1. Point the main domain and wildcard tenant DNS record at the application.
2. Copy `.env.example` to `.env`, set `DB_CONNECTION=central`, configure the central database, `CENTRAL_DOMAINS`, and `TENANT_BASE_DOMAIN`.
3. Open `/install`. Froiden configures only the central platform database and the first platform administrator. It never asks for, creates, tests, migrates, or seeds a tenant database.
4. Finalization runs only the central migrations and `Database\Seeders\CentralDatabaseSeeder`, creates the first central administrator, and writes `storage/installed`.
5. Sign in at `/superadmin`, create each tenant database in cPanel or your hosting panel, assign its database user, and enter those credentials in the tenant provisioning form.

For a CLI deployment:

```bash
php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\CentralDatabaseSeeder --force
```

Run the central queue worker separately:

```bash
php artisan queue:work central --queue=provisioning,platform-operations,default
```

Do not put database passwords or cPanel tokens in command output, tickets, screenshots, or application logs.
