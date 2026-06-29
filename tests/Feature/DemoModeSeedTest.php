<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class DemoModeSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_install_seeds_essentials_but_no_demo_transactions(): void
    {
        $this->seed(DatabaseSeeder::class);

        $this->assertGreaterThan(0, DB::table('product_units')->count());
        $this->assertDatabaseHas('contacts', ['code' => 'WALK-IN', 'name' => 'Walk-in Customer']);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('purchase_bills', 0);
    }

    public function test_normal_seed_has_no_demo_mode_switch(): void
    {
        config(['app.demo' => true]);
        $this->seed(DatabaseSeeder::class);

        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('purchase_bills', 0);
    }

    public function test_running_normal_seed_twice_is_idempotent(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);
        $this->assertSame(1, DB::table('contacts')->where('code', 'WALK-IN')->count());
    }

    public function test_pos_seeder_reuses_shared_walk_in_customer(): void
    {
        $this->seed(DatabaseSeeder::class);
        $this->seed(PosSeeder::class);

        $this->assertSame(1, DB::table('contacts')->where('code', 'WALK-IN')->count());
        $this->assertNotNull(DB::table('contacts')->where('code', 'WALK-IN')->value('account_id'));
    }
}
