# Wildcard Subdomain Setup

KiteLedger SaaS gives every tenant a subdomain of your base domain
(e.g. `acme.yourdomain.com`, `globex.yourdomain.com`). The marketing site and the
super-admin panel run on the base domain itself.

## How resolution works (and why it's safe)

- Each tenant's subdomain is stored as an **exact row** in the central `domains`
  table when the tenant is provisioned.
- Incoming requests are matched against that table by
  `InitializeTenancyByDomain`. A request to a subdomain that has **not** been
  provisioned simply 404s — random/guessed subdomains never reach a tenant.
- Hosts listed in `CENTRAL_DOMAINS` are served the marketing site + `/admin`
  panel and are **never** passed to tenant resolution.

So you do **not** need a wildcard entry in the database or app config — only in
**DNS and your web server**, so that any subdomain reaches this application.

## 1. DNS records

Point these at your server's IP (`A`/`AAAA`), all to the same server:

| Record | Purpose |
|--------|---------|
| `yourdomain.com` (apex) | Marketing site + `/admin` super-admin panel |
| `www.yourdomain.com` | Marketing site |
| `*.yourdomain.com` (**wildcard**) | Every tenant subdomain |

The super-admin panel is a **path** (`yourdomain.com/admin`), not a subdomain, so
no separate `admin` DNS record is needed. `admin`, `www`, `api`, `app`, `mail`,
etc. are reserved and can never be claimed by a tenant.

## 2. Environment (`.env`)

```dotenv
APP_URL=https://yourdomain.com

# Every host that should serve the marketing site + /admin (comma separated).
CENTRAL_DOMAINS=yourdomain.com,www.yourdomain.com

# The suffix appended to each tenant subdomain. acme -> acme.yourdomain.com
SAAS_BASE_DOMAIN=yourdomain.com

# IMPORTANT: leave this null for wildcard tenancy (see warning below).
SESSION_DOMAIN=null
```

> ⚠️ **Never set `SESSION_DOMAIN=.yourdomain.com` with wildcard tenancy.** A
> dotted (leading-dot) cookie domain is shared across *all* subdomains, which
> would let one tenant's session cookie be sent to another tenant. Leaving
> `SESSION_DOMAIN=null` scopes each tenant's cookie to its own subdomain — this
> is required for cross-tenant isolation.

After editing `.env`, run `php artisan config:clear` (and `config:cache` in
production).

## 3. Web server

### Nginx

One server block handles the apex and every subdomain via `server_name`:

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com *.yourdomain.com;

    root /var/www/kiteledger/public;
    index index.php;

    ssl_certificate     /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        try_files $uri $uri/ /index.php?$query_string;
    }

    location ~ \.php$ {
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME $realpath_root$fastcgi_script_name;
        include fastcgi_params;
    }
}

# Redirect http -> https for apex + all subdomains
server {
    listen 80;
    server_name yourdomain.com *.yourdomain.com;
    return 301 https://$host$request_uri;
}
```

### Apache

Enable `mod_rewrite` and `mod_ssl`, then use a `ServerAlias` wildcard:

```apache
<VirtualHost *:443>
    ServerName yourdomain.com
    ServerAlias *.yourdomain.com
    DocumentRoot /var/www/kiteledger/public

    SSLEngine on
    SSLCertificateFile      /etc/letsencrypt/live/yourdomain.com/fullchain.pem
    SSLCertificateKeyFile   /etc/letsencrypt/live/yourdomain.com/privkey.pem

    <Directory /var/www/kiteledger/public>
        AllowOverride All
        Require all granted
    </Directory>
</VirtualHost>
```

### cPanel / shared hosting

Add the wildcard as a subdomain named `*` pointing to the same `public` document
root as the main domain. Wildcard TLS on cPanel usually requires AutoSSL with a
DNS-01 challenge or a purchased wildcard certificate.

## 4. Wildcard TLS certificate

A normal (single-host) certificate does **not** cover subdomains. You need a
wildcard cert (`*.yourdomain.com`), which requires a **DNS-01** challenge:

```bash
# Example with certbot + a DNS plugin (Cloudflare shown)
certbot certonly \
  --dns-cloudflare --dns-cloudflare-credentials ~/.secrets/cf.ini \
  -d yourdomain.com -d '*.yourdomain.com'
```

Cloudflare's Universal SSL, or any provider that issues `*.yourdomain.com`, works
too. Until wildcard TLS is in place, subdomains will show certificate warnings.

## 5. Verify

1. `php artisan saas:health` — confirms the central DB and `CREATE DATABASE`
   privilege used to provision tenant databases.
2. Create a tenant from `/admin` (or `php artisan tenants:provision`), then visit
   its subdomain. You should get the tenant login, **not** the marketing site.
3. Visit a made-up subdomain (`nonexistent.yourdomain.com`) — it should 404,
   confirming only provisioned tenants resolve.

## Local testing without DNS

Use a wildcard-DNS test service so you don't have to edit hosts files per tenant:

```dotenv
APP_URL=http://127.0.0.1.nip.io:8000
CENTRAL_DOMAINS=127.0.0.1.nip.io
SAAS_BASE_DOMAIN=127.0.0.1.nip.io
```

`acme.127.0.0.1.nip.io` resolves to `127.0.0.1` automatically, so tenant
subdomains work against `php artisan serve`.

## Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Subdomain shows the marketing site | The host is in `CENTRAL_DOMAINS`, or the tenant's domain row is missing. Check the `domains` table. |
| Every subdomain 404s | Wildcard DNS or `server_name *.yourdomain.com` missing; web server isn't routing subdomains to `public`. |
| "No tenant found" errors | The subdomain isn't provisioned. Provision the tenant or check `SAAS_BASE_DOMAIN` matches the stored domain suffix. |
| Logged into one tenant shows another's data | `SESSION_DOMAIN` is set to a dotted domain — set it back to `null` and clear config. |
| TLS warning on subdomains | Certificate is single-host; issue a `*.yourdomain.com` wildcard cert (DNS-01). |
