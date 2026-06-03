<?php

namespace Database\Seeders;

use App\Models\Branch;
use App\Models\User;
use App\Models\Warehouse;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class MainBranchSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $email = env('SEED_MAIN_USER_EMAIL', 'shasandhakal1105@gmail.com');

        $user = User::query()->updateOrCreate(
            ['email' => $email],
            [
                'name' => env('SEED_MAIN_USER_NAME', 'Main Branch User'),
                'username' => env('SEED_MAIN_USER_USERNAME', Str::before($email, '@')),
                'password' => Hash::make(env('SEED_MAIN_USER_PASSWORD', 'Balkot11@')),
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

        $warehouse = Warehouse::query()->updateOrCreate(
            [
                'branch_id' => $branch->id,
                'code' => env('SEED_MAIN_WAREHOUSE_CODE', 'MAIN-WH'),
            ],
            [
                'name' => env('SEED_MAIN_WAREHOUSE_NAME', $branch->name . ' Warehouse'),
                'address' => $branch->address,
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => $user->id,
            ]
        );

        Warehouse::query()
            ->where('branch_id', $branch->id)
            ->where('is_system_generated', true)
            ->whereKeyNot($warehouse->id)
            ->delete();
    }
}
