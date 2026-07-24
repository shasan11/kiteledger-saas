<?php

namespace App\Models\Central;

class SupportTicketEvent extends CentralModel
{
    public $timestamps = false;

    protected $table = 'central_support_ticket_events';

    protected function casts(): array
    {
        return ['created_at' => 'datetime'];
    }
}
