<?php

namespace Tests\Feature\SaaS;

use App\Enums\TenantStatus;
use App\Http\Middleware\EnsureCentralDomain;
use App\Http\Middleware\EnsureTenantIsActive;
use App\Models\Central\CentralAdmin;
use App\Models\Tenant;
use App\Support\Installer\InstalledState;
use App\Services\SaaS\DatabaseProvisioning\ManualDatabaseProvisioner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class DatabasePerTenantContractTest extends TestCase
{
    use RefreshDatabase;

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

    public function test_central_domains_are_parsed_from_environment_config(): void
    {
        $this->assertSame(['central.test'], config('tenancy.central_domains'));
    }

    public function test_unknown_central_domain_returns_not_found(): void
    {
        config(['tenancy.central_domains' => ['central.test']]);
        $request = Request::create('https://tenant.test/superadmin');

        $this->expectException(\Symfony\Component\HttpKernel\Exception\NotFoundHttpException::class);
        app(EnsureCentralDomain::class)->handle($request, fn () => response('unsafe'));
    }

    public function test_tenant_model_encrypts_and_hides_database_password(): void
    {
        $tenant = Tenant::query()->create([
            'id' => 'contract-tenant', 'company_name' => 'Contract', 'slug' => 'contract',
            'owner_name' => 'Owner', 'owner_email' => 'owner@contract.test',
            'status' => TenantStatus::Pending, 'tenancy_db_password' => 'super-secret',
        ]);

        $this->assertArrayNotHasKey('tenancy_db_password', $tenant->toArray());
        $this->assertNotSame('super-secret', $tenant->getRawOriginal('tenancy_db_password'));
        $this->assertSame('super-secret', Crypt::decryptString($tenant->getRawOriginal('tenancy_db_password')));
    }

    public function test_suspended_tenant_is_inactive(): void
    {
        $tenant = Tenant::query()->create(['id' => 'suspended-contract', 'company_name' => 'Suspended', 'slug' => 'suspended', 'owner_name' => 'Owner', 'owner_email' => 'owner@suspended.test', 'status' => TenantStatus::Suspended]);

        $this->assertFalse($tenant->isActive());
    }

    public function test_manual_database_verification_does_not_log_credentials(): void
    {
        config(['database.connections.tenant_template' => config('database.connections.sqlite') + ['database' => ':memory:']]);
        $records = [];
        Log::listen(function (string $level, string $message, array $context) use (&$records): void {
            $records[] = compact('level', 'message', 'context');
        });

        app(ManualDatabaseProvisioner::class)->verify([
            'host' => 'localhost', 'port' => 3306, 'database' => ':memory:',
            'username' => 'tenant-user', 'password' => 'never-log-this-secret',
        ]);

        $this->assertStringNotContainsString('never-log-this-secret', json_encode($records, JSON_THROW_ON_ERROR));
    }

    public function test_installer_tenancy_status_endpoint_works(): void
    {
        $this->getJson('/install/tenancy/status')
            ->assertOk()
            ->assertJsonStructure(['installed', 'requirements', 'permissions', 'tenant_provisioning_mode']);
    }

    public function test_license_endpoint_is_valid_when_validation_is_disabled(): void
    {
        config(['installer.license_validation_enabled' => false]);
        $this->postJson('/install/tenancy/license', ['purchase_code' => 'not-transmitted'])
            ->assertOk()->assertExactJson(['valid' => true]);
    }

    public function test_tenant_routes_require_an_active_tenant_context(): void
    {
        config(['saas.allow_uninitialized_tenant_models' => false]);
        $response = app(EnsureTenantIsActive::class)->handle(
            Request::create('/dashboard', 'GET', server: ['HTTP_ACCEPT' => 'application/json']),
            fn () => response('unsafe'),
        );

        $this->assertSame(404, $response->getStatusCode());
    }

    public function test_central_and_tenant_guards_use_separate_providers(): void
    {
        $this->assertSame('central_admins', config('auth.guards.central.provider'));
        $this->assertSame('tenant_users', config('auth.guards.tenant.provider'));
        $this->assertSame(CentralAdmin::class, config('auth.providers.central_admins.model'));
        $this->assertNotSame(config('auth.providers.central_admins.model'), config('auth.providers.tenant_users.model'));
        $this->assertSame('central_password_reset_tokens', config('auth.passwords.central_users.table'));
        $this->assertSame('password_reset_tokens', config('auth.passwords.tenant_users.table'));
    }
}
