<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Concerns\HasUuids;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ApprovalWorkflow extends Model
{
    use HasFactory, HasUuids;

    protected $fillable = [
        'module', 'document_type', 'approval_required', 'approval_mode',
        'minimum_amount', 'approver_role_id', 'approver_user_id', 'steps',
        'active', 'is_system_generated', 'user_add_id',
    ];

    protected function casts(): array
    {
        return [
            'approval_required' => 'boolean',
            'minimum_amount' => 'decimal:2',
            'steps' => 'array',
            'active' => 'boolean',
            'is_system_generated' => 'boolean',
            'user_add_id' => 'integer',
        ];
    }

    public function approverRole(): BelongsTo
    {
        return $this->belongsTo(Role::class, 'approver_role_id');
    }

    public function approverUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approver_user_id');
    }
}
