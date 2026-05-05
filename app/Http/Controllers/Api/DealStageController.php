<?php

namespace App\Http\Controllers\Api;

use App\Models\DealStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DealStageController extends BaseCrudApiController
{
    protected string $modelClass = DealStage::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['dealPipeline'];

    protected array $relationDetails = ['dealPipeline' => 'deal_pipeline_id'];

    protected array $searchable = ['name', 'color'];

    protected array $filterable = ['deal_pipeline_id'];

    protected array $booleanFilters = ['active', 'is_won_stage', 'is_lost_stage', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'probability', 'sort_order', 'created_at', 'updated_at'];

    protected string $defaultSort = 'sort_order';

    protected array $storeRules = [
        'deal_pipeline_id' => ['required', 'uuid', 'exists:deal_pipelines,id'],
        'name' => ['required', 'string', 'max:120'],
        'color' => ['nullable', 'string', 'max:20'],
        'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
        'sort_order' => ['nullable', 'integer', 'min:0'],
        'is_won_stage' => ['nullable', 'boolean'],
        'is_lost_stage' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'deal_pipeline_id' => ['sometimes', 'required', 'uuid', 'exists:deal_pipelines,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'color' => ['sometimes', 'nullable', 'string', 'max:20'],
            'probability' => ['sometimes', 'nullable', 'integer', 'min:0', 'max:100'],
            'sort_order' => ['sometimes', 'nullable', 'integer', 'min:0'],
            'is_won_stage' => ['sometimes', 'nullable', 'boolean'],
            'is_lost_stage' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
