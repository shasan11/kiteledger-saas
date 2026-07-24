<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class TenantInvoice extends CentralModel
{
    use SoftDeletes;

    protected function casts(): array
    {
        return [
            'issue_date' => 'date', 'due_date' => 'date', 'period_start' => 'date', 'period_end' => 'date',
            'paid_at' => 'datetime', 'locked_at' => 'datetime', 'billing_identity' => 'array', 'metadata' => 'array',
            'seller_snapshot' => 'array', 'buyer_snapshot' => 'array', 'tax_snapshot' => 'array',
            'customization_snapshot' => 'array', 'line_items_snapshot' => 'array',
        ];
    }

    protected static function booted(): void
    {
        static::updating(function (self $invoice): void {
            if (($invoice->getOriginal('locked_at') || $invoice->getOriginal('status') === 'paid') && $invoice->isDirty(['invoice_number', 'tenant_id', 'subscription_id', 'plan_id', 'subtotal', 'discount', 'tax', 'total', 'currency', 'billing_identity', 'period_start', 'period_end'])) {
                throw new \LogicException('A locked or paid invoice cannot be modified. Issue a credit note or adjustment instead.');
            }
        });
    }

    public function lines()
    {
        return $this->hasMany(TenantInvoiceLine::class, 'invoice_id');
    }

    public function payments()
    {
        return $this->hasMany(PaymentTransaction::class, 'invoice_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }
}
