<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DesignationHistory extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'designation_id',
        'start_date',
        'end_date',
        'comment',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'user_id'              => 'integer',
            'start_date'           => 'datetime',
            'end_date'             => 'datetime',
            'active'               => 'boolean',
            'is_system_generated'  => 'boolean',
            'user_add_id'          => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function designation(): BelongsTo
    {
        return $this->belongsTo(Designation::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
