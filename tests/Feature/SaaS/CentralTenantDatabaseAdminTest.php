<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\CentralAdmin;
use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\DatabaseProvisioning\PoolDatabaseValidator;
use App\Support\Installer\InstalledState;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;
use Mockery;
use Tests\TestCase;

class CentralTenantDatabaseAdminTest extends TestCase
{
    use RefreshDatabase;

    protected function tearDown(): void
    {
        InstalledState::clear();

        parent::tearDown();
    }

    public function test_tenant_database_index_shows_pool_summary_and_allocation_columns(): void
    {
        $this->signInCentralAdmin();
        TenantDatabasePool::create(['database_name' => 'tenant_ready', 'status' => 'available', 'validated_at' => now()]);
        TenantDatabasePool::create(['database_name' => 'tenant_allocated', 'status' => 'allocated', 'tenant_id' => 'tenant-a', 'validated_at' => now()]);
        TenantDatabasePool::create(['database_name' => 'tenant_failed', 'status' => 'failed', 'last_error' => 'pool_database_invalid']);

        $this->get('http://central.test/admin/tenant-databases')
            ->assertOk()
            ->assertInertia(fn (Assert $page) => $page
                ->component('Central/Resources/Index')
                ->where('resource', 'tenant-databases')
                ->where('summary.available', 1)
                ->where('summary.allocated', 1)
                ->where('summary.failed', 1)
                ->where('summary.total', 3)
                ->where('columns.3', 'tenant_id')
            );
    }

    public function test_failed_unallocated_pool_database_can_be_revalidated(): void
    {
        $this->signInCentralAdmin();
        $pool = TenantDatabasePool::create([
            'database_name' => 'tenant_repair',
            'username' => 'tenant_user',
            'password' => 'tenant_pass',
            'status' => 'failed',
            'last_error' => 'pool_database_invalid',
        ]);
        $validatedAt = now();
        $validator = Mockery::mock(PoolDatabaseValidator::class);
        $validator->shouldReceive('validate')
            ->once()
            ->with(Mockery::on(fn (array $data): bool => $data['database_name'] === 'tenant_repair'
                && $data['username'] === 'tenant_user'
                && $data['password'] === 'tenant_pass'))
            ->andReturn([
                'database_name' => 'tenant_repair',
                'username' => 'tenant_user',
                'password' => 'tenant_pass',
                'status' => 'available',
                'validated_at' => $validatedAt,
                'last_error' => null,
            ]);
        $this->app->instance(PoolDatabaseValidator::class, $validator);

        $this->post("http://central.test/admin/tenant-databases/{$pool->id}/revalidate")
            ->assertRedirect();

        $pool->refresh();
        $this->assertSame('available', $pool->status);
        $this->assertNull($pool->last_error);
        $this->assertNotNull($pool->validated_at);
        $this->assertDatabaseHas('central_audit_logs', ['action' => 'tenant-databases.revalidated']);
        $audit = DB::table('central_audit_logs')->where('action', 'tenant-databases.revalidated')->latest('id')->first();
        $this->assertStringNotContainsString('tenant_user', (string) $audit->old_values.(string) $audit->new_values);
        $this->assertStringNotContainsString('tenant_pass', (string) $audit->old_values.(string) $audit->new_values);
    }

    public function test_allocated_pool_database_cannot_be_edited_deleted_or_revalidated(): void
    {
        $this->signInCentralAdmin();
        $pool = TenantDatabasePool::create([
            'database_name' => 'tenant_allocated',
            'status' => 'allocated',
            'tenant_id' => 'tenant-a',
            'validated_at' => now(),
        ]);

        $this->patch("http://central.test/admin/tenant-databases/{$pool->id}", [
            'database_name' => 'tenant_allocated',
        ])->assertStatus(409);

        $this->delete("http://central.test/admin/tenant-databases/{$pool->id}")
            ->assertStatus(409);

        $this->post("http://central.test/admin/tenant-databases/{$pool->id}/revalidate")
            ->assertStatus(409);
    }

    private function signInCentralAdmin(): void
    {
        config([
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'tenancy.central_domains' => ['central.test'],
        ]);
        InstalledState::mark();
        $admin = CentralAdmin::create([
            'name' => 'Operator',
            'email' => 'operator@example.test',
            'password' => 'hash',
            'role' => 'super_admin',
            'is_active' => true,
        ]);
        $this->actingAs($admin, 'central');
    }
}
