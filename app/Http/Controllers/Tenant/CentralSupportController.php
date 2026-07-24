<?php

namespace App\Http\Controllers\Tenant;

use App\Http\Controllers\Controller;
use App\Models\Central\SupportCategory;
use App\Models\Central\SupportTicket;
use App\Models\Central\SupportTicketAttachment;
use App\Services\SaaS\PlatformSettingsService;
use App\Services\SaaS\SupportTicketService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;

class CentralSupportController extends Controller
{
    public function index(Request $request)
    {
        $tenantId = (string) tenant('id');

        return Inertia::render('Tenant/Support/Index', ['tickets' => SupportTicket::where('tenant_id', $tenantId)->latest('updated_at')->paginate(20), 'categories' => SupportCategory::where('is_active', true)->orderBy('sort_order')->get()]);
    }

    public function store(Request $request, SupportTicketService $service)
    {
        $data = $request->validate(['subject' => ['required', 'string', 'max:255'], 'description' => ['required', 'string', 'max:50000'], 'category_id' => ['required', 'exists:support_categories,id'], 'priority' => ['required', 'in:low,normal,high,urgent']] + $service->attachmentValidationRules());
        $user = $request->user('tenant');
        $ticket = $service->create($data + ['tenant_id' => (string) tenant('id'), 'requester_user_id' => $user->id, 'requester_name' => $user->name, 'requester_email' => $user->email, 'actor_type' => 'tenant', 'actor_id' => $user->id]);
        foreach ($request->file('attachments', []) as $file) {
            SupportTicketAttachment::create(['ticket_id' => $ticket->id, 'disk' => 'local', 'path' => $file->store('central/support/'.$ticket->id, 'local'), 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'uploader_type' => 'tenant', 'uploader_id' => $user->id]);
        }

        return redirect()->route('tenant.support.show', $ticket)->with('success', 'Support ticket created.');
    }

    public function show(Request $request, SupportTicket $ticket)
    {
        $this->authorizeTenant($ticket);
        $ticket->load(['category', 'messages' => fn ($q) => $q->where('is_internal_note', false), 'messages.attachments']);

        return Inertia::render('Tenant/Support/Show', ['ticket' => $ticket]);
    }

    public function reply(Request $request, SupportTicket $ticket, SupportTicketService $service)
    {
        $this->authorizeTenant($ticket);
        abort_if($ticket->status === 'closed', 409, 'Closed tickets cannot receive replies.');
        $data = $request->validate(['body' => ['required', 'string', 'max:50000']] + $service->attachmentValidationRules());
        $user = $request->user('tenant');
        $message = $service->reply($ticket, $data + ['sender_type' => 'tenant', 'sender_id' => $user->id, 'sender_name' => $user->name, 'sender_email' => $user->email, 'is_internal_note' => false]);
        foreach ($request->file('attachments', []) as $file) {
            $message->attachments()->create(['ticket_id' => $ticket->id, 'disk' => 'local', 'path' => $file->store('central/support/'.$ticket->id, 'local'), 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'uploader_type' => 'tenant', 'uploader_id' => $user->id]);
        }

        return back()->with('success', 'Reply sent.');
    }

    public function reopen(Request $request, SupportTicket $ticket, SupportTicketService $service)
    {
        $this->authorizeTenant($ticket);
        $days = (int) app(PlatformSettingsService::class)->get('support.ticket_reopen_period', 14);
        abort_unless(in_array($ticket->status, ['resolved', 'closed'], true) && $ticket->updated_at->greaterThan(now()->subDays($days)), 409, 'This ticket can no longer be reopened.');
        $service->transition($ticket, ['status' => 'open'], 'tenant', $request->user('tenant')->id);

        return back()->with('success', 'Ticket reopened.');
    }

    public function resolve(Request $request, SupportTicket $ticket, SupportTicketService $service)
    {
        $this->authorizeTenant($ticket);
        abort_if(in_array($ticket->status, ['resolved', 'closed'], true), 409, 'This ticket is already resolved.');
        $service->transition($ticket, ['status' => 'resolved'], 'tenant', $request->user('tenant')->id);

        return back()->with('success', 'Ticket marked as resolved.');
    }

    public function download(Request $request, SupportTicketAttachment $attachment)
    {
        $this->authorizeTenant($attachment->ticket()->firstOrFail());

        return Storage::disk($attachment->disk)->download($attachment->getRawOriginal('path'), $attachment->original_filename);
    }

    private function authorizeTenant(SupportTicket $ticket): void
    {
        abort_unless($ticket->tenant_id === (string) tenant('id'), 404);
    }
}
