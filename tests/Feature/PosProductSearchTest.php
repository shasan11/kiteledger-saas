<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PosProductSearchTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_product_search_only_returns_saleable_products_and_services(): void
    {
        $user = User::factory()->create();
        $user->setAttribute('is_super_admin', true);

        Product::withoutEvents(function () {
            Product::query()->create([
                'name' => 'Sale Service',
                'code' => 'SALE-SVC',
                'sku' => 'SALE-SVC',
                'product_type' => 'service',
                'selling_price' => 100,
                'track_inventory' => false,
                'allow_sale' => true,
                'allow_purchase' => false,
                'active' => true,
            ]);

            Product::query()->create([
                'name' => 'Purchase Only Product',
                'code' => 'PUR-ONLY',
                'sku' => 'PUR-ONLY',
                'product_type' => 'simple',
                'selling_price' => 100,
                'track_inventory' => false,
                'allow_sale' => false,
                'allow_purchase' => true,
                'active' => true,
            ]);
        });

        $response = $this->actingAs($user)->getJson('/api/pos/products/search');

        $response->assertOk();
        $this->assertContains('Sale Service', collect($response->json())->pluck('name')->all());
        $this->assertNotContains('Purchase Only Product', collect($response->json())->pluck('name')->all());
    }
}
