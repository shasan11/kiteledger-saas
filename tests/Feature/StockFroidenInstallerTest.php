<?php

namespace Tests\Feature;

use App\Support\Installer\InstalledState;
use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\FroidenInstalledFileManager;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Tests\TestCase;

/** Stock Froiden installer screens must render on Laravel 13. */
class StockFroidenInstallerTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        InstalledState::clear();
    }

    protected function tearDown(): void
    {
        InstalledState::clear();
        parent::tearDown();
    }

    public function test_stock_froiden_screens_render(): void
    {
        $this->get('/install')->assertOk();              // welcome
        $this->get('/install/environment')->assertOk();  // DB credentials form
        $this->get('/install/requirements')->assertOk();
        $this->get('/install/permissions')->assertOk();
    }

    public function test_froiden_final_step_writes_both_install_locks(): void
    {
        $manager = app(InstalledFileManager::class);

        $this->assertInstanceOf(FroidenInstalledFileManager::class, $manager);

        $manager->update();

        $this->assertFileExists(InstalledState::lockPath());
        $this->assertFileExists(InstalledState::froidenLockPath());
        $this->assertTrue(InstalledState::isInstalled());
    }

    public function test_froiden_database_step_uses_consolidated_installer_manager(): void
    {
        $this->assertInstanceOf(FroidenDatabaseManager::class, app(DatabaseManager::class));
    }
}
