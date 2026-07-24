<?php

namespace App\Http\Controllers\Central;

use App\Http\Controllers\Controller;
use App\Models\Central\CentralAdmin;
use App\Models\Central\SupportCategory;
use App\Models\Central\SupportSavedReply;
use App\Models\Central\SupportTicket;
use App\Models\Central\SupportTicketAttachment;
use App\Models\Central\Tenant;
use App\Services\SaaS\CentralAuditService;
use App\Services\SaaS\SupportTicketService;
use App\Support\SafeHtml;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class SupportController extends Controller
{
    public function categories()
    {
        return Inertia::render('Central/Support/Configuration', [
            'type' => 'categories',
            'rows' => SupportCategory::with('defaultAssignee:id,name')->orderBy('sort_order')->orderBy('name')->get(),
            'categories' => [],
            'admins' => CentralAdmin::where('is_active', true)->orderBy('name')->get(['id', 'name']),
        ]);
    }

    public function storeCategory(Request $request, CentralAuditService $audit)
    {
        $data = $this->categoryData($request);
        $category = SupportCategory::create($data);
        $audit->log($request, 'support_category.created', $category, [], $category->toArray());

        return back()->with('success', 'Support category created.');
    }

    public function updateCategory(Request $request, SupportCategory $category, CentralAuditService $audit)
    {
        $old = $category->toArray();
        $category->update($this->categoryData($request, $category));
        $audit->log($request, 'support_category.updated', $category, $old, $category->toArray());

        return back()->with('success', 'Support category updated.');
    }

    public function destroyCategory(Request $request, SupportCategory $category, CentralAuditService $audit)
    {
        abort_if($category->tickets()->exists(), 422, 'Reassign tickets before deleting this category.');
        $audit->log($request, 'support_category.deleted', $category, $category->toArray(), []);
        $category->delete();

        return back()->with('success', 'Support category deleted.');
    }

    public function savedReplies()
    {
        return Inertia::render('Central/Support/Configuration', [
            'type' => 'saved-replies',
            'rows' => SupportSavedReply::with('category:id,name')->latest('updated_at')->get(),
            'categories' => SupportCategory::where('is_active', true)->orderBy('sort_order')->get(['id', 'name']),
            'admins' => [],
        ]);
    }

    public function storeSavedReply(Request $request, CentralAuditService $audit)
    {
        $data = $this->savedReplyData($request) + ['created_by' => $request->user('central')->id, 'updated_by' => $request->user('central')->id];
        $reply = SupportSavedReply::create($data);
        $audit->log($request, 'support_saved_reply.created', $reply, [], $reply->only(['title', 'category_id', 'is_active']));

        return back()->with('success', 'Saved reply created.');
    }

    public function updateSavedReply(Request $request, SupportSavedReply $reply, CentralAuditService $audit)
    {
        $old = $reply->only(['title', 'body', 'category_id', 'is_active']);
        $reply->update($this->savedReplyData($request) + ['updated_by' => $request->user('central')->id]);
        $audit->log($request, 'support_saved_reply.updated', $reply, $old, $reply->only(['title', 'body', 'category_id', 'is_active']));

        return back()->with('success', 'Saved reply updated.');
    }

    public function destroySavedReply(Request $request, SupportSavedReply $reply, CentralAuditService $audit)
    {
        $audit->log($request, 'support_saved_reply.deleted', $reply, $reply->only(['title', 'category_id']), []);
        $reply->delete();

        return back()->with('success', 'Saved reply deleted.');
    }

    public function index(Request $request)
    {
        $query = SupportTicket::with(['tenant:id,company_name', 'category:id,name', 'assignee:id,name']);
        foreach (['status', 'priority', 'category_id', 'assigned_admin_id', 'source', 'tenant_id'] as $filter) {
            if ($request->filled($filter)) {
                $query->where($filter, $request->input($filter));
            }
        }
        if ($request->filled('created_from')) {
            $query->whereDate('created_at', '>=', $request->date('created_from'));
        }
        if ($request->filled('created_to')) {
            $query->whereDate('created_at', '<=', $request->date('created_to'));
        }
        if ($request->filled('last_reply_from')) {
            $query->whereDate('last_reply_at', '>=', $request->date('last_reply_from'));
        }
        if ($request->filled('last_reply_to')) {
            $query->whereDate('last_reply_at', '<=', $request->date('last_reply_to'));
        }
        if ($request->filled('sla_state')) {
            $request->string('sla_state')->toString() === 'breached' ? $query->whereNotNull('sla_breached_at') : $query->whereNull('sla_breached_at');
        }
        if ($request->filled('view')) {
            match ($request->string('view')->toString()) {
                'mine' => $query->where('assigned_admin_id', $request->user('central')->id), 'unassigned' => $query->whereNull('assigned_admin_id'),
                'urgent' => $query->where('priority', 'urgent'), 'sla_breached' => $query->whereNotNull('sla_breached_at'),
                'pending_customer' => $query->where('status', 'pending_customer'), 'resolved' => $query->where('status', 'resolved'),
                'closed' => $query->where('status', 'closed'), default => null,
            };
        }
        if ($request->filled('search')) {
            $term = '%'.$request->string('search').'%';
            $query->where(fn ($q) => $q->where('ticket_number', 'like', $term)->orWhere('subject', 'like', $term)->orWhere('requester_email', 'like', $term));
        }
        $metrics = [
            'open' => SupportTicket::whereNotIn('status', ['resolved', 'closed'])->count(), 'unassigned' => SupportTicket::whereNull('assigned_admin_id')->whereNotIn('status', ['resolved', 'closed'])->count(),
            'urgent' => SupportTicket::where('priority', 'urgent')->whereNotIn('status', ['resolved', 'closed'])->count(), 'pending_support' => SupportTicket::where('status', 'pending_support')->count(),
            'pending_customer' => SupportTicket::where('status', 'pending_customer')->count(), 'sla_breached' => SupportTicket::whereNotNull('sla_breached_at')->whereNotIn('status', ['resolved', 'closed'])->count(),
            'resolved_today' => SupportTicket::whereDate('resolved_at', today())->count(),
        ];

        return Inertia::render('Central/Support/Index', [
            'tickets' => $query->latest('updated_at')->paginate(30)->withQueryString(), 'metrics' => $metrics, 'filters' => $request->all(),
            'filterOptions' => [
                'tenants' => Tenant::orderBy('company_name')->get(['id', 'company_name']),
                'categories' => SupportCategory::orderBy('name')->get(['id', 'name']),
                'admins' => CentralAdmin::where('is_active', true)->orderBy('name')->get(['id', 'name']),
                'sources' => SupportTicket::whereNotNull('source')->distinct()->orderBy('source')->pluck('source'),
            ],
        ]);
    }

    public function show(Request $request, SupportTicket $ticket)
    {
        return Inertia::render('Central/Support/Show', [
            'ticket' => $ticket->load(['tenant.subscription.plan', 'tenant.invoices' => fn ($q) => $q->latest()->limit(5), 'category', 'assignee', 'messages.attachments', 'events']),
            'categories' => SupportCategory::where('is_active', true)->orderBy('sort_order')->get(),
            'admins' => CentralAdmin::where('is_active', true)->get(['id', 'name', 'email']),
            'savedReplies' => SupportSavedReply::where('is_active', true)->get(['id', 'title', 'body']),
            'canDelete' => $request->user('central')->can('ticket.delete'),
        ]);
    }

    public function update(Request $request, SupportTicket $ticket, SupportTicketService $service, CentralAuditService $audit)
    {
        $data = $request->validate([
            'status' => ['sometimes', Rule::in(['open', 'pending_support', 'pending_customer', 'resolved', 'closed'])],
            'priority' => ['sometimes', Rule::in(['low', 'normal', 'high', 'urgent'])], 'category_id' => ['sometimes', 'nullable', 'exists:support_categories,id'],
            'assigned_admin_id' => ['sometimes', 'nullable', 'exists:central_admin_users,id'],
        ]);
        if (array_key_exists('assigned_admin_id', $data)) {
            abort_unless($request->user('central')->can('ticket.assign'), 403);
        }
        if (isset($data['status']) && in_array($data['status'], ['resolved', 'closed'], true)) {
            abort_unless($request->user('central')->can('ticket.close'), 403);
        }
        $old = $ticket->only(array_keys($data));
        $service->transition($ticket, $data, 'admin', $request->user('central')->id);
        $audit->log($request, 'ticket.updated', $ticket, $old, $data);

        return back()->with('success', 'Ticket updated.');
    }

    public function reply(Request $request, SupportTicket $ticket, SupportTicketService $service, CentralAuditService $audit)
    {
        $data = $request->validate(['body' => ['required', 'string', 'max:50000'], 'is_internal_note' => ['boolean']] + $service->attachmentValidationRules());
        $admin = $request->user('central');
        $message = $service->reply($ticket, $data + ['sender_type' => 'admin', 'sender_id' => $admin->id, 'sender_name' => $admin->name, 'sender_email' => $admin->email]);
        foreach ($request->file('attachments', []) as $file) {
            $message->attachments()->create(['ticket_id' => $ticket->id, 'disk' => 'local', 'path' => $file->store('central/support/'.$ticket->id, 'local'), 'original_filename' => $file->getClientOriginalName(), 'mime_type' => $file->getMimeType(), 'size' => $file->getSize(), 'uploader_type' => 'admin', 'uploader_id' => $admin->id]);
        }
        $audit->log($request, $data['is_internal_note'] ?? false ? 'ticket.internal_note_added' : 'ticket.replied', $ticket, [], ['message_id' => $message->id]);

        return back()->with('success', $data['is_internal_note'] ?? false ? 'Internal note added.' : 'Reply sent.');
    }

    public function download(Request $request, SupportTicketAttachment $attachment)
    {
        abort_unless(Storage::disk($attachment->disk)->exists($attachment->getRawOriginal('path')), 404);

        return Storage::disk($attachment->disk)->download($attachment->getRawOriginal('path'), $attachment->original_filename);
    }

    public function destroy(Request $request, SupportTicket $ticket, CentralAuditService $audit)
    {
        abort_unless($request->user('central')->can('ticket.delete'), 403);
        $audit->log($request, 'ticket.deleted', $ticket, $ticket->only(['ticket_number', 'subject', 'status']), []);
        $ticket->delete();

        return redirect()->route('central.support.tickets.index')->with('success', 'Ticket moved to the recycle state.');
    }

    private function categoryData(Request $request, ?SupportCategory $category = null): array
    {
        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'], 'slug' => ['nullable', 'alpha_dash', 'max:255', Rule::unique('support_categories', 'slug')->ignore($category)],
            'description' => ['nullable', 'string', 'max:5000'], 'default_priority' => ['required', Rule::in(['low', 'normal', 'high', 'urgent'])],
            'default_assignee_id' => ['nullable', 'exists:central_admin_users,id'], 'is_active' => ['required', 'boolean'], 'sort_order' => ['required', 'integer', 'min:0', 'max:100000'],
        ]);
        $data['slug'] = $data['slug'] ?: Str::slug($data['name']);
        validator(['slug' => $data['slug']], ['slug' => ['required', 'alpha_dash', 'max:255', Rule::unique('support_categories', 'slug')->ignore($category)]])->validate();

        return $data;
    }

    private function savedReplyData(Request $request): array
    {
        $data = $request->validate([
            'title' => ['required', 'string', 'max:255'], 'body' => ['required', 'string', 'max:50000'],
            'category_id' => ['nullable', 'exists:support_categories,id'], 'is_active' => ['required', 'boolean'],
        ]);
        $data['body'] = SafeHtml::clean($data['body']);

        return $data;
    }
}
