<?php

namespace Tests\Feature;

use App\Models\Branch;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BranchWarehouseObserverTest extends TestCase
{
    use RefreshDatabase;

    public function test_branch_creation_creates_one_system_generated_warehouse(): void
    {
        $branch = Branch::factory()->create([
            'code' => 'BRT',
            'name' => 'Biratnagar',
            'address' => 'Main Road',
            'active' => true,
        ]);

        $warehouse = $branch->warehouses()->where('is_system_generated', true)->first();

        $this->assertNotNull($warehouse);
        $this->assertSame('BRT-WH', $warehouse->code);
        $this->assertSame('Biratnagar Warehouse', $warehouse->name);
        $this->assertSame('Main Road', $warehouse->address);
        $this->assertTrue((bool) $warehouse->active);
        $this->assertSame(1, $branch->warehouses()->where('is_system_generated', true)->count());
    }
}
