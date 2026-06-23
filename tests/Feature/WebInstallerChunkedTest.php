<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\Installer\InstalledState;
use App\Support\Installer\WebInstallStatus;
use Tests\TestCase;

/**
 * Drives the poll-driven installer end-to-end: repeated GET /install/database/status
 * calls must walk schema → seed → finalize → succeeded, with no background worker.
 */
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

    public function test_poll_driven_install_completes_without_a_worker(): void
    {
        $dbConfig = config('database.connections.'.config('database.default'));

        if (($dbConfig['database'] ?? null) === ':memory:') {
            $this->markTestSkipped('Requires a file-based sqlite DB (migrate:fresh resets the schema).');
        }

        $state = ['state' => 'idle'];

        // Each poll runs one phase; a handful of polls should finish it.
        for ($i = 0; $i < 8; $i++) {
            $state = $this->getJson('/install/database/status')->assertOk()->json();

            if (in_array($state['state'] ?? null, ['succeeded', 'failed'], true)) {
                break;
            }
        }

        $this->assertSame('succeeded', $state['state'] ?? null, 'Install did not complete: '.json_encode($state['message'] ?? $state));
        $this->assertTrue(InstalledState::isInstalled());
        $this->assertTrue(User::query()->where('email', 'admin@kiteledger.test')->exists());
    }
}
