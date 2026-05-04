<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmActivity;
use App\Models\CrmActivityComment;
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
        'assignedTo',
        'crmActivityComments',
    ];

    protected array $relationDetails = [
        'lead' => 'lead_id',
        'deal' => 'deal_id',
        'contact' => 'contact_id',
        'assignedTo' => 'assigned_to_id',
    ];

    protected array $searchable = ['subject', 'description', 'outcome'];

    protected array $filterable = [
        'lead_id',
        'deal_id',
        'contact_id',
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
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'lead_id' => ['sometimes', 'nullable', 'uuid', 'exists:leads,id'],
            'deal_id' => ['sometimes', 'nullable', 'uuid', 'exists:deals,id'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
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
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
