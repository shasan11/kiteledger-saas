<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Str;

class InvoicePaymentLink extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'invoice_id',
        'public_token',
        'expires_at',
        'active',
        'last_accessed_at',
    ];

    protected function casts(): array
    {
        return [
            'expires_at' => 'datetime',
            'last_accessed_at' => 'datetime',
            'active' => 'boolean',
        ];
    }

    public function invoice(): BelongsTo
    {
        return $this->belongsTo(Invoice::class);
    }

    public static function generateToken(): string
    {
        return Str::random(48);
    }

    public function isExpired(): bool
    {
        return $this->expires_at !== null && $this->expires_at->isPast();
    }

    public function isUsable(): bool
    {
        return $this->active && !$this->isExpired();
    }

    public function touchAccess(): void
    {
        $this->forceFill(['last_accessed_at' => now()])->saveQuietly();
    }
}
