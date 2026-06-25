<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

/**
 * Verifies the two install modes:
 *  - Demo OFF (default): lightweight seed — essentials present, no demo records.
 *  - Demo decision logic respects config('app.demo') / APP_DEMO / DEMO_MODE.
 *
 * The full DemoSeeder is intentionally NOT run here (it is heavy by design);
 * its routing is covered by asserting demoModeEnabled() instead.
 */
class DemoModeSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_install_seeds_essentials_but_no_demo_transactions(): void
    {
        config(['app.demo' => false]);

        $this->seed(DatabaseSeeder::class);

        // Essential lightweight setup data is present...
        $this->assertGreaterThan(0, DB::table('product_units')->count(), 'Product units should be seeded.');
        $this->assertDatabaseHas('contacts', [
            'code' => 'WALK-IN',
            'name' => 'Walk-in Customer',
        ]);

        // ...but NO heavy demo business transactions were created.
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('purchase_bills', 0);
    }

    public function test_running_normal_seed_twice_is_idempotent_for_walk_in_customer(): void
    {
        config(['app.demo' => false]);

        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertSame(1, DB::table('contacts')->where('code', 'WALK-IN')->count());
    }

    public function test_pos_seeder_reuses_shared_walk_in_customer_without_duplicates(): void
    {
        // PosSeeder (used by DemoSeeder) now delegates to WalkInCustomerSeeder.
        // The normal seed already created the walk-in customer, so re-running
        // POS seeding must not duplicate it and must keep the linked account.
        config(['app.demo' => false]);
        $this->seed(DatabaseSeeder::class);

        $this->seed(PosSeeder::class);

        $this->assertSame(1, DB::table('contacts')->where('code', 'WALK-IN')->count());
        $this->assertNotNull(
            DB::table('contacts')->where('code', 'WALK-IN')->value('account_id'),
            'Walk-in customer should be linked to a receivable account.'
        );
    }

    public function test_demo_mode_decision_follows_config_flag(): void
    {
        $seeder = new DatabaseSeeder();

        config(['app.demo' => true]);
        $this->assertTrue($seeder->demoModeEnabled());

        config(['app.demo' => false]);
        $this->assertFalse($seeder->demoModeEnabled());
    }

    public function test_demo_mode_decision_falls_back_to_env(): void
    {
        config(['app.demo' => false]);
        $seeder = new DatabaseSeeder();

        putenv('APP_DEMO=true');
        $_ENV['APP_DEMO'] = 'true';
        $_SERVER['APP_DEMO'] = 'true';

        try {
            $this->assertTrue($seeder->demoModeEnabled());
        } finally {
            putenv('APP_DEMO');
            unset($_ENV['APP_DEMO'], $_SERVER['APP_DEMO']);
        }
    }
}
