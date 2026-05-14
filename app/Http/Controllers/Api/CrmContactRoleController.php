<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmContactRole;

class CrmContactRoleController extends BaseCrudApiController
{
    protected string $modelClass = CrmContactRole::class;

    protected array $relations = ['account', 'contact', 'deal'];

    protected array $relationDetails = [
        'account' => 'account_id',
        'contact' => 'contact_id',
        'deal' => 'deal_id',
    ];

    protected array $filterable = ['account_id', 'contact_id', 'deal_id', 'role', 'is_primary'];

    protected array $booleanFilters = ['is_primary'];

    protected array $storeRules = [
        'account_id' => ['required', 'uuid', 'exists:crm_accounts,id'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        'role' => ['nullable', 'in:decision_maker,influencer,finance_contact,technical_contact,end_user,gatekeeper,other'],
        'is_primary' => ['nullable', 'boolean'],
        'remarks' => ['nullable', 'string'],
    ];
}
