<?php

namespace Database\Seeders;

use App\Models\ChartOfAccount;
use App\Models\PurchaseConfiguration;
use App\Models\TaxRate;
use Illuminate\Database\Seeder;

class PurchaseConfigurationSeeder extends Seeder
{
    public function run(): void
    {
        PurchaseConfiguration::query()->firstOrCreate(
            ['active' => true],
            [
                'default_supplier_account_id' => ChartOfAccount::query()->where('name', 'like', '%Payable%')->value('id'),
                'default_purchase_tax_id' => TaxRate::query()->where('applies_on', 'purchase')->orWhere('applies_on', 'both')->value('id'),
                'bill_due_days' => 30,
                'require_purchase_order_approval' => true,
                'require_bill_approval' => true,
                'aging_buckets' => [30, 60, 90, 120],
                'overdue_reminders_enabled' => true,
                'is_system_generated' => true,
                'user_add_id' => null,
            ]
        );
    }
}
