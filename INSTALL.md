# KiteLedger — Installation Guide

This guide walks through deploying KiteLedger on shared hosting (cPanel, Plesk, etc.) or a VPS. No coding experience required — the web installer does the heavy lifting.

## 1. Server requirements

- **PHP 8.3 or higher**
- PHP extensions: `pdo`, `mbstring`, `openssl`, `tokenizer`, `json`, `curl`, `fileinfo`, `ctype`, `xml`, `bcmath`
- MySQL 8+ / MariaDB 10.4+ / PostgreSQL (SQLite also works for quick evaluation)
- Apache with `mod_rewrite` (most shared hosts), or Nginx with the rewrite rules in [§6](#6-nginx-users)

The installer checks all of this for you on the **Requirements** step and tells you exactly what's missing.

## 2. Upload the files

The package already includes everything needed to run — `vendor/` (Composer dependencies) and `public/build/` (compiled CSS/JS) are pre-built, so you do **not** need to run `composer install` or `npm run build` on the server.

**Do not move or rename any folder.** Upload/extract the entire package exactly as it is into your hosting account's web root.

- **Shared hosting (cPanel, Plesk, etc.):** Extract everything directly into `public_html/` (or your account's web root). Keep `public/` where it is — do not change your document root. The included root `.htaccess` automatically forwards every request into `public/` for you and blocks direct access to `app/`, `storage/`, `vendor/`, `.env`, and other internal files. This is the recommended setup for shared hosting because most shared-hosting control panels won't let you point the document root anywhere except the account's root folder.
- **VPS / dedicated server with a control panel (e.g. you can set the vhost document root):** You may instead point the document root directly at the `public/` folder if you prefer the conventional Laravel layout. Both approaches work without any code changes — pick whichever your host supports.

### File/folder permissions

Make these writable by the web server user (usually `755` for directories is enough on shared hosting; ask your host if you hit permission errors):

- `storage/` (and everything inside it)
- `bootstrap/cache/`
- the project root (so the installer can write `.env`)

## 3. Run the installer

Visit `https://your-domain.com/install` in a browser. The wizard walks through:

1. **Welcome**
2. **Requirements** — PHP version/extensions, `vendor/`/`public/build/` presence, writable paths, rewrite support
3. **Database** — host, port, database name, username, password (use *Test Connection* before continuing)
4. **Application** — app name, URL (auto-detected from the browser request — only change this if you're behind a proxy/CDN and the detected URL is wrong), timezone, default currency
5. **Company** — name, legal name, email, phone, address, country, website
6. **Branch** — your company's first (head office) branch name/code
7. **Administrator** — the Super Admin login you'll use to sign in
8. **Language** — pick which languages to enable and your default. English, Spanish and French ship fully wired into the system (Nepali and Arabic are also installed and can be expanded later from **Settings → Localization**)
9. **Finish** — click **Go to Login**

Behind the scenes, the **Install** step:
- Writes a fresh `.env` (with `APP_DEBUG=false` and `APP_ENV=production`, regardless of what the package shipped with)
- Runs database migrations and a **production-safe seed set** — only configuration/lookup data (currencies, chart of accounts, tax rules, document numbering, roles & permissions, etc.). It deliberately skips the demo-data seeders used during development, so your installation starts with **no sample customers, invoices, or test logins**
- Attempts to create the `public/storage` symlink (`storage:link`) automatically; if your host doesn't allow symlinks, see [§7](#7-troubleshooting)
- Creates your company profile, branch, Super Admin account, and disabled (off-by-default) Stripe/PayPal/Razorpay rows you can configure later under **Settings → Online Payments**

The installer never marks the app "installed" unless every step succeeds — if something fails partway through, fix the issue and reload `/install` to try again.

## 4. After installation — the install lock

Once setup completes, the installer writes `storage/app/installed`. While this file exists, visiting `/install` redirects straight to the dashboard, and the install endpoints refuse to run again.

**To reset and reinstall** (e.g. on a staging copy): delete `storage/app/installed`, then visit `/install` again. This does **not** undo your database — if you want a truly clean slate, also drop and recreate the database before reinstalling.

## 5. Root domain, subfolder, or multiple domains

The application works the same way regardless of where it's installed:

- **Root domain** (`https://example.com`): set the Application URL to `https://example.com` during install.
- **Subfolder** (`https://example.com/myapp`): upload the package into that subfolder and set the Application URL to `https://example.com/myapp`. Leave `VITE_APP_BACKEND_URL` blank in `.env` (the installer never sets it) — the frontend then resolves all asset/storage URLs relative to the current page, so logos, uploads and built CSS/JS keep working under the subfolder automatically.

## 6. Nginx users

Nginx doesn't read `.htaccess` files. If your host uses Nginx and lets you point the document root at the project root (not `public/`), add an internal rewrite equivalent to the bundled `.htaccess`:

```nginx
location / {
    try_files $uri $uri/ /public/index.php?$query_string;
}
location ~ ^/(app|bootstrap|config|database|node_modules|resources|routes|scripts|storage|tests|vendor)/ {
    deny all;
}
```

If your host instead lets you point the document root directly at `public/` (the simpler option on Nginx/VPS setups), use the standard Laravel Nginx config and skip the rewrite above entirely.

## 7. Troubleshooting

**Broken images / missing logos or uploads after deployment**
Almost always an `.env` mismatch. Confirm `APP_URL` matches the exact domain (and subfolder, if any) you're visiting, with no trailing slash. The installer sets this automatically from your browser request, so this is usually only an issue if you edited `.env` by hand afterward.

**`public/storage` symlink missing (uploaded files 404)**
Some shared hosts disable `symlink()`. The installer tries `storage:link` automatically and won't fail the install if it can't create it — you can create it manually via your host's terminal/SSH if available:
```
php artisan storage:link
```
If your host has no shell access and disables symlinks entirely, contact your host — this is a hosting-level restriction, not an application bug.

**"500 error" or blank page after upload**
Check `storage/` and `bootstrap/cache/` are writable by the web server, and that `.env` exists (the installer creates it — if you uploaded a previous `.env`, delete it before running `/install` fresh).

**`/install` redirects to the dashboard immediately**
The app already thinks it's installed. Delete `storage/app/installed` to re-run the wizard (see §4).

**Mixed languages on screen after switching**
Spanish and French cover the most common screens, buttons, and the login page out of the box. Less common labels fall back to English until translated — you can add/edit translations any time from **Settings → Localization → Translations**, and your changes are picked up immediately (no rebuild needed).

## 8. Language settings (after install)

From **Settings → Localization**, Super Admins can:
- Add, edit, enable, disable, or delete languages
- Set the system-wide default language
- Edit translation values per language, or import a JSON translation file
- Untranslated keys automatically fall back to English

### Branch-wise language

Each branch can have its own default language and its own restricted set of enabled languages, configured from **Master Data → Branches**. When a user logs in, their language is resolved in this order:

1. Language they manually selected this session
2. Their personal saved preference
3. Their branch's default language (if set)
4. The company-wide default language
5. English (final fallback)

Leave a branch's "Enabled Language Codes" field blank to let users at that branch choose from every language installed company-wide.
