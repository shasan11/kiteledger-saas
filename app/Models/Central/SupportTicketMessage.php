<?php

namespace App\Models\Central;

class SupportTicketMessage extends CentralModel
{
    protected $table = 'central_support_ticket_messages';

    protected function casts(): array
    {
        return ['is_internal_note' => 'boolean', 'edited_at' => 'datetime'];
    }

    public function ticket()
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }

    public function attachments()
    {
        return $this->hasMany(SupportTicketAttachment::class, 'message_id');
    }
}
