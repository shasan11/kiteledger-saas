<?php

namespace Tests\Feature;

use App\Http\Controllers\Installer\InstallTypeController;
use App\Services\Installer\InstallerDatabaseService;
use App\Support\Installer\FroidenDatabaseManager;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class InstallerDatabaseManagerTest extends TestCase
{
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
