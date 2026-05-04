<?php

namespace App\Http\Controllers\Api;

use App\Models\Deal;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DealController extends BaseCrudApiController
{
    protected string $modelClass = Deal::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'lead',
        'contact',
        'dealPipeline',
        'dealStage',
        'assignedTo',
    ];

    protected array $relationDetails = [
        'lead' => 'lead_id',
        'contact' => 'contact_id',
        'dealPipeline' => 'deal_pipeline_id',
        'dealStage' => 'deal_stage_id',
        'assignedTo' => 'assigned_to_id',
    ];

    protected array $searchable = [
        'deal_no',
        'title',
        'source',
        'lost_reason',
        'description',
    ];

    protected array $filterable = [
        'lead_id',
        'contact_id',
        'deal_pipeline_id',
        'deal_stage_id',
        'assigned_to_id',
        'status',
        'priority',
        'source',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'expected_close_date' => ['from' => 'close_from', 'to' => 'close_to'],
        'closed_date' => ['from' => 'closed_from', 'to' => 'closed_to'],
    ];

    protected array $sortable = [
        'id',
        'deal_no',
        'title',
        'amount',
        'expected_close_date',
        'closed_date',
        'probability',
        'status',
        'priority',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'deal_no' => ['nullable', 'string', 'max:40', 'unique:deals,deal_no'],
        'lead_id' => ['nullable', 'uuid', 'exists:leads,id'],
        'contact_id' => ['nullable', 'uuid', 'exists:contacts,id'],
        'deal_pipeline_id' => ['nullable', 'uuid', 'exists:deal_pipelines,id'],
        'deal_stage_id' => ['nullable', 'uuid', 'exists:deal_stages,id'],
        'assigned_to_id' => ['nullable', 'integer', 'exists:users,id'],
        'title' => ['required', 'string', 'max:180'],
        'amount' => ['nullable', 'numeric', 'min:0'],
        'expected_close_date' => ['nullable', 'date'],
        'closed_date' => ['nullable', 'date'],
        'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
        'source' => ['nullable', 'string', 'max:80'],
        'priority' => ['nullable', 'in:low,medium,high,urgent'],
        'status' => ['nullable', 'in:open,won,lost,cancelled'],
        'lost_reason' => ['nullable', 'string', 'max:255'],
        'description' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'deal_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:deals,deal_no,' . $record->id . ',id'],
            'lead_id' => ['sometimes', 'nullable', 'uuid', 'exists:leads,id'],
            'contact_id' => ['sometimes', 'nullable', 'uuid', 'exists:contacts,id'],
            'deal_pipeline_id' => ['sometimes', 'nullable', 'uuid', 'exists:deal_pipelines,id'],
            'deal_stage_id' => ['sometimes', 'nullable', 'uuid', 'exists:deal_stages,id'],
            'assigned_to_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'title' => ['sometimes', 'required', 'string', 'max:180'],
            'amount' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'expected_close_date' => ['sometimes', 'nullable', 'date'],
            'closed_date' => ['sometimes', 'nullable', 'date'],
            'probability' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'source' => ['sometimes', 'nullable', 'string', 'max:80'],
            'priority' => ['sometimes', 'nullable', 'in:low,medium,high,urgent'],
            'status' => ['sometimes', 'nullable', 'in:open,won,lost,cancelled'],
            'lost_reason' => ['sometimes', 'nullable', 'string', 'max:255'],
            'description' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
