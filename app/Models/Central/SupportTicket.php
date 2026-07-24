<?php

namespace App\Models\Central;

use Illuminate\Database\Eloquent\SoftDeletes;

class SupportTicket extends CentralModel
{
    use SoftDeletes;

    protected $table = 'central_support_tickets';

    protected function casts(): array
    {
        return [
            'metadata' => 'array', 'first_response_at' => 'datetime', 'resolved_at' => 'datetime',
            'closed_at' => 'datetime', 'last_reply_at' => 'datetime', 'first_response_due_at' => 'datetime',
            'resolution_due_at' => 'datetime', 'sla_breached_at' => 'datetime',
        ];
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function category()
    {
        return $this->belongsTo(SupportCategory::class);
    }

    public function assignee()
    {
        return $this->belongsTo(CentralAdmin::class, 'assigned_admin_id');
    }

    public function messages()
    {
        return $this->hasMany(SupportTicketMessage::class, 'ticket_id')->oldest();
    }

    public function events()
    {
        return $this->hasMany(SupportTicketEvent::class, 'ticket_id')->latest('id');
    }
}
