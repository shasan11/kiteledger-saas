<?php

namespace Database\Seeders;

use App\Models\Central\Plan;
use App\Models\Central\Tenant;
use Illuminate\Database\Seeder;

class DemoTenantSeeder extends Seeder
{
    public function run(): void
    {
        Tenant::firstOrCreate(['owner_email' => 'demo-owner@example.test'], [
            'id' => 'demo', 'company_name' => 'Demo Company', 'owner_name' => 'Demo Owner',
            'status' => 'pending', 'timezone' => 'UTC', 'currency' => env('SAAS_BILLING_CURRENCY', 'USD'),
            'plan_id' => Plan::where('slug', 'starter')->value('id'), 'is_internal' => true,
        ]);
    }
}
