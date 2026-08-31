<?php

namespace Database\Seeders;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralRole;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CentralAdminSeeder extends Seeder
{
    public function run(): void
    {
        $email = trim((string) env('CENTRAL_ADMIN_EMAIL'));
        $password = (string) env('CENTRAL_ADMIN_PASSWORD');

        if ($email === '' || $password === '') {
            $this->command?->warn('Central administrator not seeded: set CENTRAL_ADMIN_EMAIL and CENTRAL_ADMIN_PASSWORD or create it through the installer.');

            return;
        }

        $admin = CentralAdmin::firstOrCreate(['email' => $email], [
            'name' => env('CENTRAL_ADMIN_NAME', 'KiteLedger Super Administrator'),
            'password' => Hash::make($password), 'role' => 'super_admin', 'is_active' => true,
        ]);
        if (! $admin->roles()->exists()) {
            $role = CentralRole::where('name', 'super_administrator')->first();
            if ($role) {
                $admin->roles()->sync([$role->id]);
            }
        }
    }
}
