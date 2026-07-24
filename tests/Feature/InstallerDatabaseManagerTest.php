<?php

namespace Tests\Feature;

use App\Http\Controllers\Installer\InstallTypeController;
use App\Services\Installer\InstallerDatabaseService;
use App\Support\Installer\FroidenDatabaseManager;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use ReflectionMethod;
use Tests\TestCase;

class InstallerDatabaseManagerTest extends TestCase
{
    public function test_mysql_install_dump_uses_the_canonical_path(): void
    {
        $path = (new ReflectionMethod(InstallerDatabaseService::class, 'dumpPath'))->invoke(
            app(InstallerDatabaseService::class),
        );

        $this->assertSame(database_path('sql/mysql_install.sql'), $path);
    }

    public function test_sql_dump_builder_uses_the_central_seeder(): void
    {
        $source = file_get_contents(base_path('routes/console.php'));

        $this->assertStringContainsString("'--class' => CentralDatabaseSeeder::class", $source);
        $this->assertStringNotContainsString("'--class' => DatabaseSeeder::class", $source);
        $this->assertStringContainsString('database/sql/mysql_install.sql', $source);
    }

    public function test_install_dump_must_include_every_current_central_migration(): void
    {
        $path = tempnam(sys_get_temp_dir(), 'kiteledger-install-dump-');
        $migrationNames = array_map(
            fn (string $migration): string => pathinfo($migration, PATHINFO_FILENAME),
            glob(database_path('migrations/*.php')) ?: [],
        );
        $method = new ReflectionMethod(InstallerDatabaseService::class, 'dumpContainsAllCentralMigrations');
        $service = app(InstallerDatabaseService::class);

        try {
            file_put_contents($path, implode(PHP_EOL, $migrationNames));
            $this->assertTrue($method->invoke($service, $path));

            array_pop($migrationNames);
            file_put_contents($path, implode(PHP_EOL, $migrationNames));
            $this->assertFalse($method->invoke($service, $path));
        } finally {
            @unlink($path);
        }
    }

    public function test_encrypted_payment_gateway_config_uses_text_storage(): void
    {
        $baseMigration = file_get_contents(database_path('migrations/2026_07_03_000000_create_saas_central_schema.php'));
        $upgradeMigration = file_get_contents(database_path('migrations/2026_07_24_020000_store_encrypted_payment_gateway_config_as_text.php'));

        $this->assertStringContainsString("\$table->longText('config')->nullable();", $baseMigration);
        $this->assertStringNotContainsString("\$table->json('config')->nullable();", $baseMigration);
        $this->assertStringContainsString("\$table->longText('config')->nullable()->change();", $upgradeMigration);
    }

    public function test_mysql_install_dump_contains_tenant_provisioning_metadata_schema(): void
    {
        $dump = file_get_contents(database_path('sql/mysql_install.sql'));

        foreach ([
            '2026_07_16_000000_persist_tenant_database_metadata',
            '`database_provisioning_mode`',
            '`database_server`',
            '`database_username`',
            '`database_password`',
            '`database_ownership_id`',
            '`provisioned_at`',
            '`allocated_at`',
            '`released_at`',
            '`ownership_tenant_id`',
        ] as $expected) {
            $this->assertStringContainsString($expected, $dump);
        }
    }

    public function test_mysql_install_dump_contains_central_schema_only(): void
    {
        $dump = file_get_contents(database_path('sql/mysql_install.sql'));

        $this->assertStringContainsString('CREATE TABLE `tenants`', $dump);
        $this->assertStringContainsString('CREATE TABLE `tenant_database_pool`', $dump);

        foreach ([
            'users',
            'roles',
            'permissions',
            'branches',
            'contacts',
            'products',
            'chart_of_accounts',
            'journal_vouchers',
            'invoices',
            'payments',
            'purchase_bills',
            'inventory_adjustments',
            'pos_registers',
            'documents',
        ] as $tenantTable) {
            $this->assertStringNotContainsString("CREATE TABLE `{$tenantTable}`", $dump);
        }
    }

    #[DataProvider('installTypes')]
    public function test_browser_install_routes_only_to_the_safe_service_method(string $type, string $method, string $message): void
    {
        $service = Mockery::mock(InstallerDatabaseService::class);
        $service->shouldReceive($method)->once();
        $service->shouldReceive('hasMysqlInstallDump')->once()->andReturnFalse();
        session([InstallTypeController::SESSION_KEY => $type]);

        $response = (new FroidenDatabaseManager($service))->migrateAndSeed();

        $this->assertSame('success', $response['status']);
        $this->assertStringContainsString($message, $response['message']);
    }

    public static function installTypes(): array
    {
        return [
            'fresh' => ['fresh', 'installFresh', 'Fresh installation completed'],
            'quick' => ['quick', 'installQuickDemo', 'Quick demo installation completed'],
            'full' => ['full', 'installFullDemoInstructionOnly', InstallerDatabaseService::FULL_DEMO_COMMAND],
        ];
    }
}
