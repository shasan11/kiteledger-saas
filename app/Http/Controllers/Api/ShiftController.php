<?php

namespace App\Http\Controllers\Api;

use App\Models\Shift;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ShiftController extends BaseCrudApiController
{
    protected string $modelClass = Shift::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $searchable = ['name'];
    protected array $filterable = ['branch_id'];
    protected array $booleanFilters = ['active'];
    protected array $dateRangeFilters = [];
    protected array $sortable = ['id', 'name', 'start_time', 'end_time', 'created_at'];
    protected string $defaultSort = 'name';
    protected array $storeRules = ['branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'name' => ['required', 'string', 'max:120'], 'start_time' => ['required', 'date_format:H:i:s'], 'end_time' => ['required', 'date_format:H:i:s'], 'grace_minutes' => ['nullable', 'integer', 'min:0'], 'hours_per_day' => ['nullable', 'numeric', 'min:0'], 'active' => ['nullable', 'boolean']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'], 'name' => ['sometimes', 'required', 'string', 'max:120'], 'start_time' => ['sometimes', 'required', 'date_format:H:i:s'], 'end_time' => ['sometimes', 'required', 'date_format:H:i:s'], 'grace_minutes' => ['sometimes', 'nullable', 'integer', 'min:0'], 'hours_per_day' => ['sometimes', 'nullable', 'numeric', 'min:0'], 'active' => ['sometimes', 'nullable', 'boolean']]; }
}
