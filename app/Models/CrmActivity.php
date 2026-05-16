<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class CrmActivity extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'lead_id',
        'deal_id',
        'contact_id',
        'crm_account_id',
        'assigned_to_id',
        'activity_type',
        'subject',
        'description',
        'due_at',
        'completed_at',
        'status',
        'priority',
        'outcome',
        'next_follow_up_at',
        'reminder_at',
        'escalated_at',
        'escalated_to',
        'escalation_reason',
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
            'due_at' => 'datetime',
            'completed_at' => 'datetime',
            'next_follow_up_at' => 'datetime',
            'reminder_at' => 'datetime',
            'escalated_at' => 'datetime',
            'escalated_to' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function crmAccount(): BelongsTo
    {
        return $this->belongsTo(CrmAccount::class, 'crm_account_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function crmActivityComments(): HasMany
    {
        return $this->hasMany(CrmActivityComment::class)->with('user')->oldest();
    }

    public function escalations(): HasMany
    {
        return $this->hasMany(CrmActivityEscalation::class, 'activity_id');
    }
}
