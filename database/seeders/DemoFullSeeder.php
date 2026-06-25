<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class DemoFullSeeder extends Seeder
{
    /**
     * Do not run this seeder from web installer.
     */
    public function run(): void
    {
        $this->call(DemoSeeder::class);
    }
}
