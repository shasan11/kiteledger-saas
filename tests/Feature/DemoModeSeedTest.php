<?php

namespace Tests\Feature;

use Database\Seeders\DatabaseSeeder;
use Database\Seeders\PosSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use Tests\TestCase;

#[RunTestsInSeparateProcesses]
#[PreserveGlobalState(false)]
class DemoModeSeedTest extends TestCase
{
    use RefreshDatabase;

    public function test_normal_install_seeds_essentials_without_demo_transactions_and_is_idempotent(): void
    {
        config(['app.demo' => true]);

        $this->seed(DatabaseSeeder::class);
        $this->seed(DatabaseSeeder::class);

        $this->assertGreaterThan(0, DB::table('product_units')->count());
        $this->assertDatabaseHas('contacts', ['code' => 'WALK-IN', 'name' => 'Walk-in Customer']);
        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseCount('purchase_bills', 0);
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
