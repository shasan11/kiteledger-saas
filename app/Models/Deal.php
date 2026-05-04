<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Deal extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'deal_no',
        'lead_id',
        'contact_id',
        'deal_pipeline_id',
        'deal_stage_id',
        'assigned_to_id',
        'title',
        'amount',
        'expected_close_date',
        'closed_date',
        'probability',
        'source',
        'priority',
        'status',
        'lost_reason',
        'description',
        'active',
        'is_system_generated',
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
            'assigned_to_id' => 'integer',
            'amount' => 'decimal:2',
            'expected_close_date' => 'date',
            'closed_date' => 'date',
            'probability' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function dealPipeline(): BelongsTo
    {
        return $this->belongsTo(DealPipeline::class);
    }

    public function dealStage(): BelongsTo
    {
        return $this->belongsTo(DealStage::class);
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function crmActivities(): HasMany
    {
        return $this->hasMany(CrmActivity::class);
    }
}
