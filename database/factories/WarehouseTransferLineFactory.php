<?php

namespace Database\Factories;

use App\Models\Product;
use App\Models\WarehouseTransfer;
use Illuminate\Database\Eloquent\Factories\Factory;

class WarehouseTransferLineFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'warehouse_transfer_id' => WarehouseTransfer::factory(),
            'product_id' => Product::factory(),
            'qty' => fake()->randomFloat(4, 0, 999999999999.9999),
            'remarks' => fake()->regexify('[A-Za-z0-9]{200}'),
        ];
    }
}
