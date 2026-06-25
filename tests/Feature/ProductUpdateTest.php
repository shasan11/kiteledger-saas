<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Database\Seeders\MasterDocumentNumberingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductUpdateTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MasterDocumentNumberingSeeder::class);

        $this->user = User::factory()->create(['email_verified_at' => now()]);
    }

    /**
     * Regression: update() backfilled the model from array_keys($this->storeRules),
     * which includes nested validation keys (variant_groups.*.variant_id, ...).
     * Those leaked into forceFill()/save() and produced invalid UPDATE SQL
     * (MySQL 1064). Any product update — even a plain one — was affected.
     */
    public function test_simple_product_update_persists_without_sql_error(): void
    {
        $product = Product::query()->create([
            'name' => 'Desk Lamp',
            'product_type' => 'simple',
            'sku' => 'PRD-DESK-LAMP-0001',
            'purchase_price' => 500,
            'selling_price' => 800,
            'track_inventory' => true,
            'allow_sale' => true,
            'allow_purchase' => true,
            'active' => true,
        ]);

        $response = $this->actingAs($this->user)->putJson("/api/products/{$product->id}", [
            'name' => 'Desk Lamp',
            'product_type' => 'simple',
            'purchase_price' => 1200,
            'selling_price' => 1200,
        ]);

        $response->assertOk();

        $this->assertDatabaseHas('products', [
            'id' => $product->id,
            'purchase_price' => 1200,
            'selling_price' => 1200,
        ]);
    }
}
