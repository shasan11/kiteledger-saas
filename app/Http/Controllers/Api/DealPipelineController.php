<?php

namespace App\Http\Controllers\Api;

use App\Models\DealPipeline;
use App\Models\DealStage;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DealPipelineController extends BaseCrudApiController
{
    protected string $modelClass = DealPipeline::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = ['dealStages'];

    protected array $searchable = ['name', 'description'];

    protected array $filterable = [];

    protected array $booleanFilters = ['active', 'is_default', 'is_system_generated'];

    protected array $sortable = ['id', 'name', 'is_default', 'created_at', 'updated_at'];

    protected string $defaultSort = 'name';

    protected array $nested = [
        'stages' => [
            'relation' => 'dealStages',
            'model' => DealStage::class,
            'foreign_key' => 'deal_pipeline_id',
            'delete_key' => 'deleted_stage_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'name' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'is_won_stage' => ['nullable', 'boolean'],
                'is_lost_stage' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'name' => ['required', 'string', 'max:120'],
                'color' => ['nullable', 'string', 'max:20'],
                'probability' => ['nullable', 'integer', 'min:0', 'max:100'],
                'sort_order' => ['nullable', 'integer', 'min:0'],
                'is_won_stage' => ['nullable', 'boolean'],
                'is_lost_stage' => ['nullable', 'boolean'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'name' => ['required', 'string', 'max:120'],
        'description' => ['nullable', 'string'],
        'is_default' => ['nullable', 'boolean'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'name' => ['sometimes', 'required', 'string', 'max:120'],
            'description' => ['sometimes', 'nullable', 'string'],
            'is_default' => ['sometimes', 'nullable', 'boolean'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
