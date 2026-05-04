<?php

namespace Database\Factories;

use App\Models\Account;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\ProductTaxCategory;
use App\Models\ProductUnit;
use App\Models\TaxClass;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class ProductFactory extends Factory
{
    /**
     * Define the model's default state.
     */
    public function definition(): array
    {
        return [
            'parent_id' => Product::factory(),
            'product_category_id' => ProductCategory::factory(),
            'product_tax_category_id' => ProductTaxCategory::factory(),
            'name' => fake()->name(),
            'code' => fake()->regexify('[A-Za-z0-9]{60}'),
            'sku' => fake()->regexify('[A-Za-z0-9]{80}'),
            'barcode' => fake()->regexify('[A-Za-z0-9]{80}'),
            'description' => fake()->text(),
            'product_unit_id' => ProductUnit::factory(),
            'tax_class_id' => TaxClass::factory(),
            'product_type' => fake()->randomElement(["simple","variant_parent","variant"]),
            'sales_account_id' => Account::factory(),
            'purchase_account_id' => Account::factory(),
            'sales_return_account_id' => Account::factory(),
            'purchase_return_account_id' => Account::factory(),
            'valuation_method' => fake()->randomElement(["standard","average_cost","first_in_first_out","last_in_first_out"]),
            'reorder_level' => fake()->randomFloat(4, 0, 999999999999.9999),
            'purchase_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'selling_price' => fake()->randomFloat(2, 0, 99999999999999.99),
            'track_inventory' => fake()->boolean(),
            'allow_sale' => fake()->boolean(),
            'allow_purchase' => fake()->boolean(),
            'active' => fake()->boolean(),
            'is_system_generated' => fake()->boolean(),
            'user_add_id' => User::factory(),
        ];
    }
}
