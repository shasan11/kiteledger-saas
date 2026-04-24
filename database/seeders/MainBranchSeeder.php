<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class MainBranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $user = User::query()->updateOrCreate(
            ['email' => 'shasandhakal1105@gmail.com'],
            [
                'name' => 'Main Branch User',
                'password' => Hash::make('Balkot11@'),
                'email_verified_at' => now(),
            ]
        );

        Branch::query()->updateOrCreate(
            ['code' => 'MAIN'],
            [
                'name' => 'Main Branch',
                'email' => $user->email,
                'is_head_office' => true,
                'is_transaction_enabled' => true,
                'is_pos_enabled' => true,
                'is_warehouse_enabled' => true,
                'is_ai_enabled' => true,
                'is_billing_location_enabled' => true,
                'abbreviated_tax_enabled' => true,
                'track_location' => true,
                'active' => true,
                'user_add_id' => $user->id,
            ]
        );
    }
}
