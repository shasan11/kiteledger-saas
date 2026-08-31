<?php

namespace Database\Seeders;

use App\Support\Central\SuperAdministratorProvisioner;
use Illuminate\Database\Seeder;

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

        SuperAdministratorProvisioner::ensure(
            $email,
            (string) env('CENTRAL_ADMIN_NAME', 'KiteLedger Super Administrator'),
            $password,
        );
    }
}
