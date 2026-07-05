# Tenancy setup

## Environment

```dotenv
APP_URL=https://kiteledger.com
CENTRAL_DOMAINS=kiteledger.com,www.kiteledger.com,admin.kiteledger.com
SAAS_BASE_DOMAIN=kiteledger.com
CENTRAL_ADMIN_PATH=admin

DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=kiteledger_central
DB_USERNAME=kiteledger
DB_PASSWORD=strong-secret

TENANT_DB_TEMPLATE_CONNECTION=mysql
TENANT_DB_PREFIX=kiteledger_tenant_
TENANT_PROVISIONING_QUEUE=provisioning
QUEUE_CONNECTION=database
```

The database account needs `CREATE DATABASE`, normal DDL/DML access, and access to tenant databases matching the configured prefix. Use a dedicated least-privilege database user in production.

## Migrations

```bash
php artisan migrate --force
php artisan db:seed --class=Database\\Seeders\\CentralDatabaseSeeder --force
php artisan tenants:migrate --force
```

`php artisan migrate` must never be pointed at a tenant database manually. `tenants:migrate` iterates tenant records and selects each isolated connection.

## Wildcard DNS and TLS

Create `A`/`AAAA` records for the root and `*` pointing to the application load balancer. Obtain a wildcard certificate for `*.kiteledger.com` plus the apex name. Custom domains need their own certificate automation and must CNAME/A-record to the same ingress before being marked active.

Nginx example:

```nginx
server {
    listen 443 ssl http2;
    server_name kiteledger.com www.kiteledger.com admin.kiteledger.com *.kiteledger.com;
    root /var/www/kiteledger/public;
    index index.php;
    location / { try_files $uri $uri/ /index.php?$query_string; }
    location ~ \.php$ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME $document_root$fastcgi_script_name;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }
}
```

In cPanel, add the apex application domain, set its document root to `public/`, create wildcard DNS, and add `*.kiteledger.com` as an alias/subdomain targeting the same document root. Verify the host accepts wildcard aliases before enabling public signup.
