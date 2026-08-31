<?php

namespace App\Services\SaaS;

use App\Jobs\SaaS\DeliverSupportRequesterEmailJob;
use App\Models\Central\SupportCategory;
use App\Models\Central\SupportTicket;
use App\Models\Central\SupportTicketEvent;
use App\Models\Central\SupportTicketMessage;
use App\Support\SafeHtml;
use Illuminate\Support\Facades\DB;

class SupportTicketService
{
    public function attachmentValidationRules(): array
    {
        $settings = app(PlatformSettingsService::class);
        if (! $settings->get('support.attachments_allowed', true)) {
            return ['attachments' => ['prohibited']];
        }

        $safeTypes = ['jpg', 'jpeg', 'png', 'webp', 'gif', 'pdf', 'txt', 'csv', 'doc', 'docx', 'xls', 'xlsx', 'zip'];
        $configured = $settings->get('support.allowed_attachment_types', ['jpg', 'jpeg', 'png', 'pdf', 'txt', 'doc', 'docx']);
        $configured = is_array($configured) ? $configured : preg_split('/[\s,]+/', (string) $configured, -1, PREG_SPLIT_NO_EMPTY);
        $types = array_values(array_intersect($safeTypes, array_map(fn ($type) => strtolower(ltrim((string) $type, '.')), $configured ?: [])));
        $types = $types ?: ['jpg', 'jpeg', 'png', 'pdf', 'txt'];
        $maximumKilobytes = max(1, min(51200, (int) $settings->get('support.maximum_attachment_size', 10240)));

        return [
            'attachments' => ['sometimes', 'array', 'max:5'],
            'attachments.*' => ['file', 'mimes:'.implode(',', $types), 'max:'.$maximumKilobytes],
        ];
    }

