# Installation

1. Point the main domain and wildcard tenant DNS record at the application.
2. Copy `.env.example` to `.env`, set `DB_CONNECTION=central`, configure the central database, `CENTRAL_DOMAINS`, and `TENANT_BASE_DOMAIN`.
3. Choose `TENANT_DB_PROVISIONING_MODE=manual`, `mysql`, or `cpanel` and supply only the corresponding credentials.
4. Open `/install`. The Froiden flow checks PHP requirements and permissions. The tenancy checks are exposed below `/install/tenancy`.
5. Finalization runs only the central migrations and `Database\Seeders\CentralDatabaseSeeder`, creates the first central administrator, and writes `storage/installed`.

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
