<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class MasterBranchSeeder extends Seeder
{
    public function run(): void
    {
        Branch::updateOrCreate(
            ['code' => 'HO'],
            [
                'name' => 'Head Office',
                'phone' => null,
                'email' => null,
                'address' => null,
                'is_head_office' => true,
                'is_transaction_enabled' => true,
                'is_pos_enabled' => true,
                'is_warehouse_enabled' => true,
                'is_ai_enabled' => true,
                'is_billing_location_enabled' => true,
                'abbreviated_tax_enabled' => true,
                'track_location' => true,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }
}
