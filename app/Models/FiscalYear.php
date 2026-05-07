<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FiscalYear extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'name', 'code', 'start_date', 'end_date', 'status', 'lock_date',
        'is_current', 'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
            'lock_date' => 'date',
            'is_current' => 'boolean',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
