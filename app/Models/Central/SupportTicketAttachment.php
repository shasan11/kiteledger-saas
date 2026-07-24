<?php

namespace App\Models\Central;

class SupportTicketAttachment extends CentralModel
{
    protected $table = 'central_support_ticket_attachments';

    protected $hidden = ['path'];

    public function ticket()
    {
        return $this->belongsTo(SupportTicket::class, 'ticket_id');
    }
}
