<?php

namespace Tests\Feature\SaaS;

use App\Http\Middleware\EnsureTenantDomainIsVerified;
use App\Models\Central\DefaultDataTemplate;
use App\Models\Central\Plan;
use App\Models\Central\ProvisioningLog;
use App\Models\Central\Tenant;
use App\Services\SaaS\CentralNotificationService;
use App\Services\SaaS\DefaultTemplateService;
use App\Services\SaaS\SubscriptionService;
use App\Services\SaaS\TenantDatabaseService;
use App\Services\SaaS\TenantDomainService;
use App\Services\SaaS\TenantLifecycleService;
use App\Services\SaaS\TenantProvisioningRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Mockery;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;
use Tests\TestCase;

class TenantProvisioningRunnerTest extends TestCase
{
    use RefreshDatabase;

    public function test_runner_completes_every_infrastructure_step_and_activates_the_tenant(): void
    {
        config(['saas.tenant_base_domain' => 'Example.Test.']);
        $plan = Plan::query()->create(['name' => 'Starter', 'slug' => 'runner-starter', 'currency' => 'USD', 'price_monthly' => 25, 'price_yearly' => 250]);
        $template = DefaultDataTemplate::query()->create(['name' => 'Default', 'slug' => 'runner-default', 'is_active' => true]);
        $tenant = $this->tenant(['plan_id' => $plan->id, 'default_template_id' => $template->id]);
        ProvisioningLog::query()->create(['tenant_id' => $tenant->id, 'step' => 'owner', 'status' => 'success']);

        $databases = Mockery::mock(TenantDatabaseService::class);
        $databases->shouldReceive('create')->once()->with(Mockery::type(Tenant::class));
        $databases->shouldReceive('syncConnectionValues')->once()->ordered()->andReturnUsing(
            fn (Tenant $value): Tenant => app(TenantDatabaseService::class)->syncConnectionValues($value),
        );
        $databases->shouldReceive('migrate')->once()->ordered()->withArgs(function (Tenant $value): bool {
            $value->refresh();
            $this->assertSame('tenant_template', $value->getInternal('db_connection'));
            $this->assertSame('tenant_runner', $value->getInternal('db_name'));
            $this->assertSame('127.0.0.1', $value->getInternal('db_host'));
            $this->assertSame(3306, (int) $value->getInternal('db_port'));
            $this->assertSame('runner_user', $value->getInternal('db_username'));
            $this->assertSame('runner_secret', $value->getInternal('db_password'));

            return true;
        });
        $databases->shouldReceive('seed')->once()->with(Mockery::type(Tenant::class));
        $templates = Mockery::mock(DefaultTemplateService::class);
        $templates->shouldReceive('apply')->once()->with(Mockery::type(Tenant::class), Mockery::on(fn ($value): bool => $value?->is($template)));
        $notifications = Mockery::mock(CentralNotificationService::class);
        $notifications->shouldReceive('notifyOnce')->once();

        $result = $this->runner($databases, $templates, $notifications)->run($tenant);

        $this->assertSame('active', $result->status);
        $this->assertNotNull($result->provisioned_at);
        $this->assertNull($result->provisioning_step);
        $this->assertDatabaseHas('domains', [
            'tenant_id' => $tenant->id,
            'domain' => 'runner.example.test',
            'type' => 'subdomain',
            'status' => 'active',
            'verification_status' => 'verified',
            'is_primary' => true,
        ]);
        $domain = $tenant->domains()->firstOrFail();
        $this->assertNotNull($domain->verified_at);
        $this->assertNotNull($domain->activated_at);
        $this->assertDatabaseHas('subscriptions', ['tenant_id' => $tenant->id, 'plan_id' => $plan->id]);
        $this->assertDatabaseHas('tenant_invoices', [
            'tenant_id' => $tenant->id,
            'plan_id' => $plan->id,
            'total' => 25,
            'balance' => 25,
            'status' => 'issued',
            'idempotency_key' => 'tenant:'.$tenant->id.':initial-invoice',
        ]);
        $this->assertDatabaseHas('tenant_provisioning_attempts', ['tenant_id' => $tenant->id, 'status' => 'succeeded']);
        foreach (['domain', 'database', 'migrations', 'seeders', 'template', 'owner', 'subscription', 'invoice', 'payment'] as $step) {
            $this->assertDatabaseHas('tenant_provisioning_logs', ['tenant_id' => $tenant->id, 'step' => $step, 'status' => 'success']);
        }
    }

