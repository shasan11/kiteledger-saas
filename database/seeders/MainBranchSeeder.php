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
            ['email' => env('SEED_MAIN_USER_EMAIL', 'admin@kiteledger.local')],
            [
                'name' => env('SEED_MAIN_USER_NAME', 'Main Branch User'),
                'password' => Hash::make(env('SEED_MAIN_USER_PASSWORD', 'password')),
                'email_verified_at' => now(),
            ]
        );

        $branch = Branch::query()->updateOrCreate(
            ['code' => env('SEED_MAIN_BRANCH_CODE', 'MAIN')],
            [
                'name' => env('SEED_MAIN_BRANCH_NAME', 'Main Branch'),
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

        if ($user->branch_id !== $branch->id) {
            $user->forceFill(['branch_id' => $branch->id])->save();
        }
    }
}
