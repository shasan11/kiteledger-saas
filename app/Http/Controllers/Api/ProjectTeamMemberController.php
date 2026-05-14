<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Api\Concerns\AuthorizesProjectResources;
use App\Models\ProjectTeamMember;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProjectTeamMemberController extends BaseCrudApiController
{
    use AuthorizesProjectResources;

    protected string $modelClass = ProjectTeamMember::class;

    protected ?string $permissionPrefix = 'project.team';
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'projectTeam',
        'user',
    ];

    protected array $relationDetails = [
        'projectTeam' => 'project_team_id',
        'user' => 'user_id',
    ];

    protected array $searchable = [
        'projectTeam.project_team_name',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
    ];

    protected array $filterable = [
        'project_team_id',
        'user_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'project_team_id',
        'user_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'project_team_id' => ['required', 'uuid', 'exists:project_teams,id'],
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'project_team_id' => ['sometimes', 'required', 'uuid', 'exists:project_teams,id'],
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
