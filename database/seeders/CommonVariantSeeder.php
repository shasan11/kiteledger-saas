<?php

namespace Database\Seeders;

use App\Models\Variant;
use App\Models\VariantLine;
use Illuminate\Database\Seeder;

class CommonVariantSeeder extends Seeder
{
    public function run(): void
    {
        $variants = [
            'Size' => ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
            'Color' => ['Black', 'White', 'Red', 'Blue', 'Green', 'Yellow'],
            'Material' => ['Cotton', 'Polyester', 'Leather', 'Steel'],
            'Weight' => ['250g', '500g', '1kg'],
            'Volume' => ['250ml', '500ml', '1L'],
        ];

        $sort = 0;

        foreach ($variants as $name => $values) {
            $variant = Variant::query()->updateOrCreate(
                ['name' => $name],
                [
                    'sort_order' => $sort++,
                    'active' => true,
                    'is_system_generated' => true,
                ]
            );

            foreach (array_values($values) as $lineSort => $value) {
                VariantLine::query()->updateOrCreate(
                    [
                        'variant_id' => $variant->id,
                        'value' => $value,
                    ],
                    [
                        'sort_order' => $lineSort,
                        'active' => true,
                        'is_system_generated' => true,
                    ]
                );
            }
        }
    }
}
