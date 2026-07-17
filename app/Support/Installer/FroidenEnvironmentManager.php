<?php

namespace App\Support\Installer;

use App\Services\SaaS\DatabaseProvisioning\CpanelIdentifierNormalizer;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Crypt;
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
                default => 'Pool mode selected. The initial tenant database will be validated and registered after central migrations complete.',
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
                'CPANEL_DATABASE_PASSWORD' => $mode === 'cpanel_uapi' ? (string) $request->input('cpanel_database_password', '') : '',
                'QUEUE_CONNECTION' => 'central',
                'DB_QUEUE_CONNECTION' => 'mysql',
                'DB_QUEUE_RETRY_AFTER' => '330',
            ]);
            Artisan::call('config:clear');
            $poolPayload = null;
            if ($mode === 'pool') {
                $poolPayload = Crypt::encryptString(json_encode($this->poolDatabases($request), JSON_THROW_ON_ERROR));
            }
            session([
                'kiteledger_provisioning_mode' => $mode,
                'kiteledger_provisioning_status' => $provisioningStatus,
                'kiteledger_admin_email' => strtolower((string) $request->input('admin_email')),
                'kiteledger_initial_pool_databases' => $poolPayload,
            ]);

            return Reply::redirect(
                route('LaravelInstaller::requirements'),
                'Database connection and application settings saved.',
            );
        } catch (PDOException $exception) {
            report($exception);

            return Reply::error('Database connection failed. Verify the central database host, name, username, password, and privileges.');
        } catch (RuntimeException $exception) {
            return Reply::error($exception->getMessage());
        } catch (Throwable $exception) {
            report($exception);

            return Reply::error('Could not save the installation settings. Check the application log for details, then retry.');
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
        $baseUrl = parse_url($host, PHP_URL_SCHEME).'://'.parse_url($host, PHP_URL_HOST).':'.$request->integer('cpanel_port').'/execute/';
        $account = (string) $request->input('cpanel_username');
        $normalizer = app(CpanelIdentifierNormalizer::class);
        $database = $normalizer->normalizeDatabase('klprobe_'.bin2hex(random_bytes(4)), $account);
        $databaseUser = $normalizer->normalizeUser((string) $request->input('cpanel_database_user'), $account);
        $headers = [
            'Authorization' => 'cpanel '.$request->input('cpanel_username').':'.$request->input('cpanel_api_token'),
        ];

        try {
            $this->cpanelCall($baseUrl, $headers, 'Mysql/create_database', ['name' => $database]);
            $this->cpanelCall($baseUrl, $headers, 'Mysql/set_privileges_on_database', [
                'database' => $database,
                'user' => $databaseUser,
                'privileges' => 'ALL PRIVILEGES',
            ]);
            $databasePassword = (string) $request->input('cpanel_database_password', '');
            if ($databasePassword === '' && $databaseUser === (string) $request->input('username')) {
                $databasePassword = (string) $request->input('password', '');
            }
            new PDO(
                'mysql:host='.(string) $request->input('hostname').';port='.(int) $request->integer('port').';dbname='.$database.';charset=utf8mb4',
                $databaseUser,
                $databasePassword,
                [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
            );
        } catch (Throwable $exception) {
            try {
                $this->cpanelCall($baseUrl, $headers, 'Mysql/delete_database', ['name' => $database]);
            } catch (Throwable) {
                //
            }
            throw new RuntimeException('The cPanel UAPI workflow test failed. Verify token permissions, database user privileges, host, and password.');
        }

        try {
            $this->cpanelCall($baseUrl, $headers, 'Mysql/delete_database', ['name' => $database]);
        } catch (Throwable) {
            throw new RuntimeException('The cPanel probe database was created but cleanup failed. Remove it from cPanel before retrying.');
        }

        return 'cPanel UAPI create, grant, connect, and cleanup workflow tested successfully.';
    }

    /** @param array<string, string> $headers */
    private function cpanelCall(string $baseUrl, array $headers, string $operation, array $query): array
    {
        $response = Http::acceptJson()->withHeaders($headers)->connectTimeout(10)->timeout(30)->get($baseUrl.$operation, $query);
        if (! $response->successful() || (int) $response->json('result.status', 0) !== 1) {
            throw new RuntimeException('cpanel_request_failed');
        }

        return (array) $response->json('result', []);
    }

    /** @return array<int, array{database_name:string,username:string,password:string}> */
    private function poolDatabases(Request $request): array
    {
        $rows = $request->input('pool_databases');
        if (! is_array($rows) || $rows === []) {
            $rows = [[
                'database_name' => $request->input('pool_database_name'),
                'username' => $request->input('pool_database_username', ''),
                'password' => $request->input('pool_database_password', ''),
            ]];
        }

        return collect($rows)
            ->map(fn (array $row): array => [
                'database_name' => trim((string) ($row['database_name'] ?? '')),
                'username' => trim((string) ($row['username'] ?? '')),
                'password' => (string) ($row['password'] ?? ''),
            ])
            ->filter(fn (array $row): bool => $row['database_name'] !== '')
            ->values()
            ->all();
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
