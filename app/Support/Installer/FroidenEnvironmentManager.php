<?php

namespace App\Support\Installer;

use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\Reply;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;
use PDO;
use PDOException;
use RuntimeException;
use Throwable;

class FroidenEnvironmentManager extends EnvironmentManager
{
    private const DATABASE_CONNECT_TIMEOUT_SECONDS = 5;

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

            $this->writeEnvironment([
                'APP_URL' => rtrim((string) $request->input('app_url'), '/'),
                'CENTRAL_DOMAINS' => $this->normalizeDomains((string) $request->input('central_domains')),
                'SAAS_BASE_DOMAIN' => strtolower((string) $request->input('saas_base_domain')),
                'TENANT_BASE_DOMAIN' => strtolower((string) $request->input('saas_base_domain')),
                'DB_CONNECTION' => 'central',
                'DB_DRIVER' => 'mysql',
                'DB_HOST' => (string) $request->input('hostname'),
                'DB_PORT' => (string) $request->integer('port'),
                'DB_DATABASE' => (string) $request->input('database'),
                'DB_USERNAME' => (string) $request->input('username'),
                'DB_PASSWORD' => (string) $request->input('password', ''),
                'CENTRAL_ADMIN_NAME' => (string) $request->input('admin_name'),
                'CENTRAL_ADMIN_EMAIL' => strtolower((string) $request->input('admin_email')),
                'CENTRAL_ADMIN_PASSWORD' => (string) $request->input('admin_password'),
                'TENANT_DB_PROVISIONING_MODE' => 'manual',
                'TENANT_DATABASE_PROVISIONING_MODE' => 'manual',
                'QUEUE_CONNECTION' => 'central',
                'DB_QUEUE_CONNECTION' => 'central',
                'DB_QUEUE_RETRY_AFTER' => '330',
            ]);
            Artisan::call('config:clear');
            session([
                'kiteledger_admin_email' => strtolower((string) $request->input('admin_email')),
            ]);
            InstalledState::putInstallerStatus([
                'admin_email' => strtolower((string) $request->input('admin_email')),
                'environment_saved_at' => now()->toIso8601String(),
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
        $this->assertDatabaseEndpointReachable($host, $port);

        $pdo = new PDO(
            "mysql:host={$host};port={$port};charset=utf8mb4",
            $username,
            $password,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => self::DATABASE_CONNECT_TIMEOUT_SECONDS,
            ],
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
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_TIMEOUT => self::DATABASE_CONNECT_TIMEOUT_SECONDS,
            ],
        );

        $tables = $databasePdo->query('SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = '.$databasePdo->quote($database))->fetchAll(PDO::FETCH_COLUMN);
        if ($tables !== []) {
            $message = in_array('migrations', $tables, true)
                ? 'Recovery required: the database contains Laravel migrations but the install lock is missing. The browser installer will not erase this database.'
                : 'The selected database is not empty. The browser installer will not overwrite existing data. Select an empty database.';
            throw new RuntimeException($message);
        }
    }

    private function assertDatabaseEndpointReachable(string $host, int $port): void
    {
        $socketHost = filter_var($host, FILTER_VALIDATE_IP, FILTER_FLAG_IPV6) ? "[{$host}]" : $host;
        $socket = @stream_socket_client(
            "tcp://{$socketHost}:{$port}",
            $errorCode,
            $errorMessage,
            self::DATABASE_CONNECT_TIMEOUT_SECONDS,
            STREAM_CLIENT_CONNECT,
        );

        if (is_resource($socket)) {
            fclose($socket);

            return;
        }

        throw new RuntimeException(
            "Could not reach MySQL at {$host}:{$port}. Confirm that MySQL is running and that the database host and port are correct.",
        );
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
