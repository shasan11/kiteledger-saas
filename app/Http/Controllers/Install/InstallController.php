<?php

namespace App\Http\Controllers\Install;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\Branch;
use App\Models\ChequeFormatConfiguration;
use App\Models\Currency;
use App\Models\FiscalYear;
use App\Models\Language;
use App\Models\PaymentGatewaySetting;
use App\Models\User;
use App\Support\Installer\EnvWriter;
use App\Support\Installer\InstalledState;
use App\Support\Installer\SqlInstallImporter;
use Database\Seeders\ProductionSeeder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use PDO;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;
use Throwable;

class InstallController extends Controller
{
    /** Codes that ship pre-translated and seeded; keep in sync with LanguageSeeder. */
    private const SUPPORTED_LANGUAGES = ['en', 'es', 'fr', 'ne', 'ar'];

    private const DEFAULT_LANGUAGE = 'en';

    public function index(Request $request)
    {
        return view('install.index', [
            'detectedUrl' => rtrim($request->getSchemeAndHttpHost(), '/'),
        ]);
    }

    /**
     * Server requirement checks.
     */
    public function requirements()
    {
        $extensions = ['pdo', 'mbstring', 'openssl', 'tokenizer', 'json', 'curl', 'fileinfo', 'ctype', 'xml', 'bcmath'];

        $checks = [
            ['key' => 'php', 'label' => 'PHP >= 8.3', 'passed' => version_compare(PHP_VERSION, '8.3.0', '>='), 'hint' => 'Current: '.PHP_VERSION],
        ];

        foreach ($extensions as $ext) {
            $checks[] = ['key' => "ext_$ext", 'label' => "PHP ext: $ext", 'passed' => extension_loaded($ext), 'hint' => ''];
        }

        $checks[] = [
            'key' => 'vendor',
            'label' => 'Composer dependencies (vendor/)',
            'passed' => is_file(base_path('vendor/autoload.php')),
            'hint' => 'Composer dependencies are missing. If you installed from GitHub, run: composer install --no-dev --optimize-autoloader. If this is a packaged ZIP, make sure the vendor folder is included.',
        ];

        $checks[] = [
            'key' => 'build_assets',
            'label' => 'Compiled front-end assets (public/build/)',
            'passed' => is_file(public_path('build/manifest.json')),
            'hint' => 'Frontend build files are missing. Run: npm install && npm run build. For packaged ZIP, make sure public/build is included.',
        ];

        $checks[] = [
            'key' => 'htaccess',
            'label' => 'URL rewriting (.htaccess / mod_rewrite)',
            'passed' => is_file(base_path('.htaccess')) && is_file(public_path('.htaccess')),
            'hint' => function_exists('apache_get_modules')
                ? (in_array('mod_rewrite', apache_get_modules(), true) ? 'mod_rewrite detected.' : 'mod_rewrite not detected — enable it or use Nginx try_files rules (see INSTALL.md).')
                : 'Could not detect mod_rewrite (normal on Nginx/LiteSpeed) — ensure your host honors .htaccess or has equivalent rewrite rules. See INSTALL.md.',
        ];

        $writable = [
            'storage' => storage_path(),
            'storage/app/public' => storage_path('app/public'),
            'storage/framework' => storage_path('framework'),
            'storage/logs' => storage_path('logs'),
            'bootstrap/cache' => base_path('bootstrap/cache'),
            'public (for storage symlink)' => public_path(),
        ];

        foreach ($writable as $label => $path) {
            $checks[] = ['key' => 'writable_'.$label, 'label' => "Writable: $label", 'passed' => is_dir($path) ? is_writable($path) : false, 'hint' => $path];
        }

        $envPath = base_path('.env');
        $checks[] = [
            'key' => 'writable_env',
            'label' => 'Writable: .env',
            'passed' => is_file($envPath) ? is_writable($envPath) : is_writable(base_path()),
            'hint' => is_file($envPath)
                ? $envPath
                : 'Missing .env; the project root must be writable so the installer can create it.',
        ];

        return response()->json([
            'passed' => collect($checks)->every(fn ($c) => $c['passed'] || $c['key'] === 'htaccess'),
            'checks' => $checks,
        ]);
    }

    /**
     * Test the database connection without writing anything.
     */
    public function testDatabase(Request $request)
    {
        $data = $this->validateDatabase($request);

        try {
            $this->makePdo($data);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Connection failed: '.$e->getMessage()], 422);
        }

        return response()->json(['success' => true, 'message' => 'Database connection successful.']);
    }

