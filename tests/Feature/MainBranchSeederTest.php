<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\Warehouse;
use Database\Seeders\BranchSeeder;
use Database\Seeders\MainBranchSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MainBranchSeederTest extends TestCase
{
    use RefreshDatabase;

    public function test_main_branch_seeders_create_one_branch_and_one_warehouse(): void
    {
        $this->seed(MainBranchSeeder::class);
        $this->seed(BranchSeeder::class);

        $branch = Branch::query()->sole();
        $warehouse = Warehouse::query()->sole();

        $this->assertTrue($branch->is_head_office);
        $this->assertSame($branch->id, $warehouse->branch_id);
        $this->assertSame('MAIN-WH', $warehouse->code);
    }
}
