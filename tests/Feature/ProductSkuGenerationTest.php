<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductUnit;
use App\Models\User;
use Database\Seeders\MasterDocumentNumberingSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ProductSkuGenerationTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();

        $this->seed(MasterDocumentNumberingSeeder::class);

        // Product routes live inside the ['web','auth','verified'] group.
        $this->user = User::factory()->create(['email_verified_at' => now()]);
    }

    public function test_service_sku_is_generated_when_missing(): void
    {
        $category = ProductCategory::query()->create([
            'name' => 'Consulting',
            'active' => true,
        ]);
        $unit = ProductUnit::query()->create([
            'name' => 'Hour',
            'short_name' => 'HR',
            'active' => true,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/products', [
            'name' => 'Implementation Service',
            'product_type' => 'service',
            'product_category_id' => $category->id,
            'product_unit_id' => $unit->id,
            'selling_price' => 1000,
            'purchase_price' => 0,
            'track_inventory' => false,
            'allow_sale' => true,
            'allow_purchase' => false,
            'active' => true,
        ]);

        $response->assertCreated();

        $this->assertSame(
            'SVC-IMPLEMENTATION-SERVICE-0001',
            Product::query()->where('name', 'Implementation Service')->value('sku')
        );
    }

    public function test_generated_service_sku_increments_when_name_repeats(): void
    {
        Product::query()->create([
            'name' => 'Implementation Service',
            'product_type' => 'service',
            'sku' => 'SVC-IMPLEMENTATION-SERVICE-0001',
            'track_inventory' => false,
            'allow_sale' => true,
            'allow_purchase' => false,
            'active' => true,
        ]);

        $response = $this->actingAs($this->user)->postJson('/api/products', [
            'name' => 'Implementation Service',
            'product_type' => 'service',
            'track_inventory' => false,
            'allow_sale' => true,
            'allow_purchase' => false,
            'active' => true,
        ]);

        $response->assertCreated();

        $this->assertSame('SVC-IMPLEMENTATION-SERVICE-0002', $response->json('sku'));
    }
}
