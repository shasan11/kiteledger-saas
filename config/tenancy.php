<?php

declare(strict_types=1);

use App\Models\Domain;
use App\Models\Tenant;
use Stancl\Tenancy\Bootstrappers\CacheTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\DatabaseTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\FilesystemTenancyBootstrapper;
use Stancl\Tenancy\Bootstrappers\QueueTenancyBootstrapper;
use Stancl\Tenancy\TenantDatabaseManagers\MySQLDatabaseManager;
use Stancl\Tenancy\TenantDatabaseManagers\PostgreSQLDatabaseManager;
use Stancl\Tenancy\TenantDatabaseManagers\SQLiteDatabaseManager;
use Stancl\Tenancy\UUIDGenerator;

return [
    'tenant_model' => Tenant::class,
    'id_generator' => UUIDGenerator::class,
    'domain_model' => Domain::class,
    'central_domains' => array_values(array_filter(array_map('trim', explode(',', (string) env('CENTRAL_DOMAINS', '127.0.0.1,localhost'))))),
    'bootstrappers' => [
        DatabaseTenancyBootstrapper::class,
        CacheTenancyBootstrapper::class,
        FilesystemTenancyBootstrapper::class,
        QueueTenancyBootstrapper::class,
    ],
    'database' => [
        'central_connection' => env('DB_CONNECTION', 'central'),
        'template_tenant_connection' => env('TENANT_DB_TEMPLATE_CONNECTION', 'tenant_template'),
        'prefix' => env('TENANT_DATABASE_PREFIX', env('TENANT_DB_PREFIX', 'tenant_')),
        'suffix' => env('TENANT_DB_SUFFIX', ''),
        'managers' => [
            'sqlite' => SQLiteDatabaseManager::class,
            'mysql' => MySQLDatabaseManager::class,
            'mariadb' => MySQLDatabaseManager::class,
            'pgsql' => PostgreSQLDatabaseManager::class,
        ],
    ],
    'cache' => ['tag_base' => 'tenant'],
    'filesystem' => [
        'suffix_base' => 'tenant',
        'disks' => ['local', 'public'],
        'root_override' => ['local' => '%storage_path%/app/', 'public' => '%storage_path%/app/public/'],
        'suffix_storage_path' => true,
        'asset_helper_tenancy' => false,
    ],
    'redis' => ['prefix_base' => 'tenant', 'prefixed_connections' => []],
    'features' => [],
    'routes' => true,
    'migration_parameters' => ['--force' => true, '--path' => [database_path('migrations/tenant')], '--realpath' => true],
    'seeder_parameters' => ['--class' => 'Database\\Seeders\\TenantDatabaseSeeder', '--force' => true],
];
