<?php

namespace App\Http\Controllers\Api;

use App\Models\Designation;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class DesignationController extends BaseCrudApiController
{
    protected string $modelClass = Designation::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected array $relations = ['branch','department'];
    protected array $relationDetails = ['branch' => 'branch_id', 'department' => 'department_id'];
    protected array $searchable = ['name', 'code', 'description'];
    protected array $filterable = ['branch_id', 'department_id'];
    protected array $booleanFilters = ['active'];
    protected array $dateRangeFilters = [];
    protected array $sortable = ['id', 'name', 'code', 'department_id', 'created_at'];
    protected string $defaultSort = 'name';
    protected array $storeRules = ['branch_id' => ['nullable', 'uuid', 'exists:branches,id'], 'department_id' => ['required', 'uuid', 'exists:departments,id'], 'name' => ['required', 'string', 'max:120'], 'code' => ['nullable', 'string', 'max:40', 'unique:designations,code'], 'description' => ['nullable', 'string'], 'active' => ['nullable', 'boolean']];
    protected function updateRules(Request $request, Model $record): array { return ['branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'], 'department_id' => ['sometimes', 'required', 'uuid', 'exists:departments,id'], 'name' => ['sometimes', 'required', 'string', 'max:120'], 'code' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:designations,code,' . $record->id . ',id'], 'description' => ['sometimes', 'nullable', 'string'], 'active' => ['sometimes', 'nullable', 'boolean']]; }
}
