<?php

namespace App\Http\Controllers\Install;

use App\Http\Controllers\Controller;
use App\Models\AppSetting;
use App\Models\ChequeFormatConfiguration;
use App\Models\Currency;
use App\Models\FiscalYear;
use App\Models\PaymentGatewaySetting;
use App\Models\User;
use App\Support\Installer\EnvWriter;
use App\Support\Installer\InstalledState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use PDO;
use Throwable;

class InstallController extends Controller
{
    public function index()
    {
        return view('install.index');
    }

    /**
     * Server requirement checks.
     */
    public function requirements()
    {
        $extensions = ['pdo', 'mbstring', 'openssl', 'tokenizer', 'json', 'curl', 'fileinfo', 'ctype', 'xml', 'bcmath'];

        $checks = [
            ['key' => 'php', 'label' => 'PHP >= 8.3', 'passed' => version_compare(PHP_VERSION, '8.3.0', '>='), 'hint' => 'Current: ' . PHP_VERSION],
        ];

        foreach ($extensions as $ext) {
            $checks[] = ['key' => "ext_$ext", 'label' => "PHP ext: $ext", 'passed' => extension_loaded($ext), 'hint' => ''];
        }

        $writable = [
            'storage' => storage_path(),
            'bootstrap/cache' => base_path('bootstrap/cache'),
            '.env (project root)' => base_path(),
        ];

        foreach ($writable as $label => $path) {
            $checks[] = ['key' => 'writable_' . $label, 'label' => "Writable: $label", 'passed' => is_writable($path), 'hint' => $path];
        }

        return response()->json([
            'passed' => collect($checks)->every(fn ($c) => $c['passed']),
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
            return response()->json(['success' => false, 'message' => 'Connection failed: ' . $e->getMessage()], 422);
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
            'admin_name' => ['required', 'string', 'max:120'],
            'admin_email' => ['required', 'email', 'max:180'],
            'admin_password' => ['required', 'string', 'min:8', 'confirmed'],
        ])->validate();

        // Verify DB connectivity before touching the filesystem.
        try {
            $this->makePdo($db);
        } catch (Throwable $e) {
            return response()->json(['success' => false, 'message' => 'Database connection failed: ' . $e->getMessage()], 422);
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

            // 3. Migrate + seed.
            Artisan::call('migrate', ['--force' => true]);
            Artisan::call('db:seed', ['--force' => true]);

            // 4. Apply installer-specific data.
            $currency = $this->ensureCurrency($data);
            $fiscalYear = FiscalYear::query()->where('is_current', true)->first()
                ?? FiscalYear::query()->where('active', true)->orderByDesc('created_at')->first();

            $this->applyCompanySettings($data, $currency, $fiscalYear);
            $this->createSuperAdmin($data);
            $this->ensurePaymentGateways();
            ChequeFormatConfiguration::activeDefault();

            // 5. Lock.
            InstalledState::mark();
        } catch (Throwable $e) {
            // Do not mark installed on failure; surface a readable error.
            return response()->json([
                'success' => false,
                'message' => 'Installation failed: ' . $e->getMessage(),
            ], 500);
        }

        return response()->json(['success' => true, 'message' => 'Installation complete.', 'login_url' => url('/login')]);
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
            if (!str_starts_with($path, '/') && !preg_match('/^[A-Za-z]:/', $path)) {
                $path = base_path($path);
            }
            if (!is_file($path)) {
                @touch($path);
            }
            return new PDO('sqlite:' . $path);
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

        if (!$currency) {
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
        $settings = AppSetting::query()->first() ?? new AppSetting();

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

    private function createSuperAdmin(array $data): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => $data['admin_email']],
            [
                'name' => $data['admin_name'],
                'username' => str($data['admin_email'])->before('@')->slug()->value(),
                'password' => Hash::make($data['admin_password']),
                'active' => true,
                'is_system_generated' => false,
            ]
        );

        try {
            $roleClass = \Spatie\Permission\Models\Role::class;
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
