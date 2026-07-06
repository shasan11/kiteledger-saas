<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Server Requirements
    |--------------------------------------------------------------------------
    |
    | This is the default Laravel server requirements, you can add as many
    | as your application require, we check if the extension is enabled
    | by looping through the array and run "extension_loaded" on it.
    |
    */
    'core' => [
        'minPhpVersion' => '8.3.0'
    ],

    'requirements' => [
        'pdo',
        'mbstring',
        'openssl',
        'tokenizer',
        'json',
        'curl',
        'fileinfo',
        'ctype',
        'xml',
        'bcmath',
    ],

    /*
    |--------------------------------------------------------------------------
    | Folders Permissions
    |--------------------------------------------------------------------------
    |
    | This is the default Laravel folders permissions, if your application
    | requires more permissions just add them to the array list bellow.
    |
    */
    'permissions' => [
        './'                     => '775',
        'storage/app/'           => '775',
        'storage/framework/'     => '775',
        'storage/framework/cache/' => '775',
        'storage/framework/sessions/' => '775',
        'storage/framework/views/' => '775',
        'storage/logs/'          => '775',
        'bootstrap/cache/'       => '775'
    ]
];
