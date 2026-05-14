<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class CrmSequenceStep extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'sequence_id',
        'step_order',
        'action_type',
        'delay_days',
        'title',
        'description',
        'template',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'step_order' => 'integer',
            'delay_days' => 'integer',
            'active' => 'boolean',
        ];
    }

    public function sequence(): BelongsTo
    {
        return $this->belongsTo(CrmSequence::class, 'sequence_id');
    }
}
