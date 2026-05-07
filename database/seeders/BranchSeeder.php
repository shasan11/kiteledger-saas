<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            ['code' => 'HO', 'name' => 'Head Office', 'phone' => '+977-01-5970000', 'email' => 'info@kiteledger.local', 'address' => 'Kamaladi, Kathmandu, Nepal', 'is_head_office' => true],
            ['code' => 'PKR', 'name' => 'Pokhara Branch', 'phone' => '+977-061-520000', 'email' => 'pokhara@kiteledger.local', 'address' => 'Lakeside, Pokhara, Nepal', 'is_head_office' => false],
        ] as $branch) {
            Branch::query()->updateOrCreate(
                ['code' => $branch['code']],
                $branch + [
                    'is_transaction_enabled' => true,
                    'is_pos_enabled' => true,
                    'is_warehouse_enabled' => true,
                    'is_ai_enabled' => true,
                    'is_billing_location_enabled' => true,
                    'abbreviated_tax_enabled' => true,
                    'track_location' => true,
                    'active' => true,
                    'is_system_generated' => true,
                    'user_add_id' => null,
                ]
            );
        }
    }
}
