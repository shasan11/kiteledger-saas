<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

// A marketplace installation must boot even when the uploaded archive did not
// contain the normally git-ignored .env file.
if (require __DIR__.'/../bootstrap/first-boot.php' !== true) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    exit("KiteLedger could not create .env. Make the application root writable, then reload /install.\n");
}

// Determine if the application is in maintenance mode...
if (file_exists($maintenance = __DIR__.'/../storage/framework/maintenance.php')) {
    require $maintenance;
}

// Register the Composer autoloader...
if (! is_file(__DIR__.'/../vendor/autoload.php')) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    exit("Vendor dependencies are missing. Upload the marketplace package, not the GitHub source ZIP.\n");
}
require __DIR__.'/../vendor/autoload.php';

// Bootstrap Laravel and handle the request...
/** @var Application $app */
$app = require_once __DIR__.'/../bootstrap/app.php';

$app->handleRequest(Request::capture());
