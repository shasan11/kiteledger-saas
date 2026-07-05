<?php

namespace Tests\Feature\SaaS;

use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use App\Services\SaaS\LegacyCompanyMigrationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Tests\TestCase;

/**
 * In the testing environment the tenant ERP schema is loaded into the same
 * (central) connection as the SaaS platform tables, so we can exercise detection
 * and the non-destructive dry-run without provisioning a real tenant database.
 */
class LegacyCompanyMigrationTest extends TestCase
{
    use RefreshDatabase;

    private function service(): LegacyCompanyMigrationService
    {
        return app(LegacyCompanyMigrationService::class);
    }

    public function test_detects_fresh_saas_when_no_erp_data_present(): void
    {
        $this->assertSame('fresh_saas', $this->service()->detectInstallationType());
    }

    public function test_detects_legacy_install_when_erp_users_exist(): void
    {
        DB::table('users')->insert([
            'name' => 'Legacy Owner', 'username' => 'legacy', 'email' => 'legacy@example.test',
            'password' => bcrypt('secret'), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->assertSame('legacy_single_company', $this->service()->detectInstallationType());
    }

    public function test_detects_already_migrated_when_tenant_exists(): void
    {
        Tenant::create(['company_name' => 'Acme', 'owner_name' => 'A', 'owner_email' => 'a@b.test', 'status' => 'active']);

        $this->assertSame('already_migrated', $this->service()->detectInstallationType());
    }

    public function test_planned_tables_exclude_central_and_framework_tables(): void
    {
        $tables = $this->service()->plannedTables();

        $this->assertContains('invoices', $tables);
        $this->assertContains('users', $tables);
        $this->assertContains('branches', $tables);
        $this->assertNotContains('tenants', $tables);
        $this->assertNotContains('plans', $tables);
        $this->assertNotContains('migrations', $tables);
        $this->assertNotContains('legacy_migration_runs', $tables);
    }

    public function test_dry_run_reports_counts_and_touches_no_tenant_database(): void
    {
        Plan::create(['name' => 'Starter', 'slug' => 'starter', 'currency' => 'USD']);
        DB::table('users')->insert([
            'name' => 'Legacy Owner', 'username' => 'legacy', 'email' => 'legacy@example.test',
            'password' => bcrypt('secret'), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $result = $this->service()->run([
            'company_name' => 'Legacy Co', 'owner_name' => 'Legacy Owner',
            'owner_email' => 'legacy@example.test', 'subdomain' => 'legacyco',
        ], dryRun: true);

        $this->assertTrue($result['dry_run']);
        $this->assertSame(1, $result['verification']['users']);
        // No tenant record or database is created during a dry run.
        $this->assertSame(0, Tenant::count());
        $this->assertDatabaseHas('legacy_migration_runs', ['id' => $result['run_id'], 'status' => 'completed', 'dry_run' => true]);
    }

    public function test_dry_run_rejects_reserved_subdomain(): void
    {
        DB::table('users')->insert([
            'name' => 'Owner', 'username' => 'owner', 'email' => 'o@example.test',
            'password' => bcrypt('secret'), 'created_at' => now(), 'updated_at' => now(),
        ]);

        $this->expectException(ValidationException::class);
        $this->service()->run([
            'company_name' => 'X', 'owner_name' => 'Y', 'owner_email' => 'o@example.test', 'subdomain' => 'admin',
        ], dryRun: true);
    }
}
