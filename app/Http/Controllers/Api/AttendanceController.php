<?php

namespace App\Http\Controllers\Api;

use App\Models\Attendance;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class AttendanceController extends BaseCrudApiController
{
    protected string $modelClass = Attendance::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'user',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'user' => 'user_id',
    ];

    protected array $searchable = [
        'ip',
        'comment',
        'in_time_status',
        'out_time_status',
        'branch.name',
        'branch.code',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
    ];

    protected array $filterable = [
        'branch_id',
        'user_id',
        'in_time_status',
        'out_time_status',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'in_time' => ['from' => 'in_time_from', 'to' => 'in_time_to'],
        'out_time' => ['from' => 'out_time_from', 'to' => 'out_time_to'],
    ];

    protected array $sortable = [
        'id',
        'user_id',
        'in_time',
        'out_time',
        'total_hour',
        'in_time_status',
        'out_time_status',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-in_time';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'in_time' => ['required', 'date', 'before_or_equal:now'],
        'out_time' => ['nullable', 'date', 'before_or_equal:now', 'after_or_equal:in_time'],
        'ip' => ['nullable', 'string', 'max:60'],
        'comment' => ['nullable', 'string', 'max:255'],
        'punch_by' => ['nullable', 'integer', 'exists:users,id'],
        'total_hour' => ['nullable', 'numeric', 'min:0'],
        'in_time_status' => ['nullable', 'string', 'max:30'],
        'out_time_status' => ['nullable', 'string', 'max:30'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'in_time' => ['sometimes', 'required', 'date', 'before_or_equal:now'],
            'out_time' => ['sometimes', 'nullable', 'date', 'before_or_equal:now', 'after_or_equal:in_time'],
            'ip' => ['sometimes', 'nullable', 'string', 'max:60'],
            'comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'punch_by' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
            'total_hour' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'in_time_status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'out_time_status' => ['sometimes', 'nullable', 'string', 'max:30'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
