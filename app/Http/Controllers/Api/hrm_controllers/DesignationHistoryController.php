<?php

namespace App\Http\Controllers\Api;

use App\Models\DesignationHistory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DesignationHistoryController extends BaseCrudApiController
{
    protected string $modelClass = DesignationHistory::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected array $relations = [
        'user',
        'designation',
    ];

    protected array $relationDetails = [
        'user' => 'user_id',
        'designation' => 'designation_id',
    ];

    protected array $searchable = [
        'comment',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
        'designation.name',
    ];

    protected array $filterable = [
        'user_id',
        'designation_id',
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
        'user_id',
        'designation_id',
        'start_date',
        'end_date',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-start_date';

    protected array $storeRules = [
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'designation_id' => ['required', 'uuid', 'exists:designations,id'],
        'start_date' => ['required', 'date'],
        'end_date' => ['nullable', 'date', 'after_or_equal:start_date'],
        'comment' => ['nullable', 'string', 'max:255'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'designation_id' => ['sometimes', 'required', 'uuid', 'exists:designations,id'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:start_date'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
