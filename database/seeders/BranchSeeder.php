<?php

namespace Database\Seeders;

use App\Models\Branch;
use Illuminate\Database\Seeder;

class BranchSeeder extends Seeder
{
    public function run(): void
    {
        foreach ([
            [
                'code' => env('SEED_MAIN_BRANCH_CODE', 'MAIN'),
                'name' => env('SEED_MAIN_BRANCH_NAME', 'Main Branch'),
                'phone' => null,
                'email' => env('SEED_MAIN_USER_EMAIL', 'shasandhakal1105@gmail.com'),
                'address' => null,
                'is_head_office' => true,
            ],
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
