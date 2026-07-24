<?php

namespace App\Policies\Central;

use App\Models\Central\CentralAdmin;
use App\Models\Central\SupportTicket;

class SupportTicketPolicy
{
    public function viewAny(CentralAdmin $admin): bool
    {
        return $admin->can('ticket.view');
    }

    public function view(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.view');
    }

    public function update(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.update');
    }

    public function reply(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.reply');
    }

    public function assign(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.assign');
    }

    public function close(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.close');
    }

    public function delete(CentralAdmin $admin, SupportTicket $ticket): bool
    {
        return $admin->can('ticket.delete');
    }
}
