<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;

class CentralDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $this->call([
            CentralRolesAndPermissionsSeeder::class,
            CentralAdminSeeder::class,
            PlatformSettingsSeeder::class,
            PlansAndFeaturesSeeder::class,
            PaymentGatewaySeeder::class,
            DefaultDataTemplateSeeder::class,
            WebsiteSeeder::class,
            BlogSeeder::class,
            SupportSeeder::class,
            NotificationTemplateSeeder::class,
        ]);

        if (filter_var(env('SAAS_SEED_DEMO_TENANT', false), FILTER_VALIDATE_BOOL)) {
            $this->call(DemoTenantSeeder::class);
        }
    }
}
