<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\DatabaseProvisioning\PoolDatabaseProvisioner;
use App\Services\SaaS\DatabaseProvisioning\PoolDatabaseValidator;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseConnectionVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Mockery;
use Tests\TestCase;

class PoolDatabaseProvisionerTest extends TestCase
{
    use RefreshDatabase;

    public function test_pool_provisioning_allocates_only_validated_available_database_and_stores_credentials(): void
    {
        TenantDatabasePool::create(['database_name' => 'tenant_unvalidated', 'status' => 'available']);
        TenantDatabasePool::create(['database_name' => 'tenant_valid', 'status' => 'available', 'validated_at' => now(), 'username' => 'tenant_user', 'password' => 'tenant_pass']);
        $tenant = $this->tenant('tenant-a');
        $this->mockVerifier()->shouldReceive('createOrVerifyOwnership')->once()->with(Mockery::type(Tenant::class), 'pool');

        app(PoolDatabaseProvisioner::class)->provision($tenant);

        $tenant->refresh();
        $this->assertSame('tenant_valid', $tenant->database_name);
        $this->assertSame('pool', $tenant->database_provisioning_mode);
        $this->assertSame('tenant_user', $tenant->database_username);
        $this->assertSame('tenant_pass', $tenant->database_password);
        $this->assertDatabaseHas('tenant_database_pool', ['database_name' => 'tenant_valid', 'status' => 'allocated', 'tenant_id' => $tenant->id, 'ownership_tenant_id' => $tenant->id]);
        $this->assertDatabaseHas('tenant_database_pool', ['database_name' => 'tenant_unvalidated', 'status' => 'available', 'tenant_id' => null]);
    }

    public function test_pool_retry_reuses_existing_allocation_instead_of_allocating_another_database(): void
    {
        $tenant = $this->tenant('tenant-a', ['database_name' => 'tenant_existing']);
        TenantDatabasePool::create(['database_name' => 'tenant_existing', 'status' => 'allocated', 'tenant_id' => $tenant->id, 'validated_at' => now()]);
        TenantDatabasePool::create(['database_name' => 'tenant_second', 'status' => 'available', 'validated_at' => now()]);
        $this->mockVerifier()->shouldReceive('createOrVerifyOwnership')->once()->with(Mockery::type(Tenant::class), 'pool');

        app(PoolDatabaseProvisioner::class)->provision($tenant);

        $this->assertDatabaseHas('tenant_database_pool', ['database_name' => 'tenant_existing', 'status' => 'allocated', 'tenant_id' => $tenant->id]);
        $this->assertDatabaseHas('tenant_database_pool', ['database_name' => 'tenant_second', 'status' => 'available', 'tenant_id' => null]);
    }

    public function test_pool_exhaustion_uses_safe_error_code(): void
    {
        TenantDatabasePool::create(['database_name' => 'tenant_unvalidated', 'status' => 'available']);
        $this->mockVerifier()->shouldNotReceive('createOrVerifyOwnership');

        $this->expectExceptionMessage('pool_exhausted');

        app(PoolDatabaseProvisioner::class)->provision($this->tenant('tenant-a'));
    }

    public function test_pool_database_registration_rejects_database_already_assigned_to_tenant(): void
    {
        $this->tenant('tenant-a', ['database_name' => 'tenant_claimed']);

        $this->expectExceptionMessage('database_already_owned');

        app(PoolDatabaseValidator::class)->validate(['database_name' => 'tenant_claimed']);
    }

    public function test_pool_cleanup_failure_marks_database_failed_and_does_not_release_it(): void
    {
        $tenant = $this->tenant('tenant-a', ['database_name' => 'tenant_existing']);
        $tenant->setInternal('db_name', 'tenant_existing');
        $tenant->save();
        TenantDatabasePool::create(['database_name' => 'tenant_existing', 'status' => 'allocated', 'tenant_id' => $tenant->id, 'validated_at' => now()]);
        $this->mockVerifier()
            ->shouldReceive('dropAllTablesAfterVerification')
            ->once()
            ->with(Mockery::type(Tenant::class))
            ->andThrow(new \RuntimeException('ownership_marker_mismatch'));

        $this->expectExceptionMessage('ownership_marker_mismatch');

        try {
            app(PoolDatabaseProvisioner::class)->destroy($tenant);
        } finally {
            $this->assertDatabaseHas('tenant_database_pool', ['database_name' => 'tenant_existing', 'status' => 'failed', 'tenant_id' => $tenant->id, 'last_error' => 'ownership_marker_mismatch']);
        }
    }

    private function tenant(string $id, array $overrides = []): Tenant
    {
        return Tenant::create($overrides + [
            'id' => $id,
            'company_name' => 'Acme',
            'owner_name' => 'Owner',
            'owner_email' => $id.'@example.test',
            'status' => 'pending',
            'database_provisioning_mode' => 'pool',
        ]);
    }

    private function mockVerifier(): Mockery\MockInterface
    {
        $mock = Mockery::mock(TenantDatabaseConnectionVerifier::class);
        $this->app->instance(TenantDatabaseConnectionVerifier::class, $mock);

        return $mock;
    }
}
