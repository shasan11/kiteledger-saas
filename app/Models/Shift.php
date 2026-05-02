<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Shift extends Model
{
    use HasFactory;

    protected $fillable = [
        'branch_id',
        'name',
        'start_time',
        'end_time',
        'work_hour',
        // legacy fields kept for compatibility
        'grace_minutes',
        'hours_per_day',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'work_hour'           => 'decimal:2',
            'grace_minutes'       => 'integer',
            'hours_per_day'       => 'decimal:2',
            'active'              => 'boolean',
            'is_system_generated' => 'boolean',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
