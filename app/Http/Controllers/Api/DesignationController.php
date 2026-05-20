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

    // Designations are global masters — not branch-scoped.
    protected bool $branchScoped = false;
    protected bool $autoFillBranchOnCreate = false;
    protected bool $preventBranchChangeOnUpdate = false;

    protected array $relations = [
        'department',
    ];

    protected array $relationDetails = [
        'department' => 'department_id',
    ];

    protected array $searchable = [
        'name',
        'code',
        'level',
        'grade',
        'description',
        'department.name',
    ];

    protected array $filterable = [
        'department_id',
        'salary_frequency',
    ];

    protected array $booleanFilters = [
        'active',
        'overtime_eligible',
        'taxable',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'code',
        'sort_order',
        'department_id',
        'default_basic_salary',
        'salary_frequency',
        'active',
        'created_at',
        'updated_at',
    ];

    // Default sort: sort_order ascending, then name ascending.
    // The base controller handles a single ordering string; use sort_order.
    protected string $defaultSort = 'sort_order';

    protected array $storeRules = [
        'department_id'               => ['nullable', 'uuid', 'exists:departments,id'],
        'name'                        => ['required', 'string', 'max:120', 'unique:designations,name'],
        'code'                        => ['nullable', 'string', 'max:40', 'unique:designations,code'],
        'level'                       => ['nullable', 'string', 'max:50'],
        'grade'                       => ['nullable', 'string', 'max:50'],
        'sort_order'                  => ['nullable', 'integer', 'min:0', 'max:9999'],
        'default_basic_salary'        => ['nullable', 'numeric', 'min:0'],
        'salary_frequency'            => ['nullable', 'string', 'in:monthly,weekly,daily,hourly'],
        'default_salary_structure_id' => ['nullable', 'uuid', 'exists:salary_structures,id'],
        'overtime_eligible'           => ['nullable', 'boolean'],
        'taxable'                     => ['nullable', 'boolean'],
        'description'                 => ['nullable', 'string', 'max:500'],
        'active'                      => ['nullable', 'boolean'],
        'is_system_generated'         => ['nullable', 'boolean'],
        'user_add_id'                 => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'department_id'               => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'name'                        => ['sometimes', 'required', 'string', 'max:120', 'unique:designations,name,' . $record->id . ',id'],
            'code'                        => ['sometimes', 'nullable', 'string', 'max:40', 'unique:designations,code,' . $record->id . ',id'],
            'level'                       => ['sometimes', 'nullable', 'string', 'max:50'],
            'grade'                       => ['sometimes', 'nullable', 'string', 'max:50'],
            'sort_order'                  => ['sometimes', 'nullable', 'integer', 'min:0', 'max:9999'],
            'default_basic_salary'        => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'salary_frequency'            => ['sometimes', 'nullable', 'string', 'in:monthly,weekly,daily,hourly'],
            'default_salary_structure_id' => ['sometimes', 'nullable', 'uuid', 'exists:salary_structures,id'],
            'overtime_eligible'           => ['sometimes', 'nullable', 'boolean'],
            'taxable'                     => ['sometimes', 'nullable', 'boolean'],
            'description'                 => ['sometimes', 'nullable', 'string', 'max:500'],
            'active'                      => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated'         => ['sometimes', 'nullable', 'boolean'],
            'user_add_id'                 => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }
}
