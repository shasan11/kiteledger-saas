<?php

namespace Tests\Feature;

use App\Http\Middleware\InitializeTenancyByVerifiedDomain;
use App\Services\Installer\InstallerDiagnosticsService;
use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\FroidenEnvironmentManager;
use App\Support\Installer\FroidenInstalledFileManager;
use App\Support\Installer\InstalledState;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Illuminate\Http\Request;
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
        $this->get('/install/environment/save?password=must-not-be-accepted')->assertMethodNotAllowed();
    }

    public function test_unconfigured_tenant_host_does_not_query_database_before_installation(): void
    {
        $response = (new InitializeTenancyByVerifiedDomain)->handle(
            Request::create('https://setup.customer.test/'),
            fn () => $this->fail('The tenant request must not continue before installation.'),
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertStringEndsWith('/install', (string) $response->headers->get('Location'));
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

    public function test_final_page_contains_cron_handoff_masks_secrets_and_locks_installer(): void
    {
        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('k', 32)),
            'database.connections.sqlite.password' => 'db-secret-must-not-render',
            'saas.database.cpanel.token' => 'cpanel-secret-must-not-render',
        ]);

        $response = $this->withSession([
            'kiteledger_install_succeeded' => true,
            'kiteledger_admin_email' => 'buyer@example.com',
            'kiteledger_provisioning_mode' => 'pool',
            'kiteledger_provisioning_status' => 'Pool mode selected.',
        ])->get('/install/final');

        $response->assertOk()
            ->assertSee('Cron Jobs Setup')
            ->assertSee('artisan schedule:run')
            ->assertSee('artisan queue:work --queue=provisioning,default --stop-when-empty')
            ->assertSee('buyer@example.com')
            ->assertDontSee(base64_encode(str_repeat('k', 32)))
            ->assertDontSee('db-secret-must-not-render')
            ->assertDontSee('cpanel-secret-must-not-render');

        $this->get('/install')->assertNotFound();
    }

    public function test_preflight_reports_marketplace_package_errors_without_secrets(): void
    {
        $diagnostics = app(InstallerDiagnosticsService::class);
        $method = new \ReflectionMethod($diagnostics, 'fileCheck');

        $manifest = $method->invoke($diagnostics, 'Compiled frontend manifest', base_path('missing-manifest.json'), 'This is a source-code package, not a marketplace package. Build the marketplace ZIP first using scripts/build-marketplace-package.sh.');
        $vendor = $method->invoke($diagnostics, 'Composer vendor dependencies', base_path('missing-autoload.php'), 'Vendor dependencies are missing. Upload the marketplace package, not the GitHub source ZIP.');

        $this->assertFalse($manifest['ok']);
        $this->assertStringContainsString('source-code package', $manifest['detail']);
        $this->assertFalse($vendor['ok']);
        $this->assertStringContainsString('Vendor dependencies are missing', $vendor['detail']);
    }
}
