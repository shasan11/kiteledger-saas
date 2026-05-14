<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CrmCustomerHealthScore extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'account_id',
        'contact_id',
        'score',
        'status',
        'reason',
        'last_payment_status',
        'open_invoice_count',
        'overdue_invoice_amount',
        'open_activity_count',
        'last_interaction_at',
        'calculated_at',
    ];

    protected function casts(): array
    {
        return [
            'score' => 'integer',
            'open_invoice_count' => 'integer',
            'overdue_invoice_amount' => 'decimal:2',
            'open_activity_count' => 'integer',
            'last_interaction_at' => 'datetime',
            'calculated_at' => 'datetime',
        ];
    }
}
