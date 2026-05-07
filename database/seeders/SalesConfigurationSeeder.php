<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\SalesConfiguration;
use App\Models\TaxRate;
use Illuminate\Database\Seeder;

class SalesConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        SalesConfiguration::query()->firstOrCreate(
            ['active' => true],
            [
                'default_customer_account_id' => ChartOfAccount::query()->where('name', 'like', '%Receivable%')->value('id'),
                'default_sales_tax_id' => TaxRate::query()->where('applies_on', 'sale')->orWhere('applies_on', 'both')->value('id'),
                'quotation_validity_days' => 15,
                'invoice_due_days' => 30,
                'require_sales_order_approval' => true,
                'allow_negative_receivable' => false,
                'aging_buckets' => [30, 60, 90, 120],
                'overdue_reminders_enabled' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