    public function test_provisioning_owner_password_is_restored_as_a_virtual_attribute(): void
    {
        $encrypted = Crypt::encryptString('VerySecure!123');
        $tenant = $this->tenant([
            'data' => null,
            'provisioning_owner_password' => $encrypted,
        ]);

        $tenant = $tenant->fresh();

        $this->assertNull($tenant->data);
        $this->assertSame($encrypted, $tenant->provisioning_owner_password);
        $this->assertSame('VerySecure!123', Crypt::decryptString($tenant->provisioning_owner_password));
        $this->assertArrayNotHasKey('provisioning_owner_password', $tenant->toArray());
    }

    public function test_database_failure_is_recorded_and_marks_tenant_provisioning_failed(): void
    {
        $tenant = $this->tenant();
        $databases = Mockery::mock(TenantDatabaseService::class);
        $databases->shouldReceive('create')->once()->andThrow(new \RuntimeException('database_connection_failed'));
        $templates = Mockery::mock(DefaultTemplateService::class);
        $notifications = Mockery::mock(CentralNotificationService::class);
        $notifications->shouldReceive('notifyOnce')->once();

        try {
            $this->runner($databases, $templates, $notifications)->run($tenant);
            $this->fail('Provisioning should have failed.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('database_connection_failed', $exception->getMessage());
        }

        $tenant->refresh();
        $this->assertSame('provisioning_failed', $tenant->status);
        $this->assertSame('database', $tenant->provisioning_step);
        $this->assertSame('database_connection_failed', $tenant->status_reason);
        $this->assertDatabaseHas('tenant_provisioning_attempts', [
            'tenant_id' => $tenant->id,
            'status' => 'failed',
            'current_step' => 'database',
            'error_code' => 'database_connection_failed',
        ]);
    }

    public function test_migration_failure_records_the_specific_safe_error_code(): void
    {
        $tenant = $this->tenant();
        $databases = Mockery::mock(TenantDatabaseService::class);
        $databases->shouldReceive('create')->once();
        $databases->shouldReceive('syncConnectionValues')->once()->andReturnUsing(fn (Tenant $value): Tenant => $value);
        $databases->shouldReceive('migrate')->once()->andThrow(new \RuntimeException('tenant_migration_failed'));
        $templates = Mockery::mock(DefaultTemplateService::class);
        $notifications = Mockery::mock(CentralNotificationService::class);
        $notifications->shouldReceive('notifyOnce')->once();

        try {
            $this->runner($databases, $templates, $notifications)->run($tenant);
            $this->fail('Provisioning should have failed during migrations.');
        } catch (\RuntimeException $exception) {
            $this->assertSame('tenant_migration_failed', $exception->getMessage());
        }

        $tenant->refresh();
        $this->assertSame('provisioning_failed', $tenant->status);
        $this->assertSame('migrations', $tenant->provisioning_step);
        $this->assertDatabaseHas('tenant_provisioning_attempts', [
            'tenant_id' => $tenant->id,
            'status' => 'failed',
            'current_step' => 'migrations',
            'error_code' => 'tenant_migration_failed',
        ]);
    }

    public function test_retry_repairs_the_domain_without_creating_duplicates(): void
    {
        config(['saas.tenant_base_domain' => 'example.test']);
        $tenant = $this->tenant(['status' => 'provisioning_failed']);
        $tenant->domains()->create([
            'domain' => 'RUNNER.EXAMPLE.TEST.',
            'type' => 'subdomain',
            'status' => 'pending',
            'verification_status' => 'pending',
            'is_primary' => false,
        ]);
        foreach (['database', 'migrations', 'seeders', 'template', 'owner', 'subscription'] as $step) {
            ProvisioningLog::query()->create(['tenant_id' => $tenant->id, 'step' => $step, 'status' => 'success']);
        }
        $databases = Mockery::mock(TenantDatabaseService::class);
        $databases->shouldReceive('syncConnectionValues')->once()->andReturnUsing(fn (Tenant $value): Tenant => $value);
        $templates = Mockery::mock(DefaultTemplateService::class);
        $notifications = Mockery::mock(CentralNotificationService::class);
        $notifications->shouldReceive('notifyOnce')->once();

        $result = $this->runner($databases, $templates, $notifications)->run($tenant, true);

        $this->assertSame('active', $result->status);
        $this->assertSame(1, $tenant->domains()->count());
        $this->assertDatabaseHas('domains', [
            'tenant_id' => $tenant->id,
            'domain' => 'runner.example.test',
            'status' => 'active',
            'verification_status' => 'verified',
            'is_primary' => true,
        ]);
    }

    public function test_domain_middleware_normalizes_hosts_and_rejects_unknown_or_unverified_domains(): void
    {
        config(['tenancy.bootstrappers' => []]);
        $tenant = $this->tenant(['status' => 'active']);
        $tenant->domains()->create([
            'domain' => 'runner.example.test',
            'type' => 'subdomain',
            'status' => 'active',
            'verification_status' => 'verified',
            'verified_at' => now(),
            'activated_at' => now(),
            'is_primary' => true,
        ]);
        $tenant->domains()->create([
            'domain' => 'custom.example.net',
            'type' => 'custom',
            'status' => 'pending',
            'verification_status' => 'pending',
        ]);
        tenancy()->initialize($tenant);

        try {
            $middleware = app(EnsureTenantDomainIsVerified::class);
            $allowed = $middleware->handle(
                Request::create('https://RUNNER.EXAMPLE.TEST./login'),
                fn () => response('allowed'),
            );
            $this->assertSame(200, $allowed->getStatusCode());

            foreach (['https://unknown.example.test/login', 'https://custom.example.net/login'] as $url) {
                try {
                    $middleware->handle(Request::create($url), fn () => response('unsafe'));
                    $this->fail("{$url} should not be accessible.");
                } catch (NotFoundHttpException) {
                    $this->addToAssertionCount(1);
                }
            }
        } finally {
            tenancy()->end();
        }
    }

    private function tenant(array $overrides = []): Tenant
    {
        return Tenant::query()->create(array_merge([
            'id' => 'runner-tenant',
            'company_name' => 'Runner Company',
            'slug' => 'runner',
            'owner_name' => 'Runner Owner',
            'owner_email' => 'runner@example.test',
            'status' => 'pending',
            'database_name' => 'tenant_runner',
            'database_provisioning_mode' => 'manual',
            'tenancy_db_connection' => 'tenant_template',
            'tenancy_db_name' => 'tenant_runner',
            'tenancy_db_host' => '127.0.0.1',
            'tenancy_db_port' => 3306,
            'tenancy_db_username' => 'runner_user',
            'tenancy_db_password' => 'runner_secret',
            'data' => ['provisioning_owner_password' => Crypt::encryptString('VerySecure!123')],
        ], $overrides));
    }

    private function runner(TenantDatabaseService $databases, DefaultTemplateService $templates, CentralNotificationService $notifications): TenantProvisioningRunner
    {
        return new TenantProvisioningRunner(
            $templates,
            app(SubscriptionService::class),
            $databases,
            app(TenantLifecycleService::class),
            app(TenantDomainService::class),
            $notifications,
        );
    }
}
