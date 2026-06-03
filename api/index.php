<?php

$source = __DIR__ . '/../database/database.sqlite';
$target = '/tmp/database.sqlite';

if (! file_exists($target)) {
    if (file_exists($source)) {
        copy($source, $target);
    } else {
        touch($target);
    }
}

require __DIR__ . '/../public/index.php';
