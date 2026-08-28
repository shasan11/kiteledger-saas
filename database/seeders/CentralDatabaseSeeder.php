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
            AiSettingsSeeder::class,
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

        // Sample platform account spanning two tenants. Development only.
        if (filter_var(env('SAAS_SEED_DEMO_PLATFORM_USERS', false), FILTER_VALIDATE_BOOL)) {
            $this->call(PlatformUsersDemoSeeder::class);
        }
    }
}
