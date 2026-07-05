<?php

/**
 * Create the minimum Laravel environment before Composer or the framework boot.
 *
 * This file intentionally has no framework dependencies. Marketplace customers
 * can upload the application and visit /install without manually creating .env.
 */
$basePath = dirname(__DIR__);
$environmentPath = $basePath.DIRECTORY_SEPARATOR.'.env';

if (is_file($environmentPath)) {
    return true;
}

$examplePath = $basePath.DIRECTORY_SEPARATOR.'.env.example';
$contents = is_file($examplePath) ? file_get_contents($examplePath) : false;

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

try {
    $key = 'base64:'.base64_encode(random_bytes(32));
} catch (Throwable) {
    return false;
}

$contents = $setValue($contents, 'APP_KEY', $key);
$contents = $setValue($contents, 'APP_ENV', 'production');
$contents = $setValue($contents, 'APP_DEBUG', 'false');

$host = (string) ($_SERVER['HTTP_HOST'] ?? '');
if ($host !== '' && preg_match('/^[A-Za-z0-9.:-]+$/', $host)) {
    $https = strtolower((string) ($_SERVER['HTTPS'] ?? ''));
    $forwardedProto = strtolower(trim(explode(',', (string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? ''))[0]));
    $scheme = ($https !== '' && $https !== 'off') || $forwardedProto === 'https' ? 'https' : 'http';
    $contents = $setValue($contents, 'APP_URL', $scheme.'://'.$host);
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

@chmod($environmentPath, 0640);

return true;
