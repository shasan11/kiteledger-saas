<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveApplication extends Model
{
    use HasFactory, HasUuids;

    /**
     * The attributes that are mass assignable.
     *
     * @var array
     */
    protected $fillable = [
        'branch_id',
        'user_id',
        'leave_policy_id',
        'leave_type_id',
        'leave_type',
        'leave_from',
        'leave_to',
        'accept_leave_from',
        'accept_leave_to',
        'accept_leave_by',
        'leave_duration',
        'reason',
        'review_comment',
        'attachment',
        'status',
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
            'user_id' => 'integer',
            'leave_policy_id' => 'string',
            'leave_type_id' => 'string',
            'leave_from' => 'datetime',
            'leave_to' => 'datetime',
            'accept_leave_from' => 'datetime',
            'accept_leave_to' => 'datetime',
            'accept_leave_by' => 'integer',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function branch(): BelongsTo
    {
        return $this->belongsTo(Branch::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function leavePolicy(): BelongsTo
    {
        return $this->belongsTo(LeavePolicy::class);
    }

    public function leaveTypeRecord(): BelongsTo
    {
        return $this->belongsTo(LeaveType::class, 'leave_type_id');
    }

    public function acceptLeaveBy(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function userAdd(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
