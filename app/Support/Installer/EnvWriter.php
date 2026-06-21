<?php

namespace App\Support\Installer;

use RuntimeException;

class EnvWriter
{
    /**
     * Write a fresh .env file from the installer inputs.
     *
     * @param  array<string, string>  $v
     */
    public static function write(array $v): string
    {
        $appKey = $v['APP_KEY'] ?? self::generateKey();
        $appName = self::quote($v['APP_NAME'] ?? 'KiteLedger');
        $appUrl = $v['APP_URL'] ?? 'http://localhost';
        $timezone = $v['APP_TIMEZONE'] ?? 'UTC';

        $conn = $v['DB_CONNECTION'] ?? 'mysql';
        $dbPassword = self::quote($v['DB_PASSWORD'] ?? '');

        $env = <<<ENV
APP_NAME={$appName}
APP_ENV=production
APP_KEY={$appKey}
APP_DEBUG=false
APP_URL={$appUrl}
APP_TIMEZONE={$timezone}

APP_LOCALE=en
APP_FALLBACK_LOCALE=en
APP_FAKER_LOCALE=en_US

APP_MAINTENANCE_DRIVER=file

BCRYPT_ROUNDS=12

LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=error

DB_CONNECTION={$conn}
DB_HOST={$v['DB_HOST']}
DB_PORT={$v['DB_PORT']}
DB_DATABASE={$v['DB_DATABASE']}
DB_USERNAME={$v['DB_USERNAME']}
DB_PASSWORD={$dbPassword}

SESSION_DRIVER=file
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

BROADCAST_CONNECTION=log
FILESYSTEM_DISK=local
QUEUE_CONNECTION=sync
CACHE_STORE=file

MAIL_MAILER=log
MAIL_FROM_ADDRESS="hello@example.com"
MAIL_FROM_NAME=\${APP_NAME}

VITE_APP_NAME=\${APP_NAME}
# Leave blank so the frontend resolves storage/asset URLs relative to this
# domain — works on root domains, subfolders and CDNs alike. Only set this
# if the API is served from a different origin than the frontend.
VITE_APP_BACKEND_URL=

PRISM_REQUEST_TIMEOUT=120
AI_SSL_VERIFY=false

ENV;

        self::writeFile(base_path('.env'), $env);

        return $appKey;
    }

    public static function generateKey(): string
    {
        return 'base64:'.base64_encode(random_bytes(32));
    }

    private static function quote(string $value): string
    {
        if ($value === '') {
            return '';
        }

        // Wrap in quotes when the value contains characters that break dotenv parsing.
        if (preg_match('/\s|#|"|\'|=/', $value)) {
            return '"'.str_replace('"', '\"', $value).'"';
        }

        return $value;
    }

    private static function writeFile(string $path, string $contents): void
    {
        $directory = dirname($path);

        if (! is_dir($directory)) {
            throw new RuntimeException("The application directory does not exist: {$directory}");
        }

        if (is_file($path) && ! is_writable($path)) {
            throw new RuntimeException("The .env file is not writable: {$path}");
        }

        if (! is_file($path) && ! is_writable($directory)) {
            throw new RuntimeException("The application directory is not writable, so .env cannot be created: {$directory}");
        }

        $bytes = @file_put_contents($path, $contents, LOCK_EX);

        if ($bytes === false || $bytes < strlen($contents)) {
            $error = error_get_last()['message'] ?? 'unknown write error';

            throw new RuntimeException("Could not write .env at {$path}: {$error}");
        }
    }
}
