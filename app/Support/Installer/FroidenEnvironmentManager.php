<?php

namespace App\Support\Installer;

use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Http;
use PDO;
use PDOException;
use RuntimeException;
use Throwable;

class FroidenEnvironmentManager extends EnvironmentManager
{
    /** Disable the package's legacy GET endpoint, which exposes DB passwords in URLs. */
    public function saveFile(Request $request)
    {
        return Reply::error('Please submit the installer form using the secure POST action.');
    }

    public function save(Request $request): array
    {
        try {
            $this->ensureDatabaseExists(
                (string) $request->input('hostname'),
                (int) $request->integer('port'),
                (string) $request->input('database'),
                (string) $request->input('username'),
                (string) $request->input('password', ''),
            );

            $mode = (string) $request->input('provisioning_mode');
            $provisioningStatus = match ($mode) {
                'automatic' => $this->testAutomaticProvisioning(
                    (string) $request->input('hostname'),
                    (int) $request->integer('port'),
                    (string) $request->input('database'),
                    (string) $request->input('username'),
                    (string) $request->input('password', ''),
                ),
                'cpanel_uapi' => $this->testCpanel($request),
                default => 'Pool mode selected. Company creation will fail until at least one tenant database is added to the pool.',
            };

            $this->writeEnvironment([
                'APP_URL' => rtrim((string) $request->input('app_url'), '/'),
                'CENTRAL_DOMAINS' => $this->normalizeDomains((string) $request->input('central_domains')),
                'SAAS_BASE_DOMAIN' => strtolower((string) $request->input('saas_base_domain')),
                'DB_CONNECTION' => 'mysql',
                'DB_HOST' => (string) $request->input('hostname'),
                'DB_PORT' => (string) $request->integer('port'),
                'DB_DATABASE' => (string) $request->input('database'),
                'DB_USERNAME' => (string) $request->input('username'),
                'DB_PASSWORD' => (string) $request->input('password', ''),
                'CENTRAL_ADMIN_NAME' => (string) $request->input('admin_name'),
                'CENTRAL_ADMIN_EMAIL' => strtolower((string) $request->input('admin_email')),
                'CENTRAL_ADMIN_PASSWORD' => (string) $request->input('admin_password'),
                'TENANT_DATABASE_PROVISIONING_MODE' => $mode,
                'CPANEL_HOST' => $mode === 'cpanel_uapi' ? rtrim((string) $request->input('cpanel_host'), '/') : '',
                'CPANEL_PORT' => $mode === 'cpanel_uapi' ? (string) $request->integer('cpanel_port') : '2083',
                'CPANEL_USERNAME' => $mode === 'cpanel_uapi' ? (string) $request->input('cpanel_username') : '',
                'CPANEL_API_TOKEN' => $mode === 'cpanel_uapi' ? (string) $request->input('cpanel_api_token') : '',
                'CPANEL_DATABASE_USER' => $mode === 'cpanel_uapi' ? (string) $request->input('cpanel_database_user') : '',
            ]);
            Artisan::call('config:clear');
            session([
                'kiteledger_provisioning_mode' => $mode,
                'kiteledger_provisioning_status' => $provisioningStatus,
                'kiteledger_admin_email' => strtolower((string) $request->input('admin_email')),
            ]);

            return Reply::redirect(
                route('LaravelInstaller::requirements'),
                'Database connection and application settings saved.',
            );
        } catch (PDOException $exception) {
            return Reply::error('Database connection failed: '.$exception->getMessage());
        } catch (RuntimeException $exception) {
            return Reply::error($exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return Reply::error('Could not save the installation settings: '.$exception->getMessage());
        }
    }

    private function ensureDatabaseExists(string $host, int $port, string $database, string $username, string $password): void
    {
        $pdo = new PDO(
            "mysql:host={$host};port={$port};charset=utf8mb4",
            $username,
            $password,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );

        $statement = $pdo->prepare('SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?');
        $statement->execute([$database]);

        if ($statement->fetchColumn() === false) {
            // The controller restricts names to a safe identifier character set.
            try {
                $pdo->exec("CREATE DATABASE `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            } catch (PDOException $exception) {
                throw new RuntimeException('Database could not be created. Create the database manually in cPanel, assign user privileges, then retry.', 0, $exception);
            }
        }

        // Confirm that the supplied account can actually use the selected DB.
        $databasePdo = new PDO(
            "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
            $username,
            $password,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
        );

        $tables = $databasePdo->query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '.$databasePdo->quote($database))->fetchAll(PDO::FETCH_COLUMN);
        if ($tables !== []) {
            $message = in_array('migrations', $tables, true)
                ? 'Recovery required: the database contains Laravel migrations but the install lock is missing. The browser installer will not erase this database.'
                : 'The selected database is not empty. The browser installer will not overwrite existing data. Select an empty database.';
            throw new RuntimeException($message);
        }
    }

    private function testAutomaticProvisioning(string $host, int $port, string $database, string $username, string $password): string
    {
        $pdo = new PDO("mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4", $username, $password, [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION]);
        $probe = substr(preg_replace('/[^A-Za-z0-9_]/', '_', $database).'_kl_probe_'.bin2hex(random_bytes(4)), 0, 64);

        try {
            $pdo->exec("CREATE DATABASE `{$probe}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            $pdo->exec("DROP DATABASE `{$probe}`");
        } catch (PDOException $exception) {
            try {
                $pdo->exec("DROP DATABASE IF EXISTS `{$probe}`");
            } catch (Throwable) {
                // The clear installer error below is safer than exposing SQL details.
            }
            throw new RuntimeException('Automatic company database creation is unavailable because this database user does not have the required CREATE/DROP DATABASE privileges. Choose cPanel UAPI or pool mode.');
        }

        return 'CREATE DATABASE and cleanup privileges tested successfully. Automatic company provisioning is available.';
    }

    private function testCpanel(Request $request): string
    {
        $host = (string) $request->input('cpanel_host');
        $url = parse_url($host, PHP_URL_SCHEME).'://'.parse_url($host, PHP_URL_HOST).':'.$request->integer('cpanel_port').'/execute/Mysql/list_databases';
        $response = Http::acceptJson()->withHeaders([
            'Authorization' => 'cpanel '.$request->input('cpanel_username').':'.$request->input('cpanel_api_token'),
        ])->connectTimeout(10)->timeout(30)->get($url);

        if (! $response->successful() || (int) $response->json('result.status', 0) !== 1) {
            throw new RuntimeException('The cPanel UAPI connection test failed. Verify the host, port, username, API token, and database user.');
        }

        return 'cPanel UAPI connection tested successfully. The API token has been saved and will remain masked.';
    }

    /** @param array<string, string> $values */
    private function writeEnvironment(array $values): void
    {
        $path = base_path('.env');
        $contents = $this->getEnvContent();

        foreach ($values as $key => $value) {
            if (str_contains($value, "\n") || str_contains($value, "\r")) {
                throw new RuntimeException("{$key} cannot contain a line break.");
            }

            $line = $key.'='.$this->encodeValue($value);
            $pattern = '/^'.preg_quote($key, '/').'=.*$/m';
            $contents = preg_match($pattern, $contents)
                ? (string) preg_replace($pattern, $line, $contents, 1)
                : rtrim($contents, "\r\n").PHP_EOL.$line.PHP_EOL;
        }

        if (file_put_contents($path, $contents, LOCK_EX) === false) {
            throw new RuntimeException('The project .env file is not writable.');
        }
    }

    private function encodeValue(string $value): string
    {
        if ($value === '') {
            return '';
        }

        if (preg_match('/^[A-Za-z0-9._:\/@+,-]+$/', $value)) {
            return $value;
        }

        return '"'.str_replace(['\\', '"', '$'], ['\\\\', '\\"', '\\$'], $value).'"';
    }

    private function normalizeDomains(string $domains): string
    {
        return implode(',', array_values(array_unique(array_filter(array_map(
            static fn (string $domain): string => strtolower(trim($domain)),
            explode(',', $domains),
        )))));
    }
}
