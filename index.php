<?php

use Illuminate\Foundation\Application;
use Illuminate\Http\Request;

define('LARAVEL_START', microtime(true));

if (require __DIR__.'/bootstrap/first-boot.php' !== true) {
    http_response_code(500);
    header('Content-Type: text/plain; charset=UTF-8');
    exit("KiteLedger could not create .env. Make the application root writable, then reload /install.\n");
}

if (file_exists($maintenance = __DIR__.'/storage/framework/maintenance.php')) {
    require $maintenance;
}

require __DIR__.'/vendor/autoload.php';

/** @var Application $app */
$app = require_once __DIR__.'/bootstrap/app.php';

$app->handleRequest(Request::capture());
