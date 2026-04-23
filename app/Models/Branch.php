<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Branch extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'code',
        'name',
        'phone',
        'email',
        'address',
        'is_head_office',
        'is_transaction_enabled',
        'is_pos_enabled',
        'is_warehouse_enabled',
        'is_ai_enabled',
        'is_billing_location_enabled',
        'abbreviated_tax_enabled',
        'track_location',
        'logo',
        'favicon',
        'active',
        'user_add_id',
    ];

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_head_office' => 'boolean',
            'is_transaction_enabled' => 'boolean',
            'is_pos_enabled' => 'boolean',
            'is_warehouse_enabled' => 'boolean',
            'is_ai_enabled' => 'boolean',
            'is_billing_location_enabled' => 'boolean',
            'abbreviated_tax_enabled' => 'boolean',
            'track_location' => 'boolean',
            'active' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
