<?php

namespace Database\Seeders;

use App\Models\Central\CentralAdmin;
use App\Models\Central\CentralPermission;
use App\Models\Central\CentralRole;
use App\Models\Central\Plan;
use App\Models\Central\PlanFeature;
use App\Models\Central\PlatformSetting;
use App\Models\Central\WebsitePage;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class CentralDatabaseSeeder extends Seeder
{
    public function run(): void
    {
        CentralAdmin::updateOrCreate(['email' => env('CENTRAL_ADMIN_EMAIL', 'admin@kiteledger.test')], ['name' => env('CENTRAL_ADMIN_NAME', 'KiteLedger Super Admin'), 'password' => Hash::make(env('CENTRAL_ADMIN_PASSWORD', 'ChangeMeNow!123')), 'role' => 'super_admin', 'is_active' => true]);
        $plan = Plan::updateOrCreate(['slug' => 'starter'], ['name' => 'Starter', 'description' => 'Core accounting for small teams.', 'price_monthly' => 29, 'price_yearly' => 290, 'currency' => env('SAAS_BILLING_CURRENCY', 'USD'), 'trial_days' => 14, 'is_active' => true, 'is_featured' => true, 'max_users' => 5, 'max_branches' => 1, 'max_products' => 1000, 'max_customers' => 1000, 'max_invoices_per_month' => 500, 'max_storage_mb' => 2048, 'max_api_requests_per_month' => 10000, 'max_custom_domains' => 0, 'max_warehouses' => 1, 'allow_inventory' => true]);
        foreach (['inventory' => true, 'pos' => false, 'warehouses' => true, 'hrm' => false, 'payroll' => false, 'crm' => false, 'ai' => false, 'multi_branch' => false, 'api_access' => false, 'custom_domains' => false, 'advanced_reports' => false, 'document_extraction' => false] as $feature => $enabled) {
            PlanFeature::updateOrCreate(['plan_id' => $plan->id, 'feature_key' => $feature], ['feature_name' => str($feature)->replace('_', ' ')->title(), 'type' => 'boolean', 'value' => $enabled ? 'true' : 'false']);
        }
        $role = CentralRole::firstOrCreate(['name' => 'platform_admin'], ['label' => 'Platform Administrator']);
        foreach (['tenant.view', 'tenant.manage', 'tenant.backup', 'tenant.delete', 'plan.manage', 'billing.manage', 'gateway.manage', 'domain.manage', 'cms.manage', 'settings.manage', 'audit.view', 'impersonate'] as $permission) {
            $model = CentralPermission::firstOrCreate(['name' => $permission], ['label' => str($permission)->replace('.', ' ')->title()]);
            $role->permissions()->syncWithoutDetaching([$model->id]);
        }
        foreach (['platform.name' => 'KiteLedger SaaS', 'billing.currency' => env('SAAS_BILLING_CURRENCY', 'USD'), 'billing.grace_period_days' => (string) config('saas.grace_period_days'), 'tenant.allow_public_signup' => '0'] as $key => $value) {
            [$group] = explode('.', $key, 2);
            PlatformSetting::updateOrCreate(['key' => $key], ['group' => $group, 'value' => $value, 'type' => 'string']);
        }
        WebsitePage::updateOrCreate(['slug' => 'home'], ['title' => 'KiteLedger SaaS', 'page_type' => 'home', 'status' => 'published', 'published_at' => now(), 'content' => []]);
    }
}
