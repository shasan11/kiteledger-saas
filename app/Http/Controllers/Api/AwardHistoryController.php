<?php

namespace App\Http\Controllers\Api;

use App\Models\AwardHistory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AwardHistoryController extends BaseCrudApiController
{
    protected string $modelClass = AwardHistory::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'user',
        'award',
    ];

    protected array $relationDetails = [
        'user' => 'user_id',
        'award' => 'award_id',
    ];

    protected array $searchable = [
        'comment',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
        'award.name',
    ];

    protected array $filterable = [
        'user_id',
        'award_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'awarded_date' => ['from' => 'awarded_date_from', 'to' => 'awarded_date_to'],
    ];

    protected array $sortable = [
        'id',
        'user_id',
        'award_id',
        'awarded_date',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-awarded_date';

    protected array $storeRules = [
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'award_id' => ['required', 'uuid', 'exists:awards,id'],
        'awarded_date' => ['required', 'date'],
        'comment' => ['nullable', 'string', 'max:255'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'award_id' => ['sometimes', 'required', 'uuid', 'exists:awards,id'],
            'awarded_date' => ['sometimes', 'required', 'date'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
