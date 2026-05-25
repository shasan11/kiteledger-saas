<?php

namespace App\Http\Controllers\Api;

use App\Models\SupportTicket;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class SupportTicketController extends BaseCrudApiController
{
    protected string $modelClass = SupportTicket::class;
    protected ?string $permissionPrefix = 'support.ticket';
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'contact',
        'lead',
        'deal',
        'campaign',
        'assignedTo',
        'createdBy',
        'resolvedBy',
        'closedBy',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contact' => 'contact_id',
        'lead' => 'lead_id',
        'deal' => 'deal_id',
        'campaign' => 'campaign_id',
        'assignedTo' => 'assigned_to_id',
        'createdBy' => 'created_by_id',
    ];

    protected array $searchable = ['ticket_no', 'subject', 'description'];
    protected array $filterable = ['branch_id', 'status', 'priority', 'category', 'source', 'assigned_to_id', 'contact_id', 'lead_id', 'deal_id', 'campaign_id'];
    protected array $booleanFilters = ['active'];
    protected array $dateRangeFilters = [
        'created_at' => ['from' => 'created_from', 'to' => 'created_to'],
        'due_at' => ['from' => 'due_from', 'to' => 'due_to'],
    ];
    protected array $sortable = ['id', 'ticket_no', 'subject', 'status', 'priority', 'due_at', 'last_activity_at', 'created_at', 'updated_at'];
    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'subject' => ['required', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'status' => ['nullable', 'string', 'in:open,in_progress,waiting_customer,waiting_internal,resolved,closed'],
        'priority' => ['nullable', 'string', 'in:low,medium,high,urgent'],
        'category' => ['nullable', 'string', 'max:60'],
        'source' => ['nullable', 'string', 'in:manual,email,phone,whatsapp,web,internal'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'lead_id' => ['nullable', 'uuid', 'exists:leads,id'],
        'deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        'campaign_id' => ['nullable', 'uuid', 'exists:crm_campaigns,id'],
        'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        'due_at' => ['nullable', 'date'],
        'tags' => ['nullable', 'array'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'subject' => ['sometimes', 'required', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'in:open,in_progress,waiting_customer,waiting_internal,resolved,closed'],
            'priority' => ['sometimes', 'nullable', 'string', 'in:low,medium,high,urgent'],
            'category' => ['sometimes', 'nullable', 'string', 'max:60'],
            'source' => ['sometimes', 'nullable', 'string', 'in:manual,email,phone,whatsapp,web,internal'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'lead_id' => ['sometimes', 'nullable', 'uuid', 'exists:leads,id'],
            'deal_id' => ['sometimes', 'nullable', 'uuid', 'exists:deals,id'],
            'campaign_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_campaigns,id'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'tags' => ['sometimes', 'nullable', 'array'],
        ];
    }

    protected function applySearch(Builder $query, Request $request): void
    {
        parent::applySearch($query, $request);

        $this->applyVisibilityScope($query, $request);
    }

    protected function applyVisibilityScope(Builder $query, Request $request): void
    {
        $user = $request->user();
        if (!$user) {
            return;
        }

        $canViewAll = $user->can('support.ticket.view')
            && ($user->hasRole('Super Admin') || $user->can('support.ticket.assign'));

        if (!$canViewAll) {
            $query->where(function (Builder $q) use ($user) {
                $q->where('assigned_to_id', $user->id)
                    ->orWhere('created_by_id', $user->id);
            });
        }
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        $parentData['ticket_no'] = $parentData['ticket_no'] ?? $this->generateTicketNo();
        $parentData['created_by_id'] = $parentData['created_by_id'] ?? auth()->id();
        $parentData['status'] = $parentData['status'] ?? 'open';
        $parentData['priority'] = $parentData['priority'] ?? 'medium';
        $parentData['source'] = $parentData['source'] ?? 'manual';
        $parentData['last_activity_at'] = now();

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $parentData = parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

        if (isset($parentData['status'])) {
            $oldStatus = $record->status;
            $newStatus = $parentData['status'];

            if ($oldStatus !== $newStatus) {
                $this->handleStatusTransition($parentData, $record, $oldStatus, $newStatus);
            }
        }

        return $parentData;
    }

    protected function handleStatusTransition(array &$data, Model $record, string $oldStatus, string $newStatus): void
    {
        $userId = auth()->id();

        if ($newStatus === 'resolved' && $oldStatus !== 'resolved') {
            $data['resolved_at'] = $data['resolved_at'] ?? now();
            $data['resolved_by_id'] = $data['resolved_by_id'] ?? $userId;
        }

        if ($newStatus === 'closed' && $oldStatus !== 'closed') {
            $data['closed_at'] = $data['closed_at'] ?? now();
            $data['closed_by_id'] = $data['closed_by_id'] ?? $userId;
        }

        if (in_array($oldStatus, ['resolved', 'closed']) && in_array($newStatus, ['open', 'in_progress'])) {
            $data['closed_at'] = null;
            $data['closed_by_id'] = null;
            if ($oldStatus === 'resolved') {
                $data['resolved_at'] = null;
                $data['resolved_by_id'] = null;
            }
        }

        $data['last_activity_at'] = now();
    }

    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $this->checkAccess($request, 'update');

        $ticket = SupportTicket::query()->findOrFail($id);

        $validated = $request->validate([
            'status' => ['required', 'string', 'in:' . implode(',', SupportTicket::STATUSES)],
        ]);

        $oldStatus = $ticket->status;
        $newStatus = $validated['status'];
        $data = ['status' => $newStatus];

        $this->handleStatusTransition($data, $ticket, $oldStatus, $newStatus);

        $ticket->update($data);

        if ($oldStatus !== $newStatus) {
            $ticket->comments()->create([
                'user_id' => auth()->id(),
                'type' => 'status_change',
                'body' => "Status changed from {$oldStatus} to {$newStatus}",
                'is_internal' => true,
            ]);
        }

        return response()->json($ticket->fresh($this->relations));
    }

    public function summary(Request $request): JsonResponse
    {
        $this->checkAccess($request, 'index');

        $query = SupportTicket::query();
        $this->applyBranchScope($query, $request);
        $this->applyVisibilityScope($query, $request);

        $now = now();

        $stats = $query->selectRaw("
            COUNT(*) as total,
            SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) as open_count,
            SUM(CASE WHEN status = 'in_progress' THEN 1 ELSE 0 END) as in_progress_count,
            SUM(CASE WHEN status IN ('waiting_customer', 'waiting_internal') THEN 1 ELSE 0 END) as waiting_count,
            SUM(CASE WHEN priority = 'urgent' AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as urgent_count,
            SUM(CASE WHEN due_at IS NOT NULL AND due_at < ? AND status NOT IN ('resolved', 'closed') THEN 1 ELSE 0 END) as overdue_count,
            SUM(CASE WHEN status = 'resolved' AND resolved_at >= ? THEN 1 ELSE 0 END) as resolved_this_month
        ", [$now, $now->copy()->startOfMonth()])
            ->first();

        return response()->json($stats);
    }

    protected function generateTicketNo(): string
    {
        return DB::transaction(function () {
            $max = SupportTicket::withTrashed()
                ->where('ticket_no', 'like', 'SUP-%')
                ->pluck('ticket_no')
                ->map(fn ($no) => (int) preg_replace('/\D+/', '', (string) $no))
                ->max() ?? 0;

            do {
                $ticketNo = 'SUP-' . str_pad((string) (++$max), 6, '0', STR_PAD_LEFT);
            } while (SupportTicket::withTrashed()->where('ticket_no', $ticketNo)->exists());

            return $ticketNo;
        });
    }
}
