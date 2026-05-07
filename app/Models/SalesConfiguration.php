<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class SalesConfiguration extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'default_customer_account_id', 'default_sales_tax_id', 'quotation_validity_days',
        'invoice_due_days', 'require_sales_order_approval', 'allow_negative_receivable',
        'aging_buckets', 'overdue_reminders_enabled',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'require_sales_order_approval' => 'boolean',
            'allow_negative_receivable' => 'boolean',
            'aging_buckets' => 'array',
            'overdue_reminders_enabled' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }
}
