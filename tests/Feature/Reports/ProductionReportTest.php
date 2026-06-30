<?php

namespace Tests\Feature\Reports;

use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ProductionReportTest extends TestCase
{
    use RefreshDatabase;

    public function test_production_reports_use_real_planned_actual_and_stock_data(): void
    {
        Permission::findOrCreate('reports.inventory.view', 'web');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $branch = (string) Str::uuid();
        $warehouse = (string) Str::uuid();
        $finished = (string) Str::uuid();
        $material = (string) Str::uuid();
        $order = (string) Str::uuid();
        $journal = (string) Str::uuid();
        $now = now();

        DB::table('branches')->insert(['id' => $branch, 'code' => 'MFG', 'name' => 'Manufacturing', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('warehouses')->insert(['id' => $warehouse, 'branch_id' => $branch, 'code' => 'MAIN', 'name' => 'Main Warehouse', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        foreach ([[$finished, 'Finished Box', 'FG-1'], [$material, 'Cardboard', 'RM-1']] as [$id, $name, $code]) {
            DB::table('products')->insert(['id' => $id, 'name' => $name, 'code' => $code, 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }

        DB::table('production_orders')->insert([
            'id' => $order, 'branch_id' => $branch, 'code' => 'PO-001', 'date' => '2026-06-15',
            'finished_product_id' => $finished, 'warehouse_id' => $warehouse, 'output_quantity' => 5,
            'total_production_cost' => 100, 'status' => 'approved', 'approved' => true, 'void' => false,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('production_order_raw_materials')->insert([
            'id' => (string) Str::uuid(), 'production_order_id' => $order, 'product_id' => $material,
            'warehouse_id' => $warehouse, 'quantity' => 10, 'unit_cost' => 10, 'total_cost' => 100,
            'created_at' => $now, 'updated_at' => $now,
        ]);

        DB::table('production_journals')->insert([
            'id' => $journal, 'branch_id' => $branch, 'code' => 'PJ-001', 'date' => '2026-06-20',
            'finished_product_id' => $finished, 'warehouse_id' => $warehouse, 'output_quantity' => 5,
            'raw_material_cost' => 120, 'total_cost_of_production' => 120, 'finished_goods_cost' => 120,
            'cost_per_unit' => 24, 'status' => 'posted', 'approved' => true, 'stock_posted' => true, 'void' => false,
            'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('production_journal_raw_materials')->insert([
            'id' => (string) Str::uuid(), 'production_journal_id' => $journal, 'product_id' => $material,
            'quantity' => 12, 'rate' => 10, 'amount' => 120, 'created_at' => $now, 'updated_at' => $now,
        ]);
        DB::table('warehouse_items')->insert([
            'id' => (string) Str::uuid(), 'branch_id' => $branch, 'warehouse_id' => $warehouse,
            'product_id' => $material, 'qty_on_hand' => 6, 'avg_cost' => 10, 'total_value' => 60,
            'active' => true, 'created_at' => $now, 'updated_at' => $now,
        ]);

        $user = User::factory()->create(['branch_id' => $branch]);
        $user->givePermissionTo('reports.inventory.view');
        $query = '?date_from=2026-06-01&date_to=2026-06-30';

        $this->actingAs($user)->getJson('/api/reports/production/production-summary'.$query)
            ->assertOk()
            ->assertJsonPath('rows.0.production_order_no', 'PJ-001')
            ->assertJsonPath('rows.0.produced_qty', 5)
            ->assertJsonPath('totals.total_cost', 120);

        $this->actingAs($user)->getJson('/api/reports/production/production-variance'.$query)
            ->assertOk()
            ->assertJsonPath('rows.0.planned_material_qty', 10)
            ->assertJsonPath('rows.0.actual_material_qty', 12)
            ->assertJsonPath('rows.0.cost_variance', 20)
            ->assertJsonPath('rows.0.variance_percent', 20);

        $this->actingAs($user)->getJson('/api/reports/production/production-planning'.$query)
            ->assertOk()
            ->assertJsonPath('rows.0.material', 'Cardboard')
            ->assertJsonPath('rows.0.required_qty', 10)
            ->assertJsonPath('rows.0.available_stock', 6)
            ->assertJsonPath('rows.0.shortage_qty', 4);
    }
}
