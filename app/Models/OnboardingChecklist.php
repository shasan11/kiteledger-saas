<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OnboardingChecklist extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'user_id',
        'branch_id',
        'type',
        'title',
        'description',
        'assigned_to',
        'due_date',
        'completed_at',
        'status',
        'notes',
        'active',
        'is_system_generated',
        'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'user_id'              => 'integer',
            'assigned_to'          => 'integer',
            'due_date'             => 'datetime',
            'completed_at'         => 'datetime',
            'active'               => 'boolean',
            'is_system_generated'  => 'boolean',
            'user_add_id'          => 'integer',
        ];
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to');
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_add_id');
    }
}
