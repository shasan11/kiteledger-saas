<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\Milestone;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class MilestoneController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = Milestone::class;

    protected ?string $permissionPrefix = 'project.milestone';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
    ];

    protected array $relationDetails = [
        'project' => 'project_id',
    ];

    protected array $searchable = [
        'name',
        'description',
        'status',
        'project.name',
    ];

    protected array $filterable = [
        'project_id',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'start_date' => ['from' => 'start_date_from', 'to' => 'start_date_to'],
        'end_date' => ['from' => 'end_date_from', 'to' => 'end_date_to'],
    ];

    protected array $sortable = [
        'id',
        'project_id',
        'name',
        'start_date',
        'end_date',
        'status',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'name' => ['required', 'string', 'max:180'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        'description' => ['required', 'string'],
        'status' => ['nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'name' => ['sometimes', 'required', 'string', 'max:180'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after_or_equal:start_date'],
            'description' => ['sometimes', 'required', 'string'],
            'status' => ['sometimes', 'nullable', 'string', 'in:PENDING,IN_PROGRESS,COMPLETED,CANCELLED'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
