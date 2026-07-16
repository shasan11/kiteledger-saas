<?php

namespace Tests\Feature\SaaS;

use App\Jobs\SaaS\RecordQueueHeartbeatJob;
use App\Models\Central\TenantDatabasePool;
use App\Support\Installer\InstalledState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Symfony\Component\Console\Command\Command as SymfonyCommand;
use Tests\TestCase;

class SaasHealthCommandTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        InstalledState::clear();

        parent::tearDown();
    }

    public function test_health_reports_required_readiness_and_advisory_heartbeats(): void
    {
        $this->skipIfRuntimeCannotSatisfyRequiredChecks();
        $this->configureHealthyRuntime();
        InstalledState::mark();
        TenantDatabasePool::create([
            'database_name' => 'tenant_pool_ready',
            'status' => 'available',
            'validated_at' => now(),
        ]);

        $exitCode = Artisan::call('saas:health', ['--json' => true]);
        $checks = json_decode(Artisan::output(), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(SymfonyCommand::SUCCESS, $exitCode);
        $this->assertTrue($checks['installed']['ok']);
        $this->assertTrue($checks['central_queue']['ok']);
        $this->assertTrue($checks['jobs_table']['ok']);
        $this->assertTrue($checks['failed_jobs_table']['ok']);
        $this->assertTrue($checks['pool_availability']['ok']);
        $this->assertFalse($checks['scheduler_heartbeat']['ok']);
        $this->assertFalse($checks['scheduler_heartbeat']['required']);
        $this->assertFalse($checks['queue_heartbeat']['ok']);
        $this->assertFalse($checks['queue_heartbeat']['required']);
    }

    public function test_health_fails_when_central_queue_is_not_configured(): void
    {
        $this->configureHealthyRuntime();
        InstalledState::mark();
        TenantDatabasePool::create([
            'database_name' => 'tenant_pool_ready',
            'status' => 'available',
            'validated_at' => now(),
        ]);
        config(['queue.default' => 'sync']);

        $exitCode = Artisan::call('saas:health', ['--json' => true]);
        $checks = json_decode(Artisan::output(), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(SymfonyCommand::FAILURE, $exitCode);
        $this->assertFalse($checks['central_queue']['ok']);
        $this->assertTrue($checks['central_queue']['required']);
    }

    public function test_queue_heartbeat_job_updates_central_health_signal(): void
    {
        $this->skipIfRuntimeCannotSatisfyRequiredChecks();
        $this->configureHealthyRuntime();
        InstalledState::mark();
        TenantDatabasePool::create([
            'database_name' => 'tenant_pool_ready',
            'status' => 'available',
            'validated_at' => now(),
        ]);
        $central = config('tenancy.database.central_connection');
        DB::connection($central)->table('saas_heartbeats')->updateOrInsert(
            ['name' => 'scheduler'],
            ['last_seen_at' => now(), 'metadata' => json_encode(['host' => 'test'])]
        );

        $job = new RecordQueueHeartbeatJob;
        $this->assertSame('central', $job->connection);
        $this->assertSame('default', $job->queue);
        $job->handle();

        $exitCode = Artisan::call('saas:health', ['--json' => true]);
        $checks = json_decode(Artisan::output(), true, flags: JSON_THROW_ON_ERROR);

        $this->assertSame(SymfonyCommand::SUCCESS, $exitCode);
        $this->assertTrue($checks['scheduler_heartbeat']['ok']);
        $this->assertTrue($checks['queue_heartbeat']['ok']);
        $this->assertDatabaseHas('saas_heartbeats', ['name' => 'queue']);
    }

    private function configureHealthyRuntime(): void
    {
        $central = config('tenancy.database.central_connection');

        config([
            'app.env' => 'production',
            'app.debug' => false,
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'app.url' => 'https://central.example.test',
            'cache.default' => 'array',
            'mail.default' => 'array',
            'queue.default' => 'central',
            'queue.connections.central.driver' => 'database',
            'queue.connections.central.connection' => $central,
            'queue.connections.central.table' => 'jobs',
            'queue.failed.database' => $central,
            'queue.failed.table' => 'failed_jobs',
            'saas.base_domain' => 'example.test',
            'saas.database.mode' => 'pool',
            'session.driver' => 'file',
            'session.domain' => null,
            'tenancy.central_domains' => ['central.example.test'],
        ]);
    }

    private function skipIfRuntimeCannotSatisfyRequiredChecks(): void
    {
        foreach (['ctype', 'curl', 'dom', 'fileinfo', 'filter', 'json', 'mbstring', 'openssl', 'pdo', 'pdo_mysql', 'tokenizer', 'xml'] as $extension) {
            if (! extension_loaded($extension)) {
                $this->markTestSkipped("The {$extension} extension is required for a fully healthy saas:health result.");
            }
        }
    }
}
