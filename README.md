<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## KiteLedger — Installation (CodeCanyon)

KiteLedger ships with a **web installer** so you can set it up from the browser — no command line or manual `.env` editing required. **See [INSTALL.md](INSTALL.md) for the full setup guide**, including shared-hosting specific notes. Quick version below.

### Requirements
- PHP **8.3+** with extensions: `pdo`, `mbstring`, `openssl`, `tokenizer`, `json`, `curl`, `fileinfo`, `ctype`, `xml`, `bcmath`
- MySQL 8 / MariaDB 10.4+ / PostgreSQL (or SQLite for evaluation)
- Writable `storage/`, `storage/app/public/`, `bootstrap/cache/`, and project root (for `.env`)

### Steps
1. Upload/extract **the entire package as-is** to your hosting account's web root (e.g. `public_html/`). Do **not** move the `public/` folder out and do **not** change your document root — the included root `.htaccess` already forwards requests into `public/` for you, which is exactly what most shared hosting needs. (If you're on a VPS/control panel and prefer pointing the document root at `public/` directly, that also works — see INSTALL.md.)
2. `vendor/` and `public/build/` ship pre-built inside the package, so most customers don't need to run Composer or npm at all.
3. Visit **`https://your-domain.com/install`** in a browser and follow the wizard:
   - **Welcome → Requirements** (PHP version, extensions, vendor/build presence, writable paths, rewrite support)
   - **Database** — enter DB credentials and click *Test Connection*
   - **Application** — app name, URL (auto-detected), timezone, default currency
   - **Company** — company name, legal name, email, phone, address, country, website
   - **Branch** — your company's first (head office) branch
   - **Administrator** — name, email, password (becomes your Super Admin login)
   - **Language** — choose which languages to enable and your default (English, Spanish, French ship pre-translated; Nepali and Arabic are also included)
   - **Install** — writes `.env`, runs migrations and a production-safe seed set (no demo data or sample logins), creates your branch, currency, fiscal year, company profile, Super Admin user, and disabled Stripe/PayPal/Razorpay gateway rows, then attempts `storage:link`.
4. On the **Finish** screen, click **Go to Login** and sign in.

### After installation
- The installer creates `storage/app/installed` (the install lock). While it exists, `/install` is blocked and redirects to the dashboard.
- To re-run the installer (e.g. a staging reset), delete `storage/app/installed`.
- Configure payment gateways under **Settings → Online Payments** (Stripe / PayPal / Razorpay) and your cheque layout under **Settings → Cheque Format Editor**.

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
