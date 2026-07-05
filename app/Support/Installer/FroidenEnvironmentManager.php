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
                'DB_CONNECTION' => 'mysql',
                'DB_HOST' => (string) $request->input('hostname'),
                'DB_PORT' => (string) $request->integer('port'),
                'DB_DATABASE' => (string) $request->input('database'),
                'DB_USERNAME' => (string) $request->input('username'),
                'DB_PASSWORD' => (string) $request->input('password', ''),
                'CENTRAL_ADMIN_NAME' => (string) $request->input('admin_name'),
                'CENTRAL_ADMIN_EMAIL' => strtolower((string) $request->input('admin_email')),
                'CENTRAL_ADMIN_PASSWORD' => (string) $request->input('admin_password'),
            ]);
            Artisan::call('config:clear');

            return Reply::redirect(
                route('LaravelInstaller::requirements'),
                'Database connection and application settings saved.',
            );
        } catch (PDOException $exception) {
            return Reply::error('Database connection failed: '.$exception->getMessage());
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
            $pdo->exec("CREATE DATABASE `{$database}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        }

        // Confirm that the supplied account can actually use the selected DB.
        new PDO(
            "mysql:host={$host};port={$port};dbname={$database};charset=utf8mb4",
            $username,
            $password,
            [PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION],
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
