<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmCommunication;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CrmCommunicationController extends BaseCrudApiController
{
    protected string $modelClass = CrmCommunication::class;

    protected array $relations = ['account', 'contact', 'lead', 'deal', 'createdBy'];

    protected array $relationDetails = [
        'account' => 'account_id',
        'contact' => 'contact_id',
        'lead' => 'lead_id',
        'deal' => 'deal_id',
        'createdBy' => 'created_by',
    ];

    protected array $searchable = ['subject', 'body', 'from', 'to'];

    protected array $filterable = ['branch_id', 'account_id', 'contact_id', 'lead_id', 'deal_id', 'type', 'direction', 'sentiment', 'created_by'];

    protected array $dateRangeFilters = [
        'communication_date' => ['from' => 'date_from', 'to' => 'date_to'],
    ];

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'account_id' => ['nullable', 'uuid', 'exists:crm_accounts,id'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'lead_id' => ['nullable', 'uuid', 'exists:leads,id'],
        'deal_id' => ['nullable', 'uuid', 'exists:deals,id'],
        'type' => ['required', 'in:email,whatsapp,sms,call,meeting,note'],
        'direction' => ['nullable', 'in:inbound,outbound,internal'],
        'subject' => ['nullable', 'string', 'max:180'],
        'body' => ['nullable', 'string'],
        'external_message_id' => ['nullable', 'string', 'max:180'],
        'from' => ['nullable', 'string', 'max:180'],
        'to' => ['nullable', 'string', 'max:500'],
        'cc' => ['nullable', 'string', 'max:500'],
        'sentiment' => ['nullable', 'in:positive,neutral,negative'],
        'communication_date' => ['nullable', 'date'],
        'created_by' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $parentData['created_by'] = $parentData['created_by'] ?? request()->user()?->id;
        $parentData['communication_date'] = $parentData['communication_date'] ?? now();

        return $parentData;
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return $this->makeRulesPartial($this->storeRules);
    }

    public function syncEmail()
    {
        return response()->json([
            'message' => 'Email sync is available only when CRM email sync credentials and feature flags are configured.',
            'synced' => false,
            'manual_logging_enabled' => true,
        ], 202);
    }
}
