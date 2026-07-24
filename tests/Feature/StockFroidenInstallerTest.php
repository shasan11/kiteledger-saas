<?php

namespace Tests\Feature;

use App\Http\Controllers\Installer\EnvironmentController;
use App\Http\Middleware\InitializeTenancyByVerifiedDomain;
use App\Services\Installer\InstallerDiagnosticsService;
use App\Support\Installer\FroidenDatabaseManager;
use App\Support\Installer\FroidenEnvironmentManager;
use App\Support\Installer\FroidenInstalledFileManager;
use App\Support\Installer\InstalledState;
use Froiden\LaravelInstaller\Helpers\DatabaseManager;
use Froiden\LaravelInstaller\Helpers\EnvironmentManager;
use Froiden\LaravelInstaller\Helpers\InstalledFileManager;
use Froiden\LaravelInstaller\Helpers\Reply;
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
            ->assertSee('type="submit"', false)
            ->assertSee('Platform administrator')
            ->assertDontSee('checkEnv', false)
            ->assertDontSee('provisioning_mode', false)
            ->assertDontSee('pool_databases', false)
            ->assertDontSee('cpanel_api_token', false)
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
        $this->assertNotContains('GET', $route->methods());
        $this->assertNull($route->getDomain());
    }

    public function test_permission_errors_are_highlighted_in_red_with_details(): void
    {
        $diagnostics = Mockery::mock(InstallerDiagnosticsService::class);
        $diagnostics->shouldReceive('preflight')->once()->andReturn([
            ['label' => 'storage/logs', 'ok' => false, 'detail' => 'Not writable: /var/www/app/storage/logs. Recommended permission: 775.'],
            ['label' => 'bootstrap/cache', 'ok' => true, 'detail' => 'Writable'],
        ]);
        $this->app->instance(InstallerDiagnosticsService::class, $diagnostics);

        $this->get('/install/permissions')
            ->assertOk()
            ->assertSee('permission-check--error', false)
            ->assertSee('Permission check failed')
            ->assertSee('storage/logs')
            ->assertSee('Recommended permission: 775.')
            ->assertSee('Error');
    }

    public function test_apache_rewrites_support_public_and_project_root_document_roots(): void
    {
        $rootRules = file_get_contents(base_path('.htaccess'));
        $publicRules = file_get_contents(public_path('.htaccess'));

        $this->assertStringNotContainsString('<!--', $rootRules);
        $this->assertStringContainsString('RewriteRule ^(.*)$ public/$1 [L]', $rootRules);
        $this->assertStringContainsString('RewriteRule ^storage(?:/(.*))?$ public/storage/$1 [L]', $rootRules);
        $this->assertStringContainsString('RewriteRule ^\\.well-known(?:/|$) - [L]', $rootRules);
        $this->assertStringContainsString('vendor', $rootRules);
        $this->assertStringContainsString('DirectoryIndex index.php', $publicRules);
        $this->assertStringContainsString('(?!well-known(?:/|$))', $publicRules);
        $this->assertStringContainsString('RewriteRule ^ index.php [L]', $publicRules);
    }

    public function test_environment_save_accepts_a_blank_central_database_password(): void
    {
        $manager = Mockery::mock(FroidenEnvironmentManager::class);
        $manager->shouldReceive('save')->once()->andReturn(['status' => 'success']);

        $response = app(EnvironmentController::class)(
            Request::create('/install/environment/save', 'POST', $this->validEnvironmentPayload(['password' => ''])),
            $manager,
        );

        $this->assertSame('success', $response['status'] ?? null);
    }

    public function test_unreachable_database_returns_an_installer_error_without_waiting_for_php_timeout(): void
    {
        $startedAt = microtime(true);

        $response = app(FroidenEnvironmentManager::class)->save(
            Request::create('/install/environment/save', 'POST', $this->validEnvironmentPayload([
                'hostname' => '127.0.0.1',
                'port' => 1,
            ])),
        );

        $this->assertSame('fail', $response['status'] ?? null);
        $this->assertStringContainsString('Could not reach MySQL', (string) ($response['message'] ?? ''));
        $this->assertLessThan(10, microtime(true) - $startedAt);
    }

    public function test_browser_environment_submission_redirects_without_javascript(): void
    {
        $manager = Mockery::mock(FroidenEnvironmentManager::class);
        $manager->shouldReceive('save')->once()->with(Mockery::on(
            fn (Request $request): bool => blank($request->input('password')),
        ))->andReturn(Reply::redirect(route('LaravelInstaller::requirements'), 'Settings saved.'));
        $this->app->instance(FroidenEnvironmentManager::class, $manager);

        $this->post(route('kiteledger.install.environment.save'), $this->validEnvironmentPayload([
            '_browser_submit' => '1',
            'password' => '',
        ]))->assertRedirect(route('LaravelInstaller::requirements'));
    }

    public function test_environment_save_does_not_require_or_process_tenant_database_rows(): void
    {
        $manager = Mockery::mock(FroidenEnvironmentManager::class);
        $manager->shouldReceive('save')->once()->with(Mockery::on(function (Request $request): bool {
            return ! $request->has('provisioning_mode') && ! $request->has('pool_databases');
        }))->andReturn(['status' => 'success']);

        $response = app(EnvironmentController::class)(
            Request::create('/install/environment/save', 'POST', $this->validEnvironmentPayload()),
            $manager,
        );

        $this->assertSame('success', $response['status'] ?? null);
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
        ])->get('/install/final');

        $response->assertOk()
            ->assertSee('Cron Jobs Setup')
            ->assertSee('artisan schedule:run')
            ->assertSee('artisan queue:work central --queue=provisioning,default --stop-when-empty --tries=3 --timeout=300')
            ->assertSee('buyer@example.com')
            ->assertDontSee(base64_encode(str_repeat('k', 32)))
            ->assertDontSee('db-secret-must-not-render')
            ->assertDontSee('cpanel-secret-must-not-render');

        $this->get('/install')->assertNotFound();
    }

    public function test_final_step_recovers_when_cpanel_session_handoff_is_lost(): void
    {
        config(['app.key' => 'base64:'.base64_encode(str_repeat('k', 32))]);
        InstalledState::putInstallerStatus([
            'install_succeeded' => true,
            'admin_email' => 'buyer@example.com',
        ]);

        $this->get('/install/final')
            ->assertOk()
            ->assertSee('buyer@example.com')
            ->assertSee('create each tenant database');

        $this->assertFileDoesNotExist(InstalledState::installerStatusPath());
        $this->assertFileExists(InstalledState::lockPath());
    }

    public function test_preflight_reports_marketplace_package_errors_without_secrets(): void
    {
        $diagnostics = app(InstallerDiagnosticsService::class);
        $method = new \ReflectionMethod($diagnostics, 'fileCheck');

        $manifest = $method->invoke($diagnostics, 'Compiled frontend manifest', base_path('missing-manifest.json'), 'Frontend build assets are missing. Upload the marketplace package, not the GitHub source ZIP.');
        $vendor = $method->invoke($diagnostics, 'Composer vendor dependencies', base_path('missing-autoload.php'), 'Vendor dependencies are missing. Upload the marketplace package, not the GitHub source ZIP.');

        $this->assertFalse($manifest['ok']);
        $this->assertStringContainsString('Frontend build assets are missing', $manifest['detail']);
        $this->assertFalse($vendor['ok']);
        $this->assertStringContainsString('Vendor dependencies are missing', $vendor['detail']);
    }

    private function validEnvironmentPayload(array $overrides = []): array
    {
        return array_replace_recursive([
            'hostname' => '127.0.0.1',
            'port' => 3306,
            'database' => 'kiteledger',
            'username' => 'kiteledger',
            'password' => 'secret',
            'app_url' => 'https://example.test',
            'central_domains' => 'example.test',
            'saas_base_domain' => 'example.test',
            'admin_name' => 'Admin',
            'admin_email' => 'admin@example.test',
            'admin_password' => 'VerySecure!123',
            'admin_password_confirmation' => 'VerySecure!123',
        ], $overrides);
    }
}
