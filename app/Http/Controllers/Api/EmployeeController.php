<?php

namespace App\Http\Controllers\Api;

use App\Models\Employee;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class EmployeeController extends BaseCrudApiController
{
    protected string $modelClass = Employee::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'user',
        'department',
        'designation',
        'shift',
        'approvedBy',
        'voidedBy',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'user' => 'user_id',
        'department' => 'department_id',
        'designation' => 'designation_id',
        'shift' => 'shift_id',
        'approvedBy' => 'approved_by_id',
        'voidedBy' => 'voided_by_id',
    ];

    protected array $searchable = [
        'employee_code',
        'first_name',
        'last_name',
        'email',
        'phone',
        'employment_type',
        'status',
    ];

    protected array $filterable = [
        'branch_id',
        'user_id',
        'department_id',
        'designation_id',
        'shift_id',
        'employment_type',
        'status',
    ];

    protected array $booleanFilters = [
        'active',
        'approved',
        'void',
    ];

    protected array $dateRangeFilters = [
        'date_of_joining' => [
            'from' => 'date_from',
            'to' => 'date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'employee_code',
        'first_name',
        'last_name',
        'date_of_joining',
        'status',
        'created_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => [
            'nullable',
            'uuid',
            'exists:branches,id',
        ],

        'user_id' => [
            'nullable',
            'integer',
            'exists:users,id',
        ],

        'department_id' => [
            'required',
            'uuid',
            'exists:departments,id',
        ],

        'designation_id' => [
            'nullable',
            'uuid',
            'exists:designations,id',
        ],

        'shift_id' => [
            'nullable',
            'uuid',
            'exists:shifts,id',
        ],

        'employee_code' => [
            'required',
            'string',
            'max:40',
            'unique:employees,employee_code',
        ],

        'first_name' => [
            'required',
            'string',
            'max:120',
        ],

        'last_name' => [
            'nullable',
            'string',
            'max:120',
        ],

        'email' => [
            'nullable',
            'email',
            'max:190',
            'unique:employees,email',
        ],

        'phone' => [
            'nullable',
            'string',
            'max:40',
        ],

        'date_of_joining' => [
            'required',
            'date',
        ],

        'employment_type' => [
            'nullable',
            'string',
            'max:50',
        ],

        'basic_salary' => [
            'nullable',
            'numeric',
            'min:0',
        ],

        'allowance_amount' => [
            'nullable',
            'numeric',
            'min:0',
        ],

        'status' => [
            'nullable',
            'string',
            'max:50',
        ],

        'active' => [
            'nullable',
            'boolean',
        ],

        'approved' => [
            'nullable',
            'boolean',
        ],

        'approved_at' => [
            'nullable',
            'date',
        ],

        'approved_by_id' => [
            'nullable',
            'integer',
            'exists:users,id',
        ],

        'void' => [
            'nullable',
            'boolean',
        ],

        'voided_by_id' => [
            'nullable',
            'integer',
            'exists:users,id',
        ],

        'voided_reason' => [
            'nullable',
            'string',
        ],

        'voided_at' => [
            'nullable',
            'date',
        ],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:branches,id',
            ],

            'user_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'department_id' => [
                'sometimes',
                'required',
                'uuid',
                'exists:departments,id',
            ],

            'designation_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:designations,id',
            ],

            'shift_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:shifts,id',
            ],

            'employee_code' => [
                'sometimes',
                'required',
                'string',
                'max:40',
                Rule::unique('employees', 'employee_code')->ignore($record->id),
            ],

            'first_name' => [
                'sometimes',
                'required',
                'string',
                'max:120',
            ],

            'last_name' => [
                'sometimes',
                'nullable',
                'string',
                'max:120',
            ],

            'email' => [
                'sometimes',
                'nullable',
                'email',
                'max:190',
                Rule::unique('employees', 'email')->ignore($record->id),
            ],

            'phone' => [
                'sometimes',
                'nullable',
                'string',
                'max:40',
            ],

            'date_of_joining' => [
                'sometimes',
                'required',
                'date',
            ],

            'employment_type' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'basic_salary' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'allowance_amount' => [
                'sometimes',
                'nullable',
                'numeric',
                'min:0',
            ],

            'status' => [
                'sometimes',
                'nullable',
                'string',
                'max:50',
            ],

            'active' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'approved' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'approved_at' => [
                'sometimes',
                'nullable',
                'date',
            ],

            'approved_by_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'void' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            'voided_by_id' => [
                'sometimes',
                'nullable',
                'integer',
                'exists:users,id',
            ],

            'voided_reason' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'voided_at' => [
                'sometimes',
                'nullable',
                'date',
            ],
        ];
    }
}