<?php

namespace Tests\Feature\SaaS;

use App\Contracts\SaaS\TenantDatabaseProvisioner;
use App\Jobs\SaaS\ProvisionTenantJob;
use App\Models\Central\PaymentGateway;
use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Models\Central\TenantDeletionRequest;
use App\Services\SaaS\DatabaseProvisioning\DatabaseProvisionerManager;
use App\Services\SaaS\PlanLimitService;
use App\Services\SaaS\TenantDeletionService;
use App\Services\SaaS\TenantDomainService;
use App\Services\SaaS\TenantFileDeletionService;
use App\Services\SaaS\TenantProvisioningService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Illuminate\Validation\ValidationException;
use Mockery;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CentralTenancyTest extends TestCase
{
    use RefreshDatabase;

    public function test_central_service_creates_tenant_and_domain_without_branch_confusion(): void
    {
        Queue::fake();
        $tenant = app(TenantProvisioningService::class)->create($this->tenantPayload('Acme', 'acme', 'ada@example.test', 'tenant_acme'));
        $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'company_name' => 'Acme', 'status' => 'pending']);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'acme.test', 'type' => 'subdomain']);
        $this->assertSame('manual', $tenant->database_provisioning_mode);
        $this->assertSame('tenant_acme', $tenant->database_name);
    }

    public function test_tenant_provisioning_job_uses_central_queue_connection(): void
    {
        Queue::fake();
        config(['saas.provision_sync' => false, 'saas.provisioning_queue' => 'provisioning']);

        app(TenantProvisioningService::class)->create($this->tenantPayload('Queued', 'queued', 'queue@example.test', 'tenant_queued'));

        Queue::assertPushed(ProvisionTenantJob::class, fn (ProvisionTenantJob $job): bool => $job->connection === 'central' && $job->queue === 'provisioning');
    }

    public function test_tenant_provisioning_job_dispatches_after_outer_central_transaction_commits(): void
    {
        Queue::fake();
        config(['saas.provision_sync' => false, 'saas.provisioning_queue' => 'provisioning']);
        $connection = DB::connection(config('tenancy.database.central_connection'));

        $connection->beginTransaction();

        try {
            app(TenantProvisioningService::class)->create($this->tenantPayload('Deferred', 'deferred', 'deferred@example.test', 'tenant_deferred'));

            Queue::assertNotPushed(ProvisionTenantJob::class);
        } catch (\Throwable $e) {
            $connection->rollBack();

            throw $e;
        }

        $connection->commit();

        Queue::assertPushed(ProvisionTenantJob::class, fn (ProvisionTenantJob $job): bool => $job->connection === 'central' && $job->queue === 'provisioning');
    }

    public function test_central_queue_connection_is_database_backed_and_after_commit(): void
    {
        $this->assertSame('database', config('queue.connections.central.driver'));
        $this->assertSame(config('queue.connections.central.connection'), config('queue.failed.database'));
        $this->assertTrue(config('queue.connections.central.after_commit'));
        $this->assertGreaterThan(280, config('queue.connections.central.retry_after'));
    }

    public function test_manual_mode_stores_admin_supplied_database_credentials(): void
    {
        Queue::fake();
        $tenant = app(TenantProvisioningService::class)->create($this->tenantPayload('Acme', 'acme2', 'ada2@example.test', 'buyer_created_acme'));

        $this->assertSame('manual', $tenant->database_provisioning_mode);
        $this->assertSame('buyer_created_acme', $tenant->database_name);
        $this->assertNotSame('tenant-db-secret', $tenant->getRawOriginal('tenancy_db_password'));
        $this->assertArrayNotHasKey('data', $tenant->toArray());
    }

    private function tenantPayload(string $company, string $subdomain, string $email, string $database): array
    {
        return [
            'company_name' => $company, 'owner_name' => 'Ada Owner', 'owner_email' => $email,
            'timezone' => 'UTC', 'currency' => 'USD', 'subdomain' => $subdomain,
            'owner_password' => 'VerySecure!123', 'tenancy_db_host' => '127.0.0.1',
            'tenancy_db_port' => 3306, 'tenancy_db_name' => $database,
            'tenancy_db_username' => 'tenant_user', 'tenancy_db_password' => 'tenant-db-secret',
        ];
    }

    public function test_tenant_database_credentials_are_hidden_from_serialization(): void
    {
        $tenant = Tenant::create([
            'id' => 'tenant-secret',
            'company_name' => 'Secret Co',
            'owner_name' => 'Owner',
            'owner_email' => 'secret@example.test',
            'status' => 'pending',
            'database_username' => 'tenant_user',
            'database_password' => 'tenant_password',
            'data' => ['provisioning_owner_password' => 'encrypted-secret'],
        ]);

        $payload = $tenant->toArray();

        $this->assertArrayNotHasKey('database_username', $payload);
        $this->assertArrayNotHasKey('database_password', $payload);
        $this->assertArrayNotHasKey('data', $payload);
    }

    #[DataProvider('provisioningModes')]
    public function test_tenant_deletion_uses_stored_database_provisioning_mode(string $storedMode): void
    {
        config(['saas.database.mode' => $storedMode === 'cpanel_uapi' ? 'pool' : 'cpanel_uapi']);

        $tenant = Tenant::create([
            'id' => 'tenant-delete',
            'company_name' => 'Delete Co',
            'owner_name' => 'Owner',
            'owner_email' => 'delete@example.test',
            'status' => 'deletion_pending',
            'database_name' => 'tenant_delete',
            'database_provisioning_mode' => $storedMode,
        ]);
        $tenant->domains()->create(['domain' => 'delete.test', 'status' => 'active', 'type' => 'subdomain']);
        $deletion = TenantDeletionRequest::create([
            'id' => '00000000-0000-0000-0000-000000000001',
            'tenant_id' => $tenant->id,
            'status' => 'approved',
            'requested_by' => 1,
            'approved_by' => 1,
            'execute_after' => now()->subMinute(),
            'backup_waived' => true,
            'reason' => 'test',
        ]);

        $provisioner = Mockery::mock(TenantDatabaseProvisioner::class);
        $provisioner->shouldReceive('destroy')->once()->with(Mockery::on(fn (Tenant $passed): bool => $passed->id === $tenant->id));
        $manager = Mockery::mock(DatabaseProvisionerManager::class);
        $manager->shouldReceive('driver')->once()->with($storedMode)->andReturn($provisioner);
        $this->app->instance(DatabaseProvisionerManager::class, $manager);

        app(TenantDeletionService::class)->execute($deletion);

        $this->assertSame('completed', $deletion->refresh()->status);
        $this->assertDatabaseHas('domains', ['tenant_id' => $tenant->id, 'domain' => 'delete.test', 'status' => 'disabled']);
        $this->assertSoftDeleted('tenants', ['id' => $tenant->id]);
    }

    public static function provisioningModes(): array
    {
        return [
            'pool' => ['pool'],
            'cpanel_uapi' => ['cpanel_uapi'],
            'automatic' => ['automatic'],
        ];
    }

    public function test_tenant_deletion_file_cleanup_failure_prevents_completion(): void
    {
        $tenant = Tenant::create([
            'id' => 'tenant-delete-files',
            'company_name' => 'Delete Files Co',
            'owner_name' => 'Owner',
            'owner_email' => 'delete-files@example.test',
            'status' => 'deletion_pending',
            'database_name' => 'tenant_delete_files',
            'database_provisioning_mode' => 'pool',
        ]);
        $deletion = TenantDeletionRequest::create([
            'id' => '00000000-0000-0000-0000-000000000002',
            'tenant_id' => $tenant->id,
            'status' => 'approved',
            'requested_by' => 1,
            'approved_by' => 1,
            'execute_after' => now()->subMinute(),
            'backup_waived' => true,
            'reason' => 'test',
        ]);

        $provisioner = Mockery::mock(TenantDatabaseProvisioner::class);
        $provisioner->shouldReceive('destroy')->once()->with(Mockery::type(Tenant::class));
        $manager = Mockery::mock(DatabaseProvisionerManager::class);
        $manager->shouldReceive('driver')->once()->with('pool')->andReturn($provisioner);
        $this->app->instance(DatabaseProvisionerManager::class, $manager);
        $files = Mockery::mock(TenantFileDeletionService::class);
        $files->shouldReceive('delete')->once()->with(Mockery::type(Tenant::class))->andThrow(new \RuntimeException('tenant_files_path_invalid'));
        $this->app->instance(TenantFileDeletionService::class, $files);

        $this->expectExceptionMessage('tenant_files_path_invalid');

        try {
            app(TenantDeletionService::class)->execute($deletion);
        } finally {
            $this->assertSame('running', $deletion->refresh()->status);
            $this->assertDatabaseHas('tenants', ['id' => $tenant->id, 'deleted_at' => null]);
        }
    }

    public function test_reserved_subdomains_are_rejected(): void
    {
        $this->expectException(ValidationException::class);
        app(TenantDomainService::class)->normalizeSubdomain('admin');
    }

    public function test_gateway_secrets_are_encrypted_at_rest(): void
    {
        $gateway = PaymentGateway::create(['name' => 'Stripe', 'slug' => 'stripe', 'secret_key' => 'sk_test_secret', 'webhook_secret' => 'whsec_secret']);
        $raw = $gateway->getRawOriginal('secret_key');
        $this->assertNotSame('sk_test_secret', $raw);
        $this->assertSame('sk_test_secret', Crypt::decryptString($raw));
        $this->assertArrayNotHasKey('secret_key', $gateway->toArray());
    }

    public function test_plan_feature_is_enforced_by_backend_service(): void
    {
        $plan = Plan::create(['name' => 'Starter', 'slug' => 'starter', 'currency' => 'USD', 'allow_pos' => false, 'allow_inventory' => true]);
        $tenant = Tenant::create(['company_name' => 'Acme', 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test', 'plan_id' => $plan->id, 'status' => 'active']);
        $limits = app(PlanLimitService::class);
        $this->assertFalse($limits->allows($tenant, 'pos'));
        $this->assertTrue($limits->allows($tenant, 'inventory'));
    }

    public function test_central_domain_serves_central_website_and_does_not_initialize_tenant(): void
    {
        $response = $this->withHeader('Host', 'central.test')->get('/');
        $this->assertContains($response->getStatusCode(), [200, 302]); // installer redirects are valid before installation
        $this->assertNull(tenant());
    }
}
