<?php

namespace App\Http\Controllers\Api;

use App\Models\LeaveType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class LeaveTypeController extends BaseCrudApiController
{
    protected string $modelClass = LeaveType::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $searchable = ['name', 'code'];
    protected array $filterable = ['branch_id'];
    protected array $booleanFilters = ['active', 'requires_approval', 'is_paid'];
    protected array $dateRangeFilters = [];
    protected array $sortable = ['id', 'name', 'code', 'max_days_per_year', 'created_at'];
    protected string $defaultSort = 'name';
    protected array $storeRules = ['branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'name' => ['required', 'string', 'max:120'], 'code' => ['nullable', 'string', 'max:40', 'unique:leave_types,code'], 'max_days_per_year' => ['nullable', 'integer', 'min:0'], 'requires_approval' => ['nullable', 'boolean'], 'is_paid' => ['nullable', 'boolean'], 'active' => ['nullable', 'boolean']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'], 'name' => ['sometimes', 'required', 'string', 'max:120'], 'code' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:leave_types,code,' . $record->id . ',id'], 'max_days_per_year' => ['sometimes', 'nullable', 'integer', 'min:0'], 'requires_approval' => ['sometimes', 'nullable', 'boolean'], 'is_paid' => ['sometimes', 'nullable', 'boolean'], 'active' => ['sometimes', 'nullable', 'boolean']]; }
}
