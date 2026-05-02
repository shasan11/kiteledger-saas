<?php

namespace App\Http\Controllers\Api;

use App\Models\ProjectTeam;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectTeamController extends BaseCrudApiController
{
    protected string $modelClass = ProjectTeam::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'project',
    ];

    protected array $relationDetails = [
        'project' => 'project_id',
    ];

    protected array $searchable = [
        'project_team_name',
        'project.name',
    ];

    protected array $filterable = [
        'project_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'project_team_name',
        'project_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'project_team_name';

    protected array $storeRules = [
        'project_team_name' => ['required', 'string', 'max:120'],
        'project_id' => ['required', 'uuid', 'exists:projects,id'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_team_name' => ['sometimes', 'required', 'string', 'max:120'],
            'project_id' => ['sometimes', 'required', 'uuid', 'exists:projects,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
