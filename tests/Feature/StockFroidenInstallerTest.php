<?php

namespace Tests\Feature;

use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\FroidenEnvironmentManager;
use App\Support\Installer\FroidenInstalledFileManager;
use App\Support\Installer\InstalledState;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Mockery;
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
        $this->get('/install/environment')
            ->assertOk()
            ->assertSee('method="post"', false)
            ->assertSee('Platform administrator')
            ->assertDontSee('type: "GET"', false);
        $this->get('/install/requirements')->assertOk();
        $this->get('/install/permissions')->assertOk();
    }

    public function test_custom_installer_steps_work_on_an_unconfigured_host(): void
    {
        $this->get('https://setup.customer.test/install/type')->assertOk();

        $route = app('router')->getRoutes()->getByName('kiteledger.install.environment.save');
        $this->assertNotNull($route);
        $this->assertContains('POST', $route->methods());
        $this->assertNull($route->getDomain());
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
        $this->assertInstanceOf(FroidenEnvironmentManager::class, app(EnvironmentManager::class));
    }

    public function test_failed_database_step_does_not_mark_the_application_installed(): void
    {
        $manager = Mockery::mock(DatabaseManager::class);
        $manager->shouldReceive('migrateAndSeed')->once()->andReturn([
            'status' => 'danger',
            'message' => 'Connection refused.',
        ]);
        $this->app->instance(DatabaseManager::class, $manager);

        $this->get('/install/database')
            ->assertRedirect(route('kiteledger.install.type'))
            ->assertSessionHasErrors('database');

        $this->assertFalse(InstalledState::isInstalled());
    }

    public function test_final_step_cannot_be_opened_before_database_success(): void
    {
        $this->get('/install/final')
            ->assertRedirect(route('kiteledger.install.type'))
            ->assertSessionHasErrors('database');

        $this->assertFalse(InstalledState::isInstalled());
    }
}
