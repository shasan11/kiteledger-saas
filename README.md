<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## KiteLedger — Installation

KiteLedger ships with a **web installer** at `/install` that handles the database, company profile, admin user and install lock from the browser. In **every** case the database is set up by the installer — **never** run `php artisan migrate` by hand before opening `/install`.

There are two ways to get the files onto your server. Pick the one that matches how you obtained KiteLedger:

| | A. CodeCanyon / packaged ZIP | B. GitHub / developer clone |
|---|---|---|
| `vendor/` included? | ✅ Yes (pre-built) | ❌ No — you must run Composer |
| `public/build/` included? | ✅ Yes (pre-built) | ❌ Usually no — you must run npm |
| Composer needed? | ❌ No | ✅ Yes |
| Node / npm needed? | ❌ No | ✅ Yes |

> **See [INSTALL.md](INSTALL.md) for the full guide**, including shared-hosting, Nginx and FastPanel notes. Quick versions below.

### Requirements (both modes)
- PHP **8.3+** with extensions: `pdo`, `mbstring`, `openssl`, `tokenizer`, `json`, `curl`, `fileinfo`, `ctype`, `xml`, `bcmath`
- MySQL 8 / MariaDB 10.4+ / PostgreSQL (or SQLite for evaluation)
- Writable `storage/`, `storage/app/public/`, `bootstrap/cache/`, and project root (for `.env`)

---

### A. CodeCanyon / packaged ZIP installation

The ZIP already contains `vendor/` and `public/build/`, so **no Composer and no npm are required**.

1. **Upload/extract** the entire package as-is to your hosting account.
2. **Document root:** on shared hosting (cPanel/Plesk), extract into your web root and leave `public/` where it is — the bundled root `.htaccess` forwards requests into `public/`. On a VPS/Nginx/FastPanel, point the document root at the **`public/`** folder.
3. **Make writable:** `storage/` and `bootstrap/cache/` (and the project root so the installer can write `.env`).
4. Open **`https://your-domain.com/install`**.
5. Enter your **database details** and **admin details** in the wizard.
6. **Finish** — click *Go to Login* and sign in.

---

### B. GitHub / developer installation

The repo does **not** include `vendor/`, and `public/build/` may be absent — so Composer and Node are required. Use the bundled fast-install script:

```bash
git clone https://github.com/shasan11/kiteledger-saas.git kiteledger
cd kiteledger
chmod +x scripts/install-fast.sh
./scripts/install-fast.sh
```

On Windows use `scripts\install-fast.bat` instead.

The script runs `composer install`, copies `.env.example` → `.env` (only if missing), generates `APP_KEY`, runs `npm install && npm run build`, links storage, and clears caches. It **does not** run migrations.

Then open:

```
https://your-domain.com/install
```

and complete the wizard (DB + admin). The installer writes the DB credentials into `.env` and runs migrations for you.

**Important:**
- Do **not** run `php artisan migrate` manually before `/install` — the database isn't configured yet.
- Do **not** use `composer setup` for a production DB install; `composer setup` only builds the app, it does not touch the database.
- FastPanel/Nginx document root should point to **`/public`**.

---

### The wizard (both modes)
- **Welcome → Requirements** (PHP version, extensions, vendor/build presence, writable paths, rewrite support)
- **Database** — enter DB credentials and click *Test Connection*
- **Application** — app name, URL (auto-detected), timezone, default currency
- **Company / Branch / Administrator** — your company profile, head-office branch, and Super Admin login
- **Language** — English, Spanish, French ship pre-translated; Nepali and Arabic are also included
- **Install** — writes `.env`, runs migrations and a production-safe seed set (no demo data or sample logins), creates your branch/currency/fiscal year/company profile/Super Admin/disabled gateway rows, attempts `storage:link`, then caches config/routes/views for production.

### Health check
Run `php artisan kiteledger:doctor` at any time to verify the deployment (vendor, `.env`, `APP_KEY`, writable paths, `public/build`, DB connection, install lock).

### After installation
- The installer creates `storage/app/installed` (the install lock). While it exists, `/install` is blocked and redirects to the dashboard.
- To re-run the installer (e.g. a staging reset), delete `storage/app/installed`.
- Configure payment gateways under **Settings → Online Payments** and your cheque layout under **Settings → Cheque Format Editor**.

### Notes
- The system is never marked installed unless every step completes successfully; failures show a readable error and leave it un-installed.
- Database passwords are never logged or returned to the browser.

## About Laravel

Laravel is a web application framework with expressive, elegant syntax. We believe development must be an enjoyable and creative experience to be truly fulfilling. Laravel takes the pain out of development by easing common tasks used in many web projects, such as:

- [Simple, fast routing engine](https://laravel.com/docs/routing).
- [Powerful dependency injection container](https://laravel.com/docs/container).
- Multiple back-ends for [session](https://laravel.com/docs/session) and [cache](https://laravel.com/docs/cache) storage.
- Expressive, intuitive [database ORM](https://laravel.com/docs/eloquent).
- Database agnostic [schema migrations](https://laravel.com/docs/migrations).
- [Robust background job processing](https://laravel.com/docs/queues).
- [Real-time event broadcasting](https://laravel.com/docs/broadcasting).

Laravel is accessible, powerful, and provides tools required for large, robust applications.

## Learning Laravel

Laravel has the most extensive and thorough [documentation](https://laravel.com/docs) and video tutorial library of all modern web application frameworks, making it a breeze to get started with the framework.

In addition, [Laracasts](https://laracasts.com) contains thousands of video tutorials on a range of topics including Laravel, modern PHP, unit testing, and JavaScript. Boost your skills by digging into our comprehensive video library.

You can also watch bite-sized lessons with real-world projects on [Laravel Learn](https://laravel.com/learn), where you will be guided through building a Laravel application from scratch while learning PHP fundamentals.

## Agentic Development

Laravel's predictable structure and conventions make it ideal for AI coding agents like Claude Code, Cursor, and GitHub Copilot. Install [Laravel Boost](https://laravel.com/docs/ai) to supercharge your AI workflow:

```bash
composer require laravel/boost --dev

php artisan boost:install
```

Boost provides your agent 15+ tools and skills that help agents build Laravel applications while following best practices.

## Contributing

Thank you for considering contributing to the Laravel framework! The contribution guide can be found in the [Laravel documentation](https://laravel.com/docs/contributions).

## Code of Conduct

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