    /**
     * Run the full installation.
     */
    public function run(Request $request)
    {
        if (InstalledState::isInstalled()) {
            return response()->json(['success' => false, 'message' => 'Application is already installed.'], 403);
        }

        // migrate:fresh + ProductionSeeder can take longer than the default
        // PHP request limits on shared/VPS hosting. Without this, the request
        // dies mid-migration and every retry fails the same way ("persistent
        // error"). Give the install all the time/memory it needs and keep
        // running even if the browser disconnects.
        @set_time_limit(0);
        @ini_set('memory_limit', '512M');
        ignore_user_abort(true);

        $db = $this->validateDatabase($request);

        $data = Validator::make($request->all(), [
            'app_name' => ['required', 'string', 'max:120'],
            'app_url' => ['required', 'string', 'max:255'],
            'timezone' => ['required', 'string', 'max:64'],
            'currency_code' => ['required', 'string', 'max:10'],
            'currency_symbol' => ['nullable', 'string', 'max:10'],
            'company_name' => ['required', 'string', 'max:180'],
            'legal_name' => ['nullable', 'string', 'max:180'],
            'company_email' => ['nullable', 'email', 'max:180'],
            'company_phone' => ['nullable', 'string', 'max:60'],
            'company_address' => ['nullable', 'string', 'max:500'],
            'company_country' => ['nullable', 'string', 'max:100'],
            'company_website' => ['nullable', 'string', 'max:180'],
            'branch_name' => ['required', 'string', 'max:120'],
            'branch_code' => ['nullable', 'string', 'max:30'],
            'admin_name' => ['required', 'string', 'max:120'],
            'admin_email' => ['required', 'email', 'max:180'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
            'default_language' => ['nullable', 'string', 'in:'.implode(',', self::SUPPORTED_LANGUAGES)],
            'enabled_languages' => ['nullable', 'array'],
            'enabled_languages.*' => ['string', 'in:'.implode(',', self::SUPPORTED_LANGUAGES)],
        ])->validate();

        $data['default_language'] = self::DEFAULT_LANGUAGE;
        $data['enabled_languages'] = $this->normalizeEnabledLanguages($data['enabled_languages'] ?? []);

        // Verify DB connectivity before touching the filesystem.
        try {
            $this->makePdo($db);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Database connection failed: '.$e->getMessage()], 422);
        }

        try {
            // 1. Write .env (generates a fresh APP_KEY).
            EnvWriter::write([
                'APP_NAME' => $data['app_name'],
                'APP_URL' => rtrim($data['app_url'], '/'),
                'APP_TIMEZONE' => $data['timezone'],
                'DB_CONNECTION' => $db['connection'],
                'DB_HOST' => $db['host'],
                'DB_PORT' => $db['port'],
                'DB_DATABASE' => $db['database'],
                'DB_USERNAME' => $db['username'],
                'DB_PASSWORD' => $db['password'] ?? '',
            ]);

            // 2. Point the running process at the new database.
            $this->configureRuntimeDatabase($db);

            // 3. Prefer a packaged SQL install dump for faster production
            // installs; fall back to migrations when the dump is absent.
            if (SqlInstallImporter::availableFor($db['connection'])) {
                SqlInstallImporter::importFor($db['connection']);
            } else {
                Artisan::call('migrate:fresh', ['--force' => true]);
                Artisan::call('db:seed', ['--force' => true, '--class' => ProductionSeeder::class]);
            }

            // 4. Link public storage when the host allows symlinks. Shared
            // hosts often block this, so /storage also has a Laravel fallback.
            $storage = $this->ensurePublicStorageAccess();

            // 5. Apply installer-specific data.
            $currency = $this->ensureCurrency($data);
            $fiscalYear = FiscalYear::query()->where('is_current', true)->first()
                ?? FiscalYear::query()->where('active', true)->orderByDesc('created_at')->first();

            $this->applyCompanySettings($data, $currency, $fiscalYear);
            $branch = $this->applyBranch($data);
            $this->applyLanguages($data, $branch);
            $this->createSuperAdmin($data, $branch);
            $this->ensurePaymentGateways();
            ChequeFormatConfiguration::activeDefault();

            // 6. Lock.
            InstalledState::mark();

            // 7. Clear every compiled cache so the new .env/DB take effect on
            // the next request. We deliberately do NOT config:cache here:
            // caching during this request would freeze a wrong value into
            // bootstrap/cache and make it un-fixable by editing .env (the
            // textbook "persistent error"). Production caching is an explicit,
            // documented post-install step (php artisan optimize).
            try {
                Artisan::call('optimize:clear');
            } catch (Throwable) {
                // Non-fatal — the app runs fine without compiled caches.
            }
        } catch (Throwable $e) {
            // Do not mark installed on failure; surface a readable error.
            return response()->json([
                'success' => false,
                'message' => 'Installation failed: '.$e->getMessage(),
            ], 500);
        }

        return response()->json([
            'success' => true,
            'message' => 'Installation complete.',
            'login_url' => url('/login'),
            'storage' => $storage ?? null,
        ]);
    }

    private function normalizeEnabledLanguages(array $enabled): array
    {
        $enabled = array_values(array_unique(array_filter(
            $enabled,
            fn ($code) => is_string($code) && in_array($code, self::SUPPORTED_LANGUAGES, true),
        )));

        if (! in_array(self::DEFAULT_LANGUAGE, $enabled, true)) {
            array_unshift($enabled, self::DEFAULT_LANGUAGE);
        }

        return $enabled;
    }

    private function validateDatabase(Request $request): array
    {
        $data = Validator::make($request->all(), [
            'db_connection' => ['required', 'in:mysql,mariadb,pgsql,sqlite'],
            'db_host' => ['required_unless:db_connection,sqlite', 'nullable', 'string', 'max:191'],
            'db_port' => ['required_unless:db_connection,sqlite', 'nullable', 'string', 'max:10'],
            'db_database' => ['required', 'string', 'max:191'],
            'db_username' => ['required_unless:db_connection,sqlite', 'nullable', 'string', 'max:191'],
            'db_password' => ['nullable', 'string', 'max:191'],
        ])->validate();

        return [
            'connection' => $data['db_connection'],
            'host' => $data['db_host'] ?? '127.0.0.1',
            'port' => $data['db_port'] ?? ($data['db_connection'] === 'pgsql' ? '5432' : '3306'),
            'database' => $data['db_database'],
            'username' => $data['db_username'] ?? '',
            'password' => $data['db_password'] ?? '',
        ];
    }

    private function makePdo(array $db): PDO
    {
        $conn = $db['connection'];

        if ($conn === 'sqlite') {
            $path = $db['database'];
            if (! str_starts_with($path, '/') && ! preg_match('/^[A-Za-z]:/', $path)) {
                $path = base_path($path);
            }
            if (! is_file($path)) {
                @touch($path);
            }

            return new PDO('sqlite:'.$path);
        }

        $driver = $conn === 'pgsql' ? 'pgsql' : 'mysql';
        $dsn = "$driver:host={$db['host']};port={$db['port']};dbname={$db['database']}";

        return new PDO($dsn, $db['username'], $db['password'], [
            PDO::ATTR_TIMEOUT => 5,
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        ]);
    }

    private function configureRuntimeDatabase(array $db): void
    {
        $conn = $db['connection'];

        config([
            'database.default' => $conn,
            "database.connections.$conn.driver" => $conn === 'mariadb' ? 'mariadb' : $conn,
            "database.connections.$conn.host" => $db['host'],
            "database.connections.$conn.port" => $db['port'],
            "database.connections.$conn.database" => $db['database'],
            "database.connections.$conn.username" => $db['username'],
            "database.connections.$conn.password" => $db['password'],
        ]);

        DB::purge($conn);
        DB::reconnect($conn);
        DB::setDefaultConnection($conn);
    }

    private function ensureCurrency(array $data): Currency
    {
        $code = strtoupper($data['currency_code']);

        $currency = Currency::query()->where('code', $code)->first();

        if (! $currency) {
            $currency = Currency::query()->create([
                'code' => $code,
                'name' => $code,
                'symbol' => $data['currency_symbol'] ?? $code,
                'decimal_places' => 2,
                'exchange_rate' => 1,
                'is_base' => true,
                'active' => true,
                'is_system_generated' => true,
            ]);
        }

        // Make it the single base currency.
        Currency::query()->where('id', '!=', $currency->id)->update(['is_base' => false]);
        $currency->forceFill(['is_base' => true, 'active' => true])->save();

        return $currency;
    }

    private function applyCompanySettings(array $data, Currency $currency, ?FiscalYear $fiscalYear): void
    {
        $settings = AppSetting::query()->first() ?? new AppSetting;

        $settings->fill([
            'company_name' => $data['company_name'],
            'legal_name' => $data['legal_name'] ?? $data['company_name'],
            'email' => $data['company_email'] ?? null,
            'phone' => $data['company_phone'] ?? null,
            'address' => $data['company_address'] ?? null,
            'country' => $data['company_country'] ?? null,
            'website' => $data['company_website'] ?? null,
            'default_currency_id' => $currency->id,
            'fiscal_year_id' => $fiscalYear?->id,
            'timezone' => $data['timezone'],
        ]);

        $settings->save();
    }

    private function applyBranch(array $data): Branch
    {
        $branch = Branch::query()->where('is_head_office', true)->first()
            ?? Branch::query()->orderBy('created_at')->first();

        $code = $data['branch_code'] ?? null;

        $attributes = [
            'name' => $data['branch_name'],
            'email' => $data['company_email'] ?? null,
            'phone' => $data['company_phone'] ?? null,
            'address' => $data['company_address'] ?? null,
            'is_head_office' => true,
            'active' => true,
        ];

        if ($code) {
            $attributes['code'] = $code;
        }

        if ($branch) {
            $branch->forceFill($attributes)->save();

            return $branch;
        }

        return Branch::query()->create($attributes + [
            'code' => $code ?: 'MAIN',
            'is_transaction_enabled' => true,
            'is_pos_enabled' => true,
            'is_warehouse_enabled' => true,
            'is_ai_enabled' => true,
            'is_billing_location_enabled' => true,
            'abbreviated_tax_enabled' => true,
            'track_location' => true,
            'is_system_generated' => true,
        ]);
    }

    private function ensurePublicStorageAccess(): array
    {
        $target = storage_path('app/public');
        $link = public_path('storage');

        if (! is_dir($target)) {
            @mkdir($target, 0775, true);
        }

        $error = null;

        try {
            Artisan::call('storage:link');
        } catch (Throwable $e) {
            $error = $e->getMessage();
        }

        $targetReal = realpath($target);
        $linkReal = file_exists($link) ? realpath($link) : false;
        $linked = is_link($link) || ($targetReal && $linkReal && $targetReal === $linkReal);

        return [
            'linked' => (bool) $linked,
            'url' => url('/storage'),
            'message' => $linked
                ? 'public/storage is linked to storage/app/public.'
                : 'Storage symlink was not created, but /storage files are served through the built-in fallback route.',
            'error' => $linked ? null : $error,
        ];
    }

    private function applyLanguages(array $data, Branch $branch): void
    {
        $enabled = $data['enabled_languages'];
        $default = $data['default_language'];

        if (! in_array($default, $enabled, true)) {
            $enabled[] = $default;
        }

        Language::query()->update(['is_active' => false, 'is_default' => false]);
        Language::query()->whereIn('code', $enabled)->update(['is_active' => true]);
        Language::query()->where('code', $default)->update(['is_default' => true, 'is_active' => true]);

        $settings = AppSetting::query()->first();
        $settings?->forceFill(['language' => $default])->save();

        $defaultLanguage = Language::query()->where('code', $default)->first();
        $branch->forceFill([
            'language_id' => $defaultLanguage?->id,
            'enabled_languages' => $enabled,
        ])->save();
    }

    private function createSuperAdmin(array $data, Branch $branch): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => $data['admin_email']],
            [
                'name' => $data['admin_name'],
                'username' => str($data['admin_email'])->before('@')->slug()->value(),
                'password' => Hash::make($data['admin_password']),
                'branch_id' => $branch->id,
                'locale' => $data['default_language'],
                'active' => true,
                'is_system_generated' => false,
            ]
        );

        try {
            if (class_exists(PermissionRegistrar::class)) {
                app(PermissionRegistrar::class)->forgetCachedPermissions();
            }

            // Use the app's configured Role model (App\Models\Role, UUID-keyed)
            // rather than Spatie's base class — they share a table, but the
            // base class's integer key assumptions corrupt the uuid role_id
            // written into model_has_roles via syncRoles().
            $roleClass = config('permission.models.role', Role::class);
            $role = $roleClass::findOrCreate('Super Admin', 'web');
            $user->syncRoles([$role]);
        } catch (Throwable) {
            // Spatie not fully seeded — non-fatal; user still has credentials.
        }
    }

    private function ensurePaymentGateways(): void
    {
        foreach (['stripe', 'paypal', 'razorpay'] as $provider) {
            PaymentGatewaySetting::query()->firstOrCreate(
                ['provider' => $provider],
                [
                    'enabled' => false,
                    'mode' => 'test',
                    'display_name' => ucfirst($provider),
                    'webhook_enabled' => true,
                    'active' => true,
                ]
            );
        }
    }
}