    public function create(array $data): SupportTicket
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($data): SupportTicket {
            DB::connection(config('tenancy.database.central_connection'))->table('central_support_tickets')->lockForUpdate()->max('id');
            $number = $this->nextNumber();
            $hours = (int) app(PlatformSettingsService::class)->get('support.first_response_sla', 8);
            $resolutionHours = (int) app(PlatformSettingsService::class)->get('support.resolution_sla', 72);
            $actorType = $data['actor_type'] ?? 'tenant';
            $actorId = $data['actor_id'] ?? null;
            unset($data['actor_type'], $data['actor_id']);
            $category = filled($data['category_id'] ?? null) ? SupportCategory::find($data['category_id']) : null;
            $data['priority'] = $data['priority'] ?? $category?->default_priority ?? 'normal';
            $data['assigned_admin_id'] = $data['assigned_admin_id'] ?? $category?->default_assignee_id;
            $ticket = SupportTicket::create($data + [
                'ticket_number' => $number, 'status' => 'open', 'source' => $data['source'] ?? 'tenant_portal',
                'first_response_due_at' => now()->addHours($hours), 'resolution_due_at' => now()->addHours($resolutionHours),
                'last_reply_at' => now(),
            ]);
            $this->event($ticket, $actorType, $actorId, 'created', null, $ticket->status);
            app(CentralNotificationService::class)->notify('support_ticket_created', 'support', $ticket->priority === 'urgent' ? 'critical' : 'info', 'Support ticket '.$number, $ticket->subject, route('central.support.tickets.show', $ticket), $ticket);

            return $ticket;
        }, 3);
    }

    public function reply(SupportTicket $ticket, array $data): SupportTicketMessage
    {
        return DB::connection(config('tenancy.database.central_connection'))->transaction(function () use ($ticket, $data): SupportTicketMessage {
            $ticket = SupportTicket::lockForUpdate()->findOrFail($ticket->id);
            $internal = (bool) ($data['is_internal_note'] ?? false);
            $message = SupportTicketMessage::create([
                'ticket_id' => $ticket->id, 'sender_type' => $data['sender_type'], 'sender_id' => $data['sender_id'] ?? null,
                'sender_name' => $data['sender_name'], 'sender_email' => $data['sender_email'] ?? null,
                'plain_body' => trim(strip_tags($data['body'])), 'html_body' => SafeHtml::clean($data['body']), 'is_internal_note' => $internal,
            ]);
            $updates = ['last_reply_at' => now()];
            if (! $internal) {
                $updates['status'] = $data['sender_type'] === 'admin' ? 'pending_customer' : 'pending_support';
                if ($data['sender_type'] === 'admin' && ! $ticket->first_response_at) {
                    $updates['first_response_at'] = now();
                }
            }
            $ticket->update($updates);
            $this->event($ticket, $data['sender_type'], $data['sender_id'] ?? null, $internal ? 'internal_note_added' : 'reply_added');
            if (! $internal && $data['sender_type'] === 'admin') {
                $this->emailRequester($ticket, 'reply', $message->id);
            } elseif (! $internal && $data['sender_type'] === 'tenant') {
                app(CentralNotificationService::class)->notify('ticket_tenant_reply', 'support', $ticket->priority === 'urgent' ? 'critical' : 'info', 'Tenant replied to '.$ticket->ticket_number, $ticket->subject, route('central.support.tickets.show', $ticket), $ticket, [], $ticket->assigned_admin_id ? [$ticket->assigned_admin_id] : null);
            }

            return $message;
        });
    }

    public function transition(SupportTicket $ticket, array $changes, string $actorType, ?int $actorId): SupportTicket
    {
        $old = $ticket->only(array_keys($changes));
        $ticket->fill($changes);
        if (($changes['status'] ?? null) === 'resolved') {
            $ticket->resolved_at = now();
        }
        if (($changes['status'] ?? null) === 'closed') {
            $ticket->closed_at = now();
        }
        if (($changes['status'] ?? null) === 'open') {
            $ticket->resolved_at = null;
            $ticket->closed_at = null;
        }
        $ticket->save();
        foreach ($changes as $field => $value) {
            if (($old[$field] ?? null) != $value) {
                $this->event($ticket, $actorType, $actorId, $field.'_changed', $old[$field] ?? null, $value);
            }
        }
        if (array_key_exists('assigned_admin_id', $changes) && filled($changes['assigned_admin_id'])) {
            app(CentralNotificationService::class)->notify('ticket_assigned', 'support', 'info', 'Ticket assigned', $ticket->ticket_number.' was assigned to you.', route('central.support.tickets.show', $ticket), $ticket, [], [(int) $changes['assigned_admin_id']]);
        }
        if (($changes['priority'] ?? null) === 'urgent' && ($old['priority'] ?? null) !== 'urgent') {
            app(CentralNotificationService::class)->notifyOnce('ticket_escalated', 'support', 'critical', 'Ticket escalated', $ticket->ticket_number.' is now urgent.', route('central.support.tickets.show', $ticket), $ticket, [], 1);
        }
        if (($changes['status'] ?? null) === 'resolved' && ($old['status'] ?? null) !== 'resolved') {
            $this->emailRequester($ticket, 'resolved');
        }

        return $ticket;
    }

    public function markBreaches(): int
    {
        $count = 0;
        SupportTicket::whereNull('sla_breached_at')->whereNotIn('status', ['resolved', 'closed'])
            ->where(fn ($query) => $query->where(fn ($q) => $q->whereNull('first_response_at')->where('first_response_due_at', '<', now()))->orWhere('resolution_due_at', '<', now()))
            ->each(function (SupportTicket $ticket) use (&$count): void {
                $ticket->update(['sla_breached_at' => now()]);
                $count++;
                app(CentralNotificationService::class)->notify('ticket_sla_breached', 'support', 'critical', 'Ticket SLA breached', $ticket->ticket_number.' requires attention.', route('central.support.tickets.show', $ticket), $ticket);
            });

        return $count;
    }

    private function nextNumber(): string
    {
        $prefix = (string) app(PlatformSettingsService::class)->get('support.ticket_prefix', 'TKT-');
        $last = SupportTicket::withTrashed()->orderByDesc('id')->value('ticket_number');
        $next = $last && preg_match('/(\d+)$/', $last, $matches) ? ((int) $matches[1]) + 1 : 1;

        return $prefix.str_pad((string) $next, 6, '0', STR_PAD_LEFT);
    }

    private function event(SupportTicket $ticket, string $actorType, ?int $actorId, string $event, mixed $old = null, mixed $new = null): void
    {
        SupportTicketEvent::create(['ticket_id' => $ticket->id, 'actor_type' => $actorType, 'actor_id' => $actorId, 'event' => $event, 'old_value' => is_scalar($old) ? $old : json_encode($old), 'new_value' => is_scalar($new) ? $new : json_encode($new)]);
    }

    private function emailRequester(SupportTicket $ticket, string $event, ?int $messageId = null): void
    {
        $settings = app(PlatformSettingsService::class);
        if (! $settings->get('email.email_enabled', false) || blank($ticket->requester_email)) {
            return;
        }
        $job = new DeliverSupportRequesterEmailJob($ticket->id, $event, $messageId);
        app()->environment('testing') || ! $settings->get('queue_scheduler.queue_enabled', true) ? dispatch_sync($job) : dispatch($job);
    }
}
