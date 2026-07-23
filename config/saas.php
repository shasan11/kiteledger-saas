<?php

return [
    'tenant_base_domain' => env('TENANT_BASE_DOMAIN', env('SAAS_BASE_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST))),
    'db_provisioning_mode' => env('TENANT_DB_PROVISIONING_MODE', env('TENANT_DATABASE_PROVISIONING_MODE', 'manual')),
    'allow_database_deletion' => env('TENANT_ALLOW_DATABASE_DELETION', false),
    'provisioning_lock_ttl' => (int) env('TENANT_PROVISIONING_LOCK_TTL', 1800),
    'base_domain' => env('SAAS_BASE_DOMAIN', parse_url((string) env('APP_URL', 'http://localhost'), PHP_URL_HOST)),
    'admin_path' => env('CENTRAL_ADMIN_PATH', 'superadmin'),
    'trusted_proxies' => array_values(array_filter(array_map('trim', explode(',', (string) env('TRUSTED_PROXY_IPS', ''))))),
    'provisioning_queue' => env('TENANT_PROVISIONING_QUEUE', 'provisioning'),
    'provision_sync' => env('TENANT_PROVISION_SYNC', false),
    'allow_uninitialized_tenant_models' => env('SAAS_ALLOW_UNINITIALIZED_TENANT_MODELS', false),
    'grace_period_days' => (int) env('SUBSCRIPTION_GRACE_PERIOD_DAYS', 3),
    'backup_retention_days' => (int) env('SAAS_BACKUP_RETENTION_DAYS', 30),
    'deletion_wait_days' => (int) env('SAAS_DELETION_WAIT_DAYS', 14),
    'database' => [
        'mode' => env('TENANT_DB_PROVISIONING_MODE', env('TENANT_DATABASE_PROVISIONING_MODE', 'manual')),
        'prefix' => env('TENANT_DATABASE_PREFIX', 'tenant_'),
        'cpanel' => [
            'host' => env('CPANEL_HOST'),
            'port' => (int) env('CPANEL_PORT', 2083),
            'username' => env('CPANEL_USERNAME'),
            'token' => env('CPANEL_API_TOKEN'),
            'database_user' => env('CPANEL_DATABASE_USER'),
            'database_password' => env('CPANEL_DATABASE_PASSWORD'),
            'database_prefix' => env('CPANEL_DATABASE_PREFIX'),
        ],
    ],
    'reserved_subdomains' => ['www', 'admin', 'app', 'api', 'mail', 'smtp', 'support', 'help', 'docs', 'billing', 'cdn', 'assets', 'static', 'root', 'system'],
];
