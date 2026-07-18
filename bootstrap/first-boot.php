<?php

/**
 * Create the minimum Laravel environment before Composer or the framework boot.
 *
 * This file intentionally has no framework dependencies. Marketplace customers
 * can upload the application and visit /install without manually creating .env.
 */
$basePath = dirname(__DIR__);
$environmentPath = $basePath.DIRECTORY_SEPARATOR.'.env';
$examplePath = $basePath.DIRECTORY_SEPARATOR.'.env.example';
$environmentExists = is_file($environmentPath);

// Some LiteSpeed/cPanel configurations execute web PHP under a different
// group from the shell user that extracted the package. The root .htaccess
// blocks HTTP access to dotfiles, so 0644 remains safe while ensuring PHP can
// read the generated environment on those hosts.
if ($environmentExists) {
    @chmod($environmentPath, 0644);
}

$contents = $environmentExists
    ? file_get_contents($environmentPath)
    : (is_file($examplePath) ? file_get_contents($examplePath) : false);

if ($contents === false) {
    $contents = implode(PHP_EOL, [
        'APP_NAME=KiteLedger',
        'APP_ENV=production',
        'APP_KEY=',
        'APP_DEBUG=false',
        'APP_URL=http://localhost',
        'DB_CONNECTION=mysql',
        'DB_HOST=127.0.0.1',
        'DB_PORT=3306',
        'DB_DATABASE=kiteledger',
        'DB_USERNAME=root',
        'DB_PASSWORD=',
        '',
    ]);
}

$setValue = static function (string $source, string $key, string $value): string {
    $line = $key.'='.$value;
    $pattern = '/^'.preg_quote($key, '/').'=.*$/m';

    return preg_match($pattern, $source)
        ? (string) preg_replace($pattern, $line, $source, 1)
        : rtrim($source, "\r\n").PHP_EOL.$line.PHP_EOL;
};

$getValue = static function (string $source, string $key): string {
    if (! preg_match('/^'.preg_quote($key, '/').'=(.*)$/m', $source, $matches)) {
        return '';
    }

    return trim(trim($matches[1]), "\"'");
};

$originalContents = $contents;
$hasLock = is_file($basePath.'/storage/installed') || is_file($basePath.'/storage/app/installed');
$originalKeyMissing = $getValue($contents, 'APP_KEY') === '';

if ($getValue($contents, 'APP_KEY') === '') {
    try {
        $contents = $setValue($contents, 'APP_KEY', 'base64:'.base64_encode(random_bytes(32)));
    } catch (Throwable) {
        return false;
    }
}

$database = $getValue($contents, 'DB_DATABASE');
$username = $getValue($contents, 'DB_USERNAME');
$password = $getValue($contents, 'DB_PASSWORD');
$configurationValid = $getValue($contents, 'APP_KEY') !== ''
    && $database !== ''
    && strtolower($database) !== 'laravel'
    && $username !== ''
    && ! (strtolower($username) === 'root' && $password === '');
$recoveryMarker = $basePath.'/storage/app/install/recovery-required';
$needsRecovery = $hasLock && (! $environmentExists || $originalKeyMissing || ! $configurationValid);
if ($needsRecovery) {
    $contents = $setValue($contents, 'INSTALL_RECOVERY_REQUIRED', 'true');
    $recoveryDirectory = dirname($recoveryMarker);
    if ((is_dir($recoveryDirectory) || @mkdir($recoveryDirectory, 0775, true)) && is_writable($recoveryDirectory)) {
        @file_put_contents($recoveryMarker, 'recovery_required_at='.date('c').PHP_EOL, LOCK_EX);
    }
}
$recoveryFlag = filter_var($getValue($contents, 'INSTALL_RECOVERY_REQUIRED'), FILTER_VALIDATE_BOOL);
$installed = $hasLock && $configurationValid && ! $needsRecovery && ! $recoveryFlag && ! is_file($recoveryMarker);

