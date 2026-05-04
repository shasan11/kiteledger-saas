<?php

namespace Database\Seeders;

use App\Models\EmailConfig;
use Illuminate\Database\Seeder;

class EmailConfigSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        EmailConfig::factory()->count(5)->create();
    }
}
