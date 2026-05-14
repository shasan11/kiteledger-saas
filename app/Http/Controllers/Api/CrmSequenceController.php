<?php

namespace App\Http\Controllers\Api;

use App\Models\CrmSequence;
use App\Models\CrmSequenceStep;

class CrmSequenceController extends BaseCrudApiController
{
    protected string $modelClass = CrmSequence::class;

    protected array $relations = ['steps'];

    protected array $searchable = ['name', 'description'];

    protected array $filterable = ['branch_id', 'target_type'];

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected array $nested = [
        'steps' => [
            'relation' => 'steps',
            'model' => CrmSequenceStep::class,
            'foreign_key' => 'sequence_id',
            'delete_key' => 'deleted_step_ids',
            'replace_on_update' => false,
            'rules' => [
                'step_order' => ['nullable', 'integer', 'min:1'],
                'action_type' => ['required', 'in:call,email,whatsapp,task,meeting'],
                'delay_days' => ['nullable', 'integer', 'min:0'],
                'title' => ['required', 'string', 'max:180'],
                'description' => ['nullable', 'string'],
                'template' => ['nullable', 'string'],
                'active' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:180'],
        'description' => ['nullable', 'string'],
        'target_type' => ['required', 'in:lead,deal,customer'],
        'active' => ['nullable', 'boolean'],
    ];
}