if (! $installed) {
    $contents = $setValue($contents, 'APP_ENV', 'production');
    $contents = $setValue($contents, 'APP_DEBUG', 'false');

    // Nothing may depend on migrated tables until the wizard has finished.
    $contents = $setValue($contents, 'SESSION_DRIVER', 'file');
    $contents = $setValue($contents, 'CACHE_STORE', 'file');
    $contents = $setValue($contents, 'QUEUE_CONNECTION', 'sync');

    if (in_array(strtolower($getValue($contents, 'DB_CONNECTION')), ['', 'sqlite'], true)) {
        $contents = $setValue($contents, 'DB_CONNECTION', 'mysql');
    }

    foreach ([
        'DB_HOST' => '127.0.0.1',
        'DB_PORT' => '3306',
        'DB_DATABASE' => 'kiteledger',
        'DB_USERNAME' => 'root',
        'DB_PASSWORD' => '',
    ] as $key => $default) {
        if ($getValue($contents, $key) === '') {
            $contents = $setValue($contents, $key, $default);
        }
    }
    if (strtolower($getValue($contents, 'DB_DATABASE')) === 'laravel') {
        $contents = $setValue($contents, 'DB_DATABASE', 'kiteledger');
    }

    // A packaged config/route cache can retain an empty key or SQLite defaults
    // and prevent Laravel from seeing the environment created above. Do not
    // delete packages.php or services.php here; Laravel needs them during boot
    // and rebuilding them while the dev server serves concurrent requests can
    // fail on locked shared filesystems.
    foreach (['config.php', 'routes-v7.php'] as $cacheFile) {
        $cachePath = $basePath.'/bootstrap/cache/'.$cacheFile;
        if (is_file($cachePath)) {
            @unlink($cachePath);
        }
    }
}

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
if (! $installed && $host !== '' && preg_match('/^[A-Za-z0-9.:-]+$/', $host)) {
    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
    $forwardedProto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    $scheme = ($https !== '' && $https !== 'off') || $forwardedProto === 'https' ? 'https' : 'http';
    $currentUrl = $getValue($contents, 'APP_URL');
    $domain = strtolower((string) preg_replace('/:\d+$/', '', $host));

    if (! $environmentExists || in_array(strtolower($currentUrl), ['', 'http://localhost', 'https://example.com', 'http://example.com'], true)) {
        $contents = $setValue($contents, 'APP_URL', $scheme.'://'.$host);
    }
    if (! $environmentExists || in_array(strtolower($getValue($contents, 'CENTRAL_DOMAINS')), ['', 'example.com', 'example.com,www.example.com'], true)) {
        $contents = $setValue($contents, 'CENTRAL_DOMAINS', $domain);
    }
    if (! $environmentExists || in_array(strtolower($getValue($contents, 'SAAS_BASE_DOMAIN')), ['', 'example.com'], true)) {
        $contents = $setValue($contents, 'SAAS_BASE_DOMAIN', $domain);
    }
}

if ($environmentExists) {
    if ($contents === $originalContents) {
        return true;
    }

    if (@file_put_contents($environmentPath, $contents, LOCK_EX) === false) {
        return false;
    }

    @chmod($environmentPath, 0644);

    return true;
}

// Exclusive creation prevents concurrent first requests from overwriting one
// another. If another request won the race, its complete .env is accepted.
$handle = @fopen($environmentPath, 'x+b');
if ($handle === false) {
    return is_file($environmentPath);
}

$written = false;
try {
    if (flock($handle, LOCK_EX)) {
        $length = strlen($contents);
        $offset = 0;

        while ($offset < $length) {
            $bytes = fwrite($handle, substr($contents, $offset));
            if ($bytes === false || $bytes === 0) {
                break;
            }
            $offset += $bytes;
        }

        fflush($handle);
        $written = $offset === $length;
        flock($handle, LOCK_UN);
    }
} finally {
    fclose($handle);
}

if (! $written) {
    @unlink($environmentPath);

    return false;
}

@chmod($environmentPath, 0644);

return true;
