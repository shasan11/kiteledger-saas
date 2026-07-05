<?php

namespace App\Models;

use App\Models\Concerns\RequiresTenantConnection;
use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\Crypt;

class OnlinePaymentSetting extends Model
{
    use HasFactory, HasUuids;
    use RequiresTenantConnection;

    protected $fillable = [
        'enable_online_payment',
        'allow_public_invoice_payment',
        'allow_partial_invoice_payment',
        'allow_invoice_overpayment',
        'minimum_partial_payment_amount',
        'payment_link_expiry_days',
        'default_gateway',
        'receipt_email_enabled',
        'webhook_logging_enabled',
        'enable_google_login',
        'google_client_id',
        'google_client_secret_encrypted',
        'google_redirect_uri',
        'google_allowed_domains',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'enable_online_payment' => 'boolean',
            'allow_public_invoice_payment' => 'boolean',
            'allow_partial_invoice_payment' => 'boolean',
            'allow_invoice_overpayment' => 'boolean',
            'minimum_partial_payment_amount' => 'decimal:2',
            'payment_link_expiry_days' => 'integer',
            'receipt_email_enabled' => 'boolean',
            'webhook_logging_enabled' => 'boolean',
            'enable_google_login' => 'boolean',
            'active' => 'boolean',
        ];
    }

    public static function current(): self
    {
        return static::query()->first() ?? new self([
            'enable_online_payment' => false,
            'allow_public_invoice_payment' => false,
            'allow_partial_invoice_payment' => false,
            'allow_invoice_overpayment' => false,
            'receipt_email_enabled' => true,
            'webhook_logging_enabled' => true,
            'enable_google_login' => false,
            'active' => true,
        ]);
    }

    public function getGoogleClientSecret(): ?string
    {
        if (! $this->google_client_secret_encrypted) {
            return null;
        }
        try {
            return Crypt::decryptString($this->google_client_secret_encrypted);
        } catch (\Throwable) {
            return null;
        }
    }

    public function setGoogleClientSecret(string $secret): void
    {
        $this->google_client_secret_encrypted = Crypt::encryptString($secret);
    }
}
