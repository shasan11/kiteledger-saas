<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

/**
 * The INSTALL seed (this is what stock Froiden's `db:seed` runs).
 *
 * Deliberately LEAN: all configuration/lookup data + roles/permissions
 * (ProductionSeeder) plus a default admin login (FullPermissionUserSeeder).
 * It does NOT seed the heavy demo business records (products, ~5,000 sample
 * transactions, bulk accounting volume) — those take minutes and cause the
 * installer to hit the web-server's 504 gateway timeout. For a demo dataset,
 * run `php artisan db:seed --class=DemoSeeder` separately.
 */
class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    public function run(): void
    {
        $this->call([
            ProductionSeeder::class,
            FullPermissionUserSeeder::class,
        ]);
    }
}
