<?php

namespace App\Console\Commands;

use App\Http\Controllers\Install\InstallController;
use App\Support\Installer\InstalledState;
use Illuminate\Console\Command;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Terminal installer for VPS / FastPanel deployments.
 *
 * Runs the SAME pipeline as the web installer (/install) — it just feeds the
 * inputs to InstallController::run() from the command line, where there is no
 * HTTP request timeout to abort a long migrate + seed. Use this instead of the
 * browser when installing over SSH.
 *
 * Non-interactive example:
 *   php artisan kiteledger:install \
 *     --db-database=kiteledger --db-username=kl --db-password=secret \
 *     --company="Acme Inc" --branch="Head Office" \
 *     --admin-name="Owner" --admin-email=owner@acme.com --admin-password=Str0ngPass \
 *     --no-interaction
 */
class InstallCommand extends Command
{
    protected $signature = 'kiteledger:install
        {--db-connection=mysql : Database driver: mysql, mariadb, pgsql or sqlite}
        {--db-host=127.0.0.1}
        {--db-port=3306}
        {--db-database=}
        {--db-username=}
        {--db-password=}
        {--app-name=}
        {--app-url=}
        {--timezone=UTC}
        {--currency=USD}
        {--company=}
        {--branch=Head Office}
        {--admin-name=}
        {--admin-email=}
        {--admin-password=}';

    protected $description = 'Install KiteLedger from the terminal (DB migrate, seed, admin, install lock).';

    public function handle(InstallController $controller): int
    {
        if (! is_file(base_path('vendor/autoload.php'))) {
            $this->error('vendor/ is missing. Run: composer install --no-dev --optimize-autoloader');

            return self::FAILURE;
        }

        if (InstalledState::isInstalled()) {
            $this->warn('KiteLedger is already installed (storage/app/installed exists).');
            $this->line('Delete storage/app/installed first if you really want to reinstall.');

            return self::FAILURE;
        }

        $this->info('KiteLedger terminal installer');
        $this->line('-----------------------------');

        $interactive = $this->input->isInteractive() && ! $this->option('no-interaction');

        $payload = $this->gather($interactive);

        if ($payload === null) {
            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Running migrations and seeders (this can take a minute)...');

        try {
            $request = Request::create('/install/run', 'POST', $payload);
            $response = $controller->run($request);
        } catch (ValidationException $e) {
            $this->error('Invalid input:');
            foreach ($e->errors() as $field => $messages) {
                $this->line("  - {$field}: ".implode(' ', $messages));
            }

            return self::FAILURE;
        } catch (Throwable $e) {
            $this->error('Installation failed: '.$e->getMessage());

            return self::FAILURE;
        }

        $data = json_decode($response->getContent(), true) ?: [];

        if (! ($data['success'] ?? false)) {
            $this->error($data['message'] ?? 'Installation failed.');

            return self::FAILURE;
        }

        $this->newLine();
        $this->info('Installation complete.');
        $this->line('Login at: '.($data['login_url'] ?? url('/login')));
        $this->newLine();
        $this->line('Optional production speed-up (run only AFTER confirming login works):');
        $this->line('  php artisan optimize');

        return self::SUCCESS;
    }

    /**
     * Build the /install/run payload from options, prompting for anything
     * required that was not supplied.
     *
     * @return array<string, mixed>|null
     */
    private function gather(bool $interactive): ?array
    {
        $conn = $this->option('db-connection') ?: 'mysql';

        $required = [
            'db-database' => 'Database name',
            'company' => 'Company name',
            'admin-name' => 'Administrator name',
            'admin-email' => 'Administrator email',
        ];

        // For non-sqlite, a DB username is required too.
        if ($conn !== 'sqlite') {
            $required['db-username'] = 'Database username';
        }

        $values = [];

        foreach ($required as $opt => $label) {
            $value = $this->option($opt);

            if (! $value && $interactive) {
                $value = $this->ask($label);
            }

            if (! $value) {
                $this->error("Missing required value: --{$opt} ({$label}).");

                return null;
            }

            $values[$opt] = $value;
        }

        // Password: option, else prompt (hidden), else fail.
        $password = $this->option('admin-password');
        if (! $password && $interactive) {
            $password = $this->secret('Administrator password (min 8 chars)');
        }
        if (! $password || strlen($password) < 8) {
            $this->error('Administrator password is required and must be at least 8 characters (--admin-password).');

            return null;
        }

        $dbPassword = $this->option('db-password');
        if ($dbPassword === null && $interactive && $conn !== 'sqlite') {
            $dbPassword = $this->secret('Database password (leave blank if none)') ?? '';
        }

        return [
            'db_connection' => $conn,
            'db_host' => $this->option('db-host') ?: '127.0.0.1',
            'db_port' => $this->option('db-port') ?: ($conn === 'pgsql' ? '5432' : '3306'),
            'db_database' => $values['db-database'],
            'db_username' => $values['db-username'] ?? '',
            'db_password' => $dbPassword ?? '',
            'app_name' => $this->option('app-name') ?: $values['company'],
            'app_url' => $this->option('app-url') ?: rtrim((string) config('app.url'), '/'),
            'timezone' => $this->option('timezone') ?: 'UTC',
            'currency_code' => $this->option('currency') ?: 'USD',
            'company_name' => $values['company'],
            'branch_name' => $this->option('branch') ?: 'Head Office',
            'admin_name' => $values['admin-name'],
            'admin_email' => $values['admin-email'],
            'admin_password' => $password,
            'admin_password_confirmation' => $password,
        ];
    }
}
