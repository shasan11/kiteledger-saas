<?php

namespace Tests\Feature;

use App\Services\Installer\WebDatabaseInstaller;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallLauncher;
use App\Support\Installer\WebInstallStatus;
use Illuminate\Support\Facades\Artisan;
use RuntimeException;
use Tests\TestCase;

class WebInstallerChunkedTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        InstalledState::clear();
        app(WebInstallStatus::class)->reset();
    }

    protected function tearDown(): void
    {
        InstalledState::clear();
        app(WebInstallStatus::class)->reset();
        parent::tearDown();
    }

    public function test_database_page_points_frontend_at_start_endpoint(): void
    {
        $this->get('/install/database')
            ->assertOk()
            ->assertSee('/install/database/start')
            ->assertSee('Preparing database installation')
            ->assertDontSee('Installer has not started');
    }

    public function test_start_endpoint_initializes_status_and_launches_worker(): void
    {
        $this->app->instance(WebInstallLauncher::class, new class extends WebInstallLauncher {
            public function launch(): string
            {
                return 'fake install worker';
            }
        });

        $payload = $this->getJson('/install/database/start?reset=1')
            ->assertOk()
            ->json();

        $this->assertSame('running', $payload['state'] ?? null);
        $this->assertNotEmpty($payload['worker_started_at'] ?? null);
        $this->assertStringContainsString('Background command launched', implode("\n", $payload['log'] ?? []));
    }

    public function test_status_endpoint_only_reads_status_and_does_not_run_installer_work(): void
    {
        app(WebInstallStatus::class)->begin();
        app(WebInstallStatus::class)->workerStarted('fake install worker');

        $this->app->instance(WebDatabaseInstaller::class, new class extends WebDatabaseInstaller {
            public function run(callable $progress): array
            {
                throw new RuntimeException('Status endpoint must not run installer work.');
            }
        });

        $payload = $this->getJson('/install/database/status')
            ->assertOk()
            ->json();

        $this->assertSame('running', $payload['state'] ?? null);
        $this->assertStringNotContainsString('Schema started', implode("\n", $payload['log'] ?? []));
    }

    public function test_start_endpoint_does_not_launch_duplicate_running_worker(): void
    {
        $launcher = new class extends WebInstallLauncher {
            public int $launches = 0;

            public function launch(): string
            {
                $this->launches++;

                return 'fake install worker';
            }
        };

        $this->app->instance(WebInstallLauncher::class, $launcher);

        $this->getJson('/install/database/start?reset=1')->assertOk();
        $this->getJson('/install/database/start')->assertOk();

        $this->assertSame(1, $launcher->launches);
    }

    public function test_worker_launch_failure_marks_status_failed(): void
    {
        $this->app->instance(WebInstallLauncher::class, new class extends WebInstallLauncher {
            public function launch(): string
            {
                throw new RuntimeException('Process launch disabled.');
            }
        });

        $payload = $this->getJson('/install/database/start?reset=1')
            ->assertOk()
            ->json();

        $this->assertSame('failed', $payload['state'] ?? null);
        $this->assertSame('Process launch disabled.', $payload['message'] ?? null);
        $this->assertStringContainsString('Failed: Process launch disabled.', implode("\n", $payload['log'] ?? []));
    }

    public function test_successful_cli_command_updates_status_to_succeeded(): void
    {
        $this->app->instance(WebDatabaseInstaller::class, new class extends WebDatabaseInstaller {
            public function run(callable $progress): array
            {
                $progress('Schema started.', 'Running schema');
                $progress('Seed started.', 'Seeding database');
                $progress('Finalize started.', 'Finalizing');

                return [
                    'status' => 'success',
                    'message' => 'Application has been successfully installed.',
                ];
            }
        });

        $exitCode = Artisan::call('install:run-web');
        $payload = app(WebInstallStatus::class)->read();

        $this->assertSame(0, $exitCode);
        $this->assertSame('succeeded', $payload['state'] ?? null);
        $this->assertTrue(InstalledState::isInstalled());
        $this->assertStringContainsString('Succeeded:', implode("\n", $payload['log'] ?? []));
    }
}
