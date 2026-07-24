<?php

namespace App\Jobs\SaaS;

use App\Models\Central\SupportTicket;
use App\Services\SaaS\PlatformSettingsService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Mail;

class DeliverSupportRequesterEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $ticketId, public string $event, public ?int $messageId = null)
    {
        $this->onConnection('central')->onQueue('default')->afterCommit();
    }

    public function handle(PlatformSettingsService $settings): void
    {
        $settings->applyMailConfiguration();
        $ticket = SupportTicket::with('messages')->findOrFail($this->ticketId);
        $message = $this->messageId ? $ticket->messages->firstWhere('id', $this->messageId) : null;
        Mail::html(view('central.support-requester-email', compact('ticket', 'message'))->render(), fn ($mail) => $mail->to($ticket->requester_email)->subject($this->event === 'resolved' ? 'Ticket resolved · '.$ticket->ticket_number : 'New reply · '.$ticket->ticket_number));
    }
}
