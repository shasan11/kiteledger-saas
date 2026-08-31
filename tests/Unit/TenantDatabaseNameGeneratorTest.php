<?php

namespace Tests\Unit;

use App\Models\Central\Tenant;
use App\Models\Central\TenantDatabasePool;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseNameGenerator;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseNameValidator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TenantDatabaseNameGeneratorTest extends TestCase
{
    use RefreshDatabase;

    public function test_generated_database_names_are_valid_short_and_unique(): void
    {
        config(['tenancy.database.prefix' => 'cpuser_klt_', 'tenancy.database.suffix' => '_prod']);

        $name = app(TenantDatabaseNameGenerator::class)->generate('Acme Company!');

        $this->assertMatchesRegularExpression('/^[A-Za-z0-9_]{1,64}$/', $name);
        $this->assertStringStartsWith('cpuser_klt_', $name);
        $this->assertStringEndsWith('_prod', $name);
        $this->assertLessThanOrEqual(64, strlen($name));
    }

    public function test_validator_rejects_central_database_and_pool_collisions(): void
    {
        config(['database.connections.sqlite.database' => 'central_db']);
        TenantDatabasePool::create(['database_name' => 'tenant_taken', 'status' => 'available']);

        $validator = app(TenantDatabaseNameValidator::class);

        try {
            $validator->assertValid('central_db');
            $this->fail('Central database name should be rejected.');
        } catch (\RuntimeException $e) {
            $this->assertSame('central_database_rejected', $e->getMessage());
        }

        try {
            $validator->assertUnique('tenant_taken');
            $this->fail('Registered pool database name should be rejected.');
        } catch (\RuntimeException $e) {
            $this->assertSame('database_name_collision', $e->getMessage());
        }
    }

    public function test_generator_avoids_existing_tenant_database_names(): void
    {
        config(['tenancy.database.prefix' => 'tenant_', 'tenancy.database.suffix' => '']);
        Tenant::create(['id' => 'existing', 'company_name' => 'Existing', 'owner_name' => 'Owner', 'owner_email' => 'owner@example.test', 'status' => 'pending', 'database_name' => 'tenant_existing_aaaaaaaaaaaa']);

        $name = app(TenantDatabaseNameGenerator::class)->generate('existing');

        $this->assertNotSame('tenant_existing_aaaaaaaaaaaa', $name);
        $this->assertMatchesRegularExpression('/^tenant_existing_[a-z0-9]{12}$/', $name);
    }
}
