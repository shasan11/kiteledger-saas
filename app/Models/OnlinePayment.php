<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class OnlinePayment extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    const STATUS_PENDING = 'pending';

    const STATUS_PROCESSING = 'processing';

    const STATUS_SUCCEEDED = 'succeeded';

    const STATUS_FAILED = 'failed';

    const STATUS_CANCELLED = 'cancelled';

    const STATUS_REFUNDED = 'refunded';

    const STATUS_PARTIALLY_REFUNDED = 'partially_refunded';

    protected $fillable = [
        'invoice_id',
        'customer_payment_id',
        'contact_id',
        'provider',
        'provider_payment_id',
        'provider_order_id',
        'provider_session_id',
        'public_token',
        'amount',
        'currency_id',
        'currency_code',
        'exchange_rate',
        'status',
        'payment_method',
        'gateway_fee',
        'net_amount',
        'customer_name',
        'customer_email',
        'customer_phone',
        'raw_request',
        'raw_response',
        'verified_at',
        'failed_reason',
        'paid_at',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
            'exchange_rate' => 'decimal:6',
            'gateway_fee' => 'decimal:2',
            'net_amount' => 'decimal:2',
            'raw_request' => 'array',
            'raw_response' => 'array',
            'verified_at' => 'datetime',
            'paid_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public function customerPayment(): BelongsTo
    {
        return $this->belongsTo(CustomerPayment::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function currency(): BelongsTo
    {
        return $this->belongsTo(Currency::class);
    }

    public function webhookLogs(): HasMany
    {
        return $this->hasMany(PaymentWebhookLog::class);
    }

    public function isSucceeded(): bool
    {
        return $this->status === self::STATUS_SUCCEEDED;
    }

    public function isPending(): bool
    {
        return in_array($this->status, [self::STATUS_PENDING, self::STATUS_PROCESSING]);
    }
}
