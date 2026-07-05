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
$installed = is_file($basePath.'/storage/installed') || is_file($basePath.'/storage/app/installed');

if ($getValue($contents, 'APP_KEY') === '') {
    try {
        $contents = $setValue($contents, 'APP_KEY', 'base64:'.base64_encode(random_bytes(32)));
    } catch (Throwable) {
        return false;
    }
}

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

    // A packaged config cache can retain an empty key or SQLite defaults and
    // prevent Laravel from seeing the environment created above.
    $configCache = $basePath.'/bootstrap/cache/config.php';
    if (is_file($configCache)) {
        @unlink($configCache);
    }
}

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
if (! $installed && $host !== '' && preg_match('/^[A-Za-z0-9.:-]+$/', $host)) {
    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
    $forwardedProto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    $scheme = ($https !== '' && $https !== 'off') || $forwardedProto === 'https' ? 'https' : 'http';
    $contents = $setValue($contents, 'APP_URL', $scheme.'://'.$host);

    $domain = strtolower((string) preg_replace('/:\d+$/', '', $host));
    $contents = $setValue($contents, 'CENTRAL_DOMAINS', $domain);
    $contents = $setValue($contents, 'SAAS_BASE_DOMAIN', $domain);
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
