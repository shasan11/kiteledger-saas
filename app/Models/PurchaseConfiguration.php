<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class PurchaseConfiguration extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'default_supplier_account_id', 'default_purchase_tax_id', 'bill_due_days',
        'require_purchase_order_approval', 'require_bill_approval',
        'negative_item_balance', 'negative_cash_balance',
        'aging_buckets', 'overdue_reminders_enabled',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'require_purchase_order_approval' => 'boolean',
            'require_bill_approval' => 'boolean',
            'aging_buckets' => 'array',
            'overdue_reminders_enabled' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
