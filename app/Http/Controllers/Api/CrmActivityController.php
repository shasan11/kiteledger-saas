<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmActivity;
use App\Models\CrmActivityComment;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CrmActivityController extends BaseCrudApiController
{
    protected string $modelClass = CrmActivity::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'lead',
        'deal',
        'contact',
        'crmAccount',
        'assignedTo',
        'crmActivityComments',
        'crmActivityComments.user',
    ];

    protected array $relationDetails = [
        'lead' => 'lead_id',
        'deal' => 'deal_id',
        'contact' => 'contact_id',
        'crmAccount' => 'crm_account_id',
        'assignedTo' => 'assigned_to_id',
    ];

    protected array $searchable = ['subject', 'description', 'outcome'];

    protected array $filterable = [
        'lead_id',
        'deal_id',
        'contact_id',
        'crm_account_id',
        'assigned_to_id',
        'activity_type',
        'status',
        'priority',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'due_at' => ['from' => 'due_from', 'to' => 'due_to'],
        'completed_at' => ['from' => 'completed_from', 'to' => 'completed_to'],
    ];

    protected array $sortable = [
        'id',
        'activity_type',
        'subject',
        'status',
        'priority',
        'due_at',
        'completed_at',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected function baseQuery(): Builder
    {
        return $this->applyAssignedUserScope(parent::baseQuery());
    }

    protected function findRecord(mixed $id): Model
    {
        return $this->applyAssignedUserScope($this->newQuery())->findOrFail($id);
    }

    private function applyAssignedUserScope(Builder $query): Builder
    {
        $user = request()->user();

        if (!$user || $this->userHasFullCrmAccess($user)) {
            return $query;
        }

        $userId = $user->getAuthIdentifier();

        return $query->where(function (Builder $query) use ($userId) {
            $query->where('assigned_to_id', $userId)
                ->orWhereHas('lead', fn (Builder $leadQuery) => $leadQuery->where('assigned_to_id', $userId))
                ->orWhereHas('deal', fn (Builder $dealQuery) => $dealQuery->where('assigned_to_id', $userId));
        });
    }

    private function userHasFullCrmAccess($user): bool
    {
        return method_exists($user, 'can') && (
            $user->can('crm.manage') ||
            $user->can('crm.*')
        );
    }

    protected array $nested = [
        'comments' => [
            'relation' => 'crmActivityComments',
            'model' => CrmActivityComment::class,
            'foreign_key' => 'crm_activity_id',
            'delete_key' => 'deleted_comment_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => ['user'],
            'relation_details' => ['user' => 'user_id'],
            'rules' => [
                'user_id' => ['nullable', 'integer', 'exists:users,id'],
                'comment' => ['required', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'user_id' => ['nullable', 'integer', 'exists:users,id'],
                'comment' => ['required', 'string'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'lead_id' => ['nullable', 'uuid', 'exists:leads,id'],
        'deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'crm_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
        'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        'activity_type' => ['nullable', 'in:call,email,meeting,task,note,whatsapp,sms,follow_up'],
        'subject' => ['required', 'string', 'max:180'],
        'description' => ['nullable', 'string'],
        'due_at' => ['nullable', 'date'],
        'completed_at' => ['nullable', 'date'],
        'status' => ['nullable', 'in:pending,in_progress,completed,cancelled'],
        'priority' => ['nullable', 'in:low,medium,high,urgent'],
        'outcome' => ['nullable', 'string', 'max:255'],
        'next_follow_up_at' => ['nullable', 'date'],
        'reminder_at' => ['nullable', 'date'],
        'escalated_at' => ['nullable', 'date'],
        'escalated_to' => ['nullable', 'integer', 'exists:users,id'],
        'escalation_reason' => ['nullable', 'string', 'max:255'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    /**
     * Toggle activity completion status (mark complete / reopen).
     */
    public function toggleComplete(Request $request, CrmActivity $crmActivity)
    {
        $user = $request->user();
        abort_unless($user, 401);

        $crmActivity = $this->applyAssignedUserScope(CrmActivity::query())
            ->findOrFail($crmActivity->getKey());

        $isCompleted = $crmActivity->status === 'completed';

        $crmActivity->update([
            'status'       => $isCompleted ? 'pending' : 'completed',
            'completed_at' => $isCompleted ? null : now(),
        ]);

        return response()->json(
            $this->serializeRecord(
                $crmActivity->fresh($this->validEagerLoadRelations($crmActivity))
            )
        );
    }

    public function addComment(Request $request, CrmActivity $crmActivity)
    {
        $user = $request->user();

        abort_unless($user, 401);

        $crmActivity = $this->applyAssignedUserScope(CrmActivity::query())
            ->findOrFail($crmActivity->getKey());

        $data = $request->validate([
            'comment' => ['required', 'string', 'max:5000'],
        ]);

        $crmActivity->crmActivityComments()->create([
            'user_id' => $user->getAuthIdentifier(),
            'user_add_id' => $user->getAuthIdentifier(),
            'comment' => $data['comment'],
            'active' => true,
            'is_system_generated' => false,
        ]);

        return response()->json(
            $this->serializeRecord(
                $crmActivity->fresh($this->validEagerLoadRelations($crmActivity))
            ),
            201
        );
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'lead_id' => ['sometimes', 'nullable', 'uuid', 'exists:leads,id'],
            'deal_id' => ['sometimes', 'nullable', 'uuid', 'exists:deals,id'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'crm_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_accounts,id'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'activity_type' => ['sometimes', 'nullable', 'in:call,email,meeting,task,note,whatsapp,sms,follow_up'],
            'subject' => ['sometimes', 'required', 'string', 'max:180'],
            'description' => ['sometimes', 'nullable', 'string'],
            'due_at' => ['sometimes', 'nullable', 'date'],
            'completed_at' => ['sometimes', 'nullable', 'date'],
            'status' => ['sometimes', 'nullable', 'in:pending,in_progress,completed,cancelled'],
            'priority' => ['sometimes', 'nullable', 'in:low,medium,high,urgent'],
            'outcome' => ['sometimes', 'nullable', 'string', 'max:255'],
            'next_follow_up_at' => ['sometimes', 'nullable', 'date'],
            'reminder_at' => ['sometimes', 'nullable', 'date'],
            'escalated_at' => ['sometimes', 'nullable', 'date'],
            'escalated_to' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'escalation_reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
