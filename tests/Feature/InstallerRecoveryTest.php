<?php

namespace Tests\Feature;

use App\Http\Middleware\EnsureInstalled;
use App\Http\Middleware\InitializeTenancyByVerifiedDomain;
use App\Support\Installer\InstalledState;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\File;
use PDO;
use Tests\TestCase;

class InstallerRecoveryTest extends TestCase
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

    public function test_stale_lock_and_missing_app_key_redirects_to_recovery(): void
    {
        InstalledState::mark();
        config(['app.key' => '', 'installer.enforce_state_in_tests' => true]);

        $response = (new EnsureInstalled)->handle(
            Request::create('/dashboard'),
            fn () => $this->fail('A stale install lock must not enter the application.'),
        );

        $this->assertFalse(InstalledState::isInstalled());
        $this->assertStringEndsWith('/install/recover', $response->getTargetUrl());
    }

    public function test_recovery_page_resets_only_an_invalid_install_lock(): void
    {
        InstalledState::mark();
        config([
            'installer.enforce_state_in_tests' => true,
            'app.key' => 'base64:'.base64_encode(str_repeat('r', 32)),
            'database.default' => 'mysql',
            'database.connections.mysql.database' => 'laravel',
            'database.connections.mysql.username' => 'root',
            'database.connections.mysql.password' => '',
        ]);

        $this->get('/install/recover')
            ->assertOk()
            ->assertSee('partially installed')
            ->assertSee('Reset installer lock and continue installation');

        $this->post('/install/recover')->assertRedirect('/install');
        $this->assertFalse(InstalledState::hasInstallLock());
    }

    public function test_root_and_laravel_defaults_never_query_tenant_domains(): void
    {
        InstalledState::mark();
        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('d', 32)),
            'database.default' => 'mysql',
            'database.connections.mysql.database' => 'laravel',
            'database.connections.mysql.username' => 'root',
            'database.connections.mysql.password' => '',
        ]);

        $response = (new InitializeTenancyByVerifiedDomain)->handle(
            Request::create('https://tenant.example.com/dashboard'),
            fn () => $this->fail('Invalid install state must not reach tenant routes.'),
        );

        $this->assertSame(302, $response->getStatusCode());
        $this->assertStringEndsWith('/install/recover', $response->getTargetUrl());
    }

    public function test_valid_installation_cannot_use_destructive_recovery_action(): void
    {
        InstalledState::mark();
        config([
            'installer.enforce_state_in_tests' => true,
            'app.key' => 'base64:'.base64_encode(str_repeat('v', 32)),
            'database.default' => 'sqlite',
            'database.connections.sqlite.database' => ':memory:',
        ]);

        $this->get('/install/recover')->assertNotFound();
        $this->post('/install/recover')->assertNotFound();
        $this->assertTrue(InstalledState::hasInstallLock());
    }

    public function test_tenant_domain_middleware_returns_clear_error_when_database_is_unavailable(): void
    {
        InstalledState::mark();
        config([
            'app.key' => 'base64:'.base64_encode(str_repeat('u', 32)),
            'database.default' => 'mysql',
            'database.connections.mysql.host' => '127.0.0.1',
            'database.connections.mysql.port' => 1,
            'database.connections.mysql.database' => 'kiteledger_production',
            'database.connections.mysql.username' => 'kiteledger_user',
            'database.connections.mysql.password' => 'configured-password',
            'database.connections.mysql.options' => [PDO::ATTR_TIMEOUT => 1],
            'tenancy.central_domains' => ['central.example.com'],
        ]);

        $response = (new InitializeTenancyByVerifiedDomain)->handle(
            Request::create('https://tenant.example.com/dashboard'),
            fn () => $this->fail('Unavailable database must not reach tenant routes.'),
        );

        $this->assertSame(503, $response->getStatusCode());
        $this->assertStringContainsString('Database configuration is invalid', $response->getContent());
    }

    public function test_first_boot_creates_environment_and_unique_app_key(): void
    {
        $root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'kiteledger-first-boot-'.bin2hex(random_bytes(5));
        File::ensureDirectoryExists($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache');
        File::ensureDirectoryExists($root.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'app');
        File::copy(base_path('bootstrap/first-boot.php'), $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'first-boot.php');
        File::put($root.DIRECTORY_SEPARATOR.'.env.example', "APP_KEY=\nAPP_URL=http://localhost\nDB_CONNECTION=mysql\nDB_DATABASE=laravel\nDB_USERNAME=root\nDB_PASSWORD=\n");
        foreach (['config.php', 'routes-v7.php', 'packages.php', 'services.php'] as $cacheFile) {
            File::put($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache'.DIRECTORY_SEPARATOR.$cacheFile, '<?php return [];');
        }

        $oldHost = $_SERVER['HTTP_HOST'] ?? null;
        $_SERVER['HTTP_HOST'] = 'install.customer.test';

        try {
            $result = require $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'first-boot.php';
            $contents = File::get($root.DIRECTORY_SEPARATOR.'.env');

            $this->assertTrue($result);
            $this->assertMatchesRegularExpression('/^APP_KEY=base64:.+$/m', $contents);
            $this->assertStringContainsString('APP_URL=http://install.customer.test', $contents);
            $this->assertStringContainsString('DB_DATABASE=kiteledger', $contents);
            foreach (['config.php', 'routes-v7.php'] as $cacheFile) {
                $this->assertFileDoesNotExist($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache'.DIRECTORY_SEPARATOR.$cacheFile);
            }
            foreach (['packages.php', 'services.php'] as $manifestFile) {
                $this->assertFileExists($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache'.DIRECTORY_SEPARATOR.$manifestFile);
            }
        } finally {
            if ($oldHost === null) {
                unset($_SERVER['HTTP_HOST']);
            } else {
                $_SERVER['HTTP_HOST'] = $oldHost;
            }
            File::deleteDirectory($root);
        }
    }

    public function test_first_boot_marks_stale_lock_for_recovery_when_key_was_missing(): void
    {
        $root = sys_get_temp_dir().DIRECTORY_SEPARATOR.'kiteledger-stale-boot-'.bin2hex(random_bytes(5));
        File::ensureDirectoryExists($root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'cache');
        File::ensureDirectoryExists($root.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'app');
        File::copy(base_path('bootstrap/first-boot.php'), $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'first-boot.php');
        File::put($root.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'installed', 'stale');
        File::put($root.DIRECTORY_SEPARATOR.'.env.example', "APP_KEY=\nAPP_URL=http://localhost\nDB_CONNECTION=mysql\nDB_DATABASE=kiteledger_production\nDB_USERNAME=kiteledger_user\nDB_PASSWORD=configured-password\n");

        try {
            $this->assertTrue(require $root.DIRECTORY_SEPARATOR.'bootstrap'.DIRECTORY_SEPARATOR.'first-boot.php');
            $this->assertFileExists($root.DIRECTORY_SEPARATOR.'storage'.DIRECTORY_SEPARATOR.'app'.DIRECTORY_SEPARATOR.'install'.DIRECTORY_SEPARATOR.'recovery-required');
            $contents = File::get($root.DIRECTORY_SEPARATOR.'.env');
            $this->assertMatchesRegularExpression('/^APP_KEY=base64:.+$/m', $contents);
            $this->assertStringContainsString('INSTALL_RECOVERY_REQUIRED=true', $contents);
        } finally {
            File::deleteDirectory($root);
        }
    }
}
