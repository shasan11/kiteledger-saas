<?php

namespace Tests\Feature;

use App\Http\Controllers\Installer\InstallTypeController;
use App\Services\Installer\InstallerDatabaseService;
use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\InstalledState;
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

    public function test_initial_pool_payload_falls_back_to_persisted_installer_status(): void
    {
        InstalledState::clear();
        InstalledState::putInstallerStatus(['initial_pool_databases' => 'encrypted-payload']);

        try {
            $payload = (new ReflectionMethod(InstallerDatabaseService::class, 'initialPoolPayload'))->invoke(
                app(InstallerDatabaseService::class),
            );

            $this->assertSame('encrypted-payload', $payload);
        } finally {
            InstalledState::clear();
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
