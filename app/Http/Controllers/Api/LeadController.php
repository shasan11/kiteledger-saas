<?php

namespace App\Http\Controllers\Api;

use App\Models\Lead;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class LeadController extends BaseCrudApiController
{
    protected string $modelClass = Lead::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'contact',
        'crmAccount',
        'assignedTo',
        'convertedContact',
        'convertedDeal',
    ];

    protected array $relationDetails = [
        'contact' => 'contact_id',
        'crmAccount' => 'crm_account_id',
        'assignedTo' => 'assigned_to_id',
        'convertedContact' => 'converted_contact_id',
        'convertedDeal' => 'converted_deal_id',
    ];

    protected array $searchable = [
        'lead_no',
        'name',
        'company_name',
        'email',
        'phone',
        'mobile',
        'website',
        'city',
        'state',
        'country',
        'lead_source',
        'industry',
        'contact.name',
        'crmAccount.name',
        'contact.code',
        'assignedTo.name',
    ];

    protected array $filterable = [
        'contact_id',
        'crm_account_id',
        'assigned_to_id',
        'lead_source',
        'status',
        'priority',
        'industry',
        'country',
        'state',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'next_follow_up_date' => [
            'from' => 'follow_up_from',
            'to' => 'follow_up_to',
        ],
        'created_at' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'lead_no',
        'name',
        'company_name',
        'expected_value',
        'status',
        'priority',
        'next_follow_up_date',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected function storeRules(Request $request): array
    {
        return [
            'lead_no' => ['nullable', 'string', 'max:40', Rule::unique('leads', 'lead_no')],
            'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'crm_account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
            'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
            'converted_contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
            'converted_deal_id' => ['nullable', 'uuid', 'exists:deals,id'],

            'name' => ['required', 'string', 'max:180'],
            'company_name' => ['nullable', 'string', 'max:180'],
            'email' => ['nullable', 'email', 'max:120'],
            'phone' => ['nullable', 'string', 'max:40'],
            'mobile' => ['nullable', 'string', 'max:40'],
            'website' => ['nullable', 'string', 'max:180'],
            'address' => ['nullable', 'string'],
            'city' => ['nullable', 'string', 'max:80'],
            'state' => ['nullable', 'string', 'max:80'],
            'country' => ['nullable', 'string', 'max:80'],
            'lead_source' => ['nullable', 'string', 'max:80'],
            'industry' => ['nullable', 'string', 'max:120'],
            'expected_value' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:new,contacted,qualified,unqualified,converted,lost'],
            'lost_reason' => ['nullable', 'required_if:status,lost', 'string', 'max:255'],
            'priority' => ['nullable', 'in:low,medium,high,urgent'],
            'next_follow_up_date' => ['nullable', 'date'],
            'last_contacted_at' => ['nullable', 'date'],
            'notes' => ['nullable', 'string'],
            'converted_at' => ['nullable', 'date'],
            'active' => ['nullable', 'boolean'],
            'is_system_generated' => ['nullable', 'boolean'],
            'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'lead_no' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
                Rule::unique('leads', 'lead_no')->ignore($record->getKey(), $record->getKeyName()),
            ],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'crm_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:crm_accounts,id'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'converted_contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'converted_deal_id' => ['sometimes', 'nullable', 'uuid', 'exists:deals,id'],

            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'company_name' => ['sometimes', 'nullable', 'string', 'max:180'],
            'email' => ['sometimes', 'nullable', 'email', 'max:120'],
            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'mobile' => ['sometimes', 'nullable', 'string', 'max:40'],
            'website' => ['sometimes', 'nullable', 'string', 'max:180'],
            'address' => ['sometimes', 'nullable', 'string'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'state' => ['sometimes', 'nullable', 'string', 'max:80'],
            'country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'lead_source' => ['sometimes', 'nullable', 'string', 'max:80'],
            'industry' => ['sometimes', 'nullable', 'string', 'max:120'],
            'expected_value' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'status' => ['sometimes', 'nullable', 'in:new,contacted,qualified,unqualified,converted,lost'],
            'lost_reason' => ['sometimes', 'nullable', 'required_if:status,lost', 'string', 'max:255'],
            'priority' => ['sometimes', 'nullable', 'in:low,medium,high,urgent'],
            'next_follow_up_date' => ['sometimes', 'nullable', 'date'],
            'last_contacted_at' => ['sometimes', 'nullable', 'date'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'converted_at' => ['sometimes', 'nullable', 'date'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
