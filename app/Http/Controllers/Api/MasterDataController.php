<?php

namespace App\Http\Controllers\Api;

use App\Models\MasterData;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class MasterDataController extends BaseCrudApiController
{
    protected string $modelClass = MasterData::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $searchable = ['type', 'group', 'key', 'value'];

    protected array $filterable = ['type', 'group', 'key'];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $sortable = ['id', 'type', 'group', 'key', 'value', 'created_at', 'updated_at'];

    protected string $defaultSort = 'type';

    protected array $storeRules = [
        'type' => [
            'required',
            'string',
            'in:custom_status,lead_source,deal_stage,task_type,credit_term,cost_term,payment_mode,tds_type,industry,activity_type,lost_reason',
        ],
        'group' => ['required', 'string', 'max:80'],
        'key' => ['required', 'string', 'max:120'],
        'value' => ['required', 'string', 'max:180'],
        'meta' => ['nullable', 'array'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'type' => [
                'sometimes',
                'required',
                'string',
                'in:custom_status,lead_source,deal_stage,task_type,credit_term,cost_term,payment_mode,tds_type,industry,activity_type,lost_reason',
            ],
            'group' => ['sometimes', 'required', 'string', 'max:80'],
            'key' => ['sometimes', 'required', 'string', 'max:120'],
            'value' => ['sometimes', 'required', 'string', 'max:180'],
            'meta' => ['sometimes', 'nullable', 'array'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
