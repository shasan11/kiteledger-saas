<?php

namespace Database\Seeders;

use App\Models\Central\Feature;
use App\Models\Central\Plan;
use App\Models\Central\PlanFeature;
use Illuminate\Database\Seeder;

class PlansAndFeaturesSeeder extends Seeder
{
    public function run(): void
    {
        $plan = Plan::firstOrCreate(['slug' => 'starter'], [
            'name' => 'Starter', 'description' => 'Core accounting for growing teams.',
            'price_monthly' => 29, 'price_yearly' => 290, 'currency' => env('SAAS_BILLING_CURRENCY', 'USD'),
            'trial_days' => 14, 'is_active' => true, 'is_featured' => true, 'max_users' => 5,
            'max_branches' => 1, 'max_products' => 1000, 'max_customers' => 1000,
            'max_invoices_per_month' => 500, 'max_storage_mb' => 2048,
        ]);

        $features = [
            'inventory' => ['Inventory', 'operations', true], 'pos' => ['Point of sale', 'operations', false],
            'warehouses' => ['Warehouses', 'operations', true], 'hrm' => ['Human resources', 'people', false],
            'payroll' => ['Payroll', 'people', false], 'crm' => ['CRM', 'sales', false],
            'ai' => ['AI capabilities', 'automation', false], 'multi_branch' => ['Multi-branch', 'operations', false],
            'api_access' => ['API access', 'developer', false], 'custom_domains' => ['Custom domains', 'platform', false],
            'advanced_reports' => ['Advanced reporting', 'reporting', false], 'document_extraction' => ['Document extraction', 'automation', false],
        ];

        foreach ($features as $key => [$name, $category, $enabled]) {
            $feature = Feature::firstOrCreate(['key' => $key], [
                'name' => $name, 'description' => $name.' access for a tenant workspace.', 'category' => $category,
                'type' => 'boolean', 'default_value' => $enabled, 'is_active' => true, 'is_visible' => true,
            ]);
            $plan->plansFeatureRegistry()->syncWithoutDetaching([$feature->id => [
                'enabled' => $enabled, 'value' => json_encode($enabled), 'inherit_default' => false,
                'display_on_pricing' => true, 'pricing_label' => $name,
            ]]);
            PlanFeature::firstOrCreate(['plan_id' => $plan->id, 'feature_key' => $key], [
                'feature_name' => $name, 'description' => $feature->description, 'type' => 'boolean',
                'value' => $enabled ? 'true' : 'false', 'is_visible_on_pricing_page' => true,
            ]);
        }
    }
}
