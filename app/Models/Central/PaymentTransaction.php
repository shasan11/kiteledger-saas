<?php

namespace App\Models\Central;

class PaymentTransaction extends CentralModel
{
    protected $hidden = ['proof_path', 'raw_response'];

    protected $appends = ['has_proof'];

    protected function casts(): array
    {
        return ['raw_response' => 'array', 'paid_at' => 'datetime'];
    }

    public function invoice()
    {
        return $this->belongsTo(TenantInvoice::class, 'invoice_id');
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function addedBy()
    {
        return $this->belongsTo(CentralAdmin::class, 'added_by');
    }

    public function getHasProofAttribute(): bool
    {
        return filled($this->getRawOriginal('proof_path'));
    }
}
