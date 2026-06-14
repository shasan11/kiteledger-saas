<p align="center"><a href="https://laravel.com" target="_blank"><img src="https://raw.githubusercontent.com/laravel/art/master/logo-lockup/5%20SVG/2%20CMYK/1%20Full%20Color/laravel-logolockup-cmyk-red.svg" width="400" alt="Laravel Logo"></a></p>

<p align="center">
<a href="https://github.com/laravel/framework/actions"><img src="https://github.com/laravel/framework/workflows/tests/badge.svg" alt="Build Status"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/dt/laravel/framework" alt="Total Downloads"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/v/laravel/framework" alt="Latest Stable Version"></a>
<a href="https://packagist.org/packages/laravel/framework"><img src="https://img.shields.io/packagist/l/laravel/framework" alt="License"></a>
</p>

## KiteLedger — Installation (CodeCanyon)

KiteLedger ships with a **web installer** so you can set it up from the browser — no command line or manual `.env` editing required.

### Requirements
- PHP **8.3+** with extensions: `pdo`, `mbstring`, `openssl`, `tokenizer`, `json`, `curl`, `fileinfo`, `ctype`, `xml`, `bcmath`
- MySQL 8 / MariaDB 10.4+ / PostgreSQL (or SQLite for evaluation)
- A web server (Apache/Nginx) with the document root pointing at the `public/` folder
- Writable `storage/` and `bootstrap/cache/` directories

### Steps
1. Upload/extract the files to your server and point the web root at `public/`.
2. **Copy `.env.example` to `.env`** (it already contains a valid `APP_KEY`).
3. Install PHP dependencies: `composer install --no-dev --optimize-autoloader`.
4. Build front-end assets (prebuilt in the package; only needed if you change code): `npm install && npm run build`.
5. Visit **`https://your-domain.com/install`** in a browser and follow the wizard:
   - **Welcome → Requirements check** (PHP version, extensions, writable paths)
   - **Database** — enter DB credentials and click *Test Connection*
   - **Application** — app name, URL, timezone, default currency
   - **Company** — company name, legal name, email, phone, address, country, website
   - **Administrator** — name, email, password (becomes your Super Admin login)
   - **Install** — writes `.env`, runs migrations + seeders, and creates your default currency, fiscal year, branch, company profile (`AppSetting`), Super Admin user, the default cheque format, and disabled Stripe/PayPal/Razorpay gateway rows.
6. On the **Finish** screen, click **Go to Login** and sign in.

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
