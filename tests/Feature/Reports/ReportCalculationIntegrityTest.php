<?php

namespace Tests\Feature\Reports;

use App\Models\Permission;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReportCalculationIntegrityTest extends TestCase
{
    use RefreshDatabase;

    public function test_sales_tax_receivable_and_inventory_reports_use_canonical_scopes(): void
    {
        Permission::findOrCreate('reports.view', 'web');
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        $now = now();
        $branch = (string) Str::uuid();
        $warehouse = (string) Str::uuid();
        $contact = (string) Str::uuid();
        $productA = (string) Str::uuid();
        $productB = (string) Str::uuid();
        $invoice = (string) Str::uuid();
        $draft = (string) Str::uuid();

        DB::table('branches')->insert(['id' => $branch, 'code' => 'RPT', 'name' => 'Report Branch', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('warehouses')->insert(['id' => $warehouse, 'branch_id' => $branch, 'code' => 'RPT-WH', 'name' => 'Report Warehouse', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        DB::table('contacts')->insert(['id' => $contact, 'contact_type' => 'customer', 'name' => 'Report Customer', 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        foreach ([[$productA, 'Taxed Product', 'TP'], [$productB, 'Zero Tax Product', 'ZP']] as [$id, $name, $code]) {
            DB::table('products')->insert(['id' => $id, 'name' => $name, 'code' => $code, 'active' => true, 'created_at' => $now, 'updated_at' => $now]);
        }

        DB::table('invoices')->insert([
            ['id' => $invoice, 'branch_id' => $branch, 'invoice_no' => 'INV-OK', 'invoice_date' => '2026-06-01', 'contact_id' => $contact, 'warehouse_id' => $warehouse, 'total' => 163, 'status' => 'posted', 'approved' => true, 'void' => false, 'created_at' => $now, 'updated_at' => $now],
            ['id' => $draft, 'branch_id' => $branch, 'invoice_no' => 'INV-DRAFT', 'invoice_date' => '2026-06-01', 'contact_id' => $contact, 'warehouse_id' => $warehouse, 'total' => 999, 'status' => 'draft', 'approved' => false, 'void' => false, 'created_at' => $now, 'updated_at' => $now],
        ]);
        DB::table('invoice_lines')->insert([
            ['id' => (string) Str::uuid(), 'invoice_id' => $invoice, 'product_id' => $productA, 'product_name' => 'Taxed Product', 'qty' => 1, 'unit_price' => 100, 'tax_amount' => 13, 'line_total' => 113, 'created_at' => $now, 'updated_at' => $now],
            ['id' => (string) Str::uuid(), 'invoice_id' => $invoice, 'product_id' => $productB, 'product_name' => 'Zero Tax Product', 'qty' => 1, 'unit_price' => 50, 'tax_amount' => 0, 'line_total' => 50, 'created_at' => $now, 'updated_at' => $now],
            ['id' => (string) Str::uuid(), 'invoice_id' => $draft, 'product_id' => $productA, 'product_name' => 'Taxed Product', 'qty' => 1, 'unit_price' => 999, 'tax_amount' => 0, 'line_total' => 999, 'created_at' => $now, 'updated_at' => $now],
        ]);

        foreach ([['PAY-PAST', '2026-06-15', 30], ['PAY-FUTURE', '2026-07-15', 100]] as [$number, $date, $amount]) {
            $payment = (string) Str::uuid();
            DB::table('customer_payments')->insert(['id' => $payment, 'branch_id' => $branch, 'payment_no' => $number, 'payment_date' => $date, 'contact_id' => $contact, 'amount' => $amount, 'total' => $amount, 'status' => 'posted', 'approved' => true, 'void' => false, 'created_at' => $now, 'updated_at' => $now]);
            DB::table('customer_payment_lines')->insert(['id' => (string) Str::uuid(), 'customer_payment_id' => $payment, 'invoice_id' => $invoice, 'allocated_amount' => $amount, 'created_at' => $now, 'updated_at' => $now]);
        }

        foreach ([[$productA, 5], [$productB, 7]] as [$product, $balance]) {
            DB::table('inventory_ledgers')->insert([
                'id' => (string) Str::uuid(), 'branch_id' => $branch, 'warehouse_id' => $warehouse, 'product_id' => $product,
                'transaction_date' => '2026-06-05', 'source_type' => 'opening', 'source_id' => (string) Str::uuid(),
                'movement_type' => 'in', 'qty_in' => $balance, 'qty_out' => 0, 'unit_cost' => 10,
                'value_in' => $balance * 10, 'value_out' => 0, 'balance_qty' => $balance, 'balance_value' => $balance * 10,
                'created_at' => $now, 'updated_at' => $now,
            ]);
        }

        $user = User::factory()->create(['branch_id' => $branch]);
        $user->givePermissionTo('reports.view');
        $this->actingAs($user);
        $period = '?date_from=2026-06-01&date_to=2026-06-30&as_of_date=2026-06-30&ageing_as_of_date=2026-06-30';

        $this->getJson('/api/reports/tax/sales-register'.$period)
            ->assertOk()->assertJsonCount(1, 'rows')
            ->assertJsonPath('totals.taxable_amount', 100)
            ->assertJsonPath('totals.non_taxable_amount', 50)
            ->assertJsonPath('totals.vat_amount', 13)
            ->assertJsonPath('totals.total', 163);

        $this->getJson('/api/reports/receivable/customer-receivable-summary'.$period)
            ->assertOk()->assertJsonPath('rows.0.invoice_total', 163)
            ->assertJsonPath('rows.0.paid_total', 30)
            ->assertJsonPath('rows.0.balance_due', 133);

        $this->getJson('/api/reports/sales/sales-by-item'.$period)
            ->assertOk()->assertJsonCount(2, 'rows');

        $this->getJson('/api/reports/inventory/inventory-movement'.$period)
            ->assertOk()->assertJsonCount(2, 'rows')
            ->assertJsonPath('rows.0.balance_qty', 5)
            ->assertJsonPath('rows.1.balance_qty', 7);
    }
}
