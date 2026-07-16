<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\Tenant;
use App\Services\SaaS\DatabaseProvisioning\CpanelUapiDatabaseProvisioner;
use App\Services\SaaS\DatabaseProvisioning\TenantDatabaseConnectionVerifier;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Mockery;
use Tests\TestCase;

class CpanelUapiDatabaseProvisionerTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        config([
            'saas.database.cpanel.host' => 'https://cpanel.test',
            'saas.database.cpanel.port' => 2083,
            'saas.database.cpanel.username' => 'cpuser',
            'saas.database.cpanel.token' => 'token-secret',
            'saas.database.cpanel.database_user' => 'dbuser',
            'saas.database.cpanel.database_password' => 'tenant-pass',
            'database.connections.sqlite.username' => 'central-user',
            'database.connections.sqlite.password' => 'central-pass',
        ]);
    }

    public function test_successful_cpanel_provisioning_creates_grants_and_stores_effective_credentials(): void
    {
        $tenant = $this->tenantWithDatabase('tenant_acme');
        $connections = Mockery::mock(TenantDatabaseConnectionVerifier::class);
        $connections->shouldReceive('createOrVerifyOwnership')->once()->with(Mockery::type(Tenant::class), 'cpanel_uapi');
        $this->app->instance(TenantDatabaseConnectionVerifier::class, $connections);

        Http::fake([
            'https://cpanel.test:2083/execute/Mysql/list_databases' => Http::response(['result' => ['status' => 1, 'data' => []]]),
            'https://cpanel.test:2083/execute/Mysql/create_database*' => Http::response(['result' => ['status' => 1]]),
            'https://cpanel.test:2083/execute/Mysql/set_privileges_on_database*' => Http::response(['result' => ['status' => 1]]),
        ]);

        app(CpanelUapiDatabaseProvisioner::class)->provision($tenant);

        $tenant->refresh();
        $this->assertSame('cpuser_tenant_acme', $tenant->database_name);
        $this->assertSame('cpuser_dbuser', $tenant->database_username);
        $this->assertSame('tenant-pass', $tenant->database_password);
        $this->assertSame('cpanel_uapi', $tenant->database_provisioning_mode);
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'Mysql/create_database'));
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'Mysql/set_privileges_on_database'));
    }

    public function test_existing_cpanel_database_must_verify_ownership_and_is_not_recreated(): void
    {
        $tenant = $this->tenantWithDatabase('tenant_acme');
        $connections = Mockery::mock(TenantDatabaseConnectionVerifier::class);
        $connections->shouldReceive('verifyOwnership')->once()->with(Mockery::type(Tenant::class));
        $connections->shouldNotReceive('createOrVerifyOwnership');
        $this->app->instance(TenantDatabaseConnectionVerifier::class, $connections);

        Http::fake([
            'https://cpanel.test:2083/execute/Mysql/list_databases' => Http::response(['result' => ['status' => 1, 'data' => [['database' => 'cpuser_tenant_acme']]]]),
            'https://cpanel.test:2083/execute/Mysql/set_privileges_on_database*' => Http::response(['result' => ['status' => 1]]),
        ]);

        app(CpanelUapiDatabaseProvisioner::class)->provision($tenant);

        Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'Mysql/create_database'));
        Http::assertSent(fn (Request $request) => str_contains($request->url(), 'Mysql/set_privileges_on_database'));
    }

    public function test_new_cpanel_database_is_cleaned_up_when_privilege_assignment_fails(): void
    {
        $tenant = $this->tenantWithDatabase('tenant_acme');

        Http::fake([
            'https://cpanel.test:2083/execute/Mysql/list_databases' => Http::response(['result' => ['status' => 1, 'data' => []]]),
            'https://cpanel.test:2083/execute/Mysql/create_database*' => Http::response(['result' => ['status' => 1]]),
            'https://cpanel.test:2083/execute/Mysql/set_privileges_on_database*' => Http::response(['result' => ['status' => 0, 'errors' => ['nope']]]),
            'https://cpanel.test:2083/execute/Mysql/delete_database*' => Http::response(['result' => ['status' => 1]]),
        ]);

        $this->expectExceptionMessage('cpanel_privilege_assignment_failed');

        try {
            app(CpanelUapiDatabaseProvisioner::class)->provision($tenant);
        } finally {
            Http::assertSent(fn (Request $request) => str_contains($request->url(), 'Mysql/delete_database'));
        }
    }

    public function test_existing_cpanel_database_is_not_deleted_when_privilege_assignment_fails(): void
    {
        $tenant = $this->tenantWithDatabase('tenant_acme');

        Http::fake([
            'https://cpanel.test:2083/execute/Mysql/list_databases' => Http::response(['result' => ['status' => 1, 'data' => [['database' => 'cpuser_tenant_acme']]]]),
            'https://cpanel.test:2083/execute/Mysql/set_privileges_on_database*' => Http::response(['result' => ['status' => 0, 'errors' => ['nope']]]),
        ]);

        $this->expectExceptionMessage('cpanel_privilege_assignment_failed');

        try {
            app(CpanelUapiDatabaseProvisioner::class)->provision($tenant);
        } finally {
            Http::assertNotSent(fn (Request $request) => str_contains($request->url(), 'Mysql/delete_database'));
        }
    }

    private function tenantWithDatabase(string $databaseName): Tenant
    {
        $tenant = Tenant::create([
            'id' => 'tenant-'.str_replace('_', '-', $databaseName),
            'company_name' => 'Acme',
            'owner_name' => 'Owner',
            'owner_email' => 'owner@example.test',
            'status' => 'pending',
            'database_name' => $databaseName,
            'database_provisioning_mode' => 'cpanel_uapi',
        ]);
        $tenant->setInternal('db_name', $databaseName);
        $tenant->save();

        return $tenant;
    }
}
