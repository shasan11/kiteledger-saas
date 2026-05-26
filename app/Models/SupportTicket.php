<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends Model
{
    use HasFactory, HasUuids, SoftDeletes;

    public const STATUSES = [
        'open',
        'in_progress',
        'waiting_customer',
        'waiting_internal',
        'resolved',
        'closed',
    ];

    public const PRIORITIES = ['low', 'medium', 'high', 'urgent'];

    public const CATEGORIES = [
        'general',
        'billing',
        'technical',
        'account',
        'product',
        'pos',
        'crm',
        'inventory',
    ];

    public const SOURCES = [
        'manual',
        'email',
        'phone',
        'whatsapp',
        'web',
        'internal',
    ];

    protected $fillable = [
        'branch_id',
        'ticket_no',
        'subject',
        'description',
        'status',
        'priority',
        'category',
        'source',
        'contact_id',
        'lead_id',
        'deal_id',
        'campaign_id',
        'assigned_to_id',
        'created_by_id',
        'resolved_by_id',
        'closed_by_id',
        'due_at',
        'first_response_at',
        'resolved_at',
        'closed_at',
        'last_activity_at',
        'tags',
        'metadata',
        'active',
    ];

    protected function casts(): array
    {
        return [
            'due_at' => 'datetime',
            'first_response_at' => 'datetime',
            'resolved_at' => 'datetime',
            'closed_at' => 'datetime',
            'last_activity_at' => 'datetime',
            'tags' => 'array',
            'metadata' => 'array',
            'active' => 'boolean',
            'assigned_to_id' => 'integer',
            'created_by_id' => 'integer',
            'resolved_by_id' => 'integer',
            'closed_by_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function contact(): BelongsTo
    {
        return $this->belongsTo(Contact::class);
    }

    public function lead(): BelongsTo
    {
        return $this->belongsTo(Lead::class);
    }

    public function deal(): BelongsTo
    {
        return $this->belongsTo(Deal::class);
    }

    public function campaign(): BelongsTo
    {
        return $this->belongsTo(CrmCampaign::class, 'campaign_id');
    }

    public function assignedTo(): BelongsTo
    {
        return $this->belongsTo(User::class, 'assigned_to_id');
    }

    public function createdBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by_id');
    }

    public function resolvedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'resolved_by_id');
    }

    public function closedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'closed_by_id');
    }

    public function comments(): HasMany
    {
        return $this->hasMany(SupportTicketComment::class);
    }

    public function publicComments(): HasMany
    {
        return $this->hasMany(SupportTicketComment::class)->where('is_internal', false);
    }

    public function isOverdue(): bool
    {
        return $this->due_at
            && $this->due_at->isPast()
            && !in_array($this->status, ['resolved', 'closed']);
    }
}
