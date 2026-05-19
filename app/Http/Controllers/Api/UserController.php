<?php

namespace App\Http\Controllers\Api;

use App\Models\User;
use App\Models\Role;
use App\Services\Payroll\PayrollAccountSyncService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Spatie\Permission\PermissionRegistrar;

class UserController extends BaseCrudApiController
{
    protected string $modelClass = User::class;

    protected ?string $permissionPrefix = 'hrm.users';

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'employmentStatus',
        'department',
        'role',
        'shift',
        'leavePolicy',
        'weeklyHoliday',
        'payrollAccount',
        'roles',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'employmentStatus' => 'employment_status_id',
        'department' => 'department_id',
        'role' => 'role_id',
        'shift' => 'shift_id',
        'leavePolicy' => 'leave_policy_id',
        'weeklyHoliday' => 'weekly_holiday_id',
        'payrollAccount' => 'payroll_account_id',
    ];

    protected array $searchable = [
        'name',
        'first_name',
        'last_name',
        'username',
        'email',
        'phone',
        'employee_id',
        'city',
        'country',
        'employmentStatus.name',
        'department.name',
        'role.name',
        'shift.name',
    ];

    protected array $filterable = [
        'branch_id',
        'employment_status_id',
        'department_id',
        'role_id',
        'shift_id',
        'leave_policy_id',
        'weekly_holiday_id',
        'payroll_account_id',
        'country',
        'city',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $dateRangeFilters = [
        'join_date' => [
            'from' => 'join_date_from',
            'to' => 'join_date_to',
        ],
        'leave_date' => [
            'from' => 'leave_date_from',
            'to' => 'leave_date_to',
        ],
    ];

    protected array $sortable = [
        'id',
        'name',
        'first_name',
        'last_name',
        'username',
        'email',
        'phone',
        'employee_id',
        'join_date',
        'leave_date',
        'branch_id',
        'department_id',
        'role_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],

        'name' => ['nullable', 'string', 'max:190'],
        'first_name' => ['required', 'string', 'max:80'],
        'last_name' => ['required', 'string', 'max:80'],

        'username' => ['required', 'string', 'max:80', 'unique:users,username'],
        'password' => ['required', 'string', 'min:6', 'max:255'],
        'email' => ['required', 'email', 'max:120', 'unique:users,email'],

        'phone' => ['nullable', 'string', 'max:40'],
        'street' => ['nullable', 'string', 'max:180'],
        'city' => ['nullable', 'string', 'max:80'],
        'state' => ['nullable', 'string', 'max:80'],
        'zip_code' => ['nullable', 'string', 'max:30'],
        'country' => ['nullable', 'string', 'max:80'],

        'join_date' => ['nullable', 'date'],
        'leave_date' => ['nullable', 'date', 'after_or_equal:join_date'],

        'employee_id' => ['nullable', 'string', 'max:60'],
        'blood_group' => ['nullable', 'string', 'max:10'],
        'image' => ['nullable', 'string', 'max:255'],

        'employment_status_id' => ['nullable', 'uuid', 'exists:employment_statuses,id'],
        'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
        'role_id' => ['nullable', 'uuid', 'exists:roles,id'],
        'shift_id' => ['nullable', 'uuid', 'exists:shifts,id'],
        'leave_policy_id' => ['nullable', 'uuid', 'exists:leave_policies,id'],
        'weekly_holiday_id' => ['nullable', 'uuid', 'exists:weekly_holidays,id'],
        'payroll_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],

        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],

            'name' => ['sometimes', 'nullable', 'string', 'max:190'],
            'first_name' => ['sometimes', 'required', 'string', 'max:80'],
            'last_name' => ['sometimes', 'required', 'string', 'max:80'],

            'username' => [
                'sometimes',
                'required',
                'string',
                'max:80',
                Rule::unique('users', 'username')->ignore($record->id),
            ],

            'password' => ['sometimes', 'nullable', 'string', 'min:6', 'max:255'],

            'email' => [
                'sometimes',
                'required',
                'email',
                'max:120',
                Rule::unique('users', 'email')->ignore($record->id),
            ],

            'phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'street' => ['sometimes', 'nullable', 'string', 'max:180'],
            'city' => ['sometimes', 'nullable', 'string', 'max:80'],
            'state' => ['sometimes', 'nullable', 'string', 'max:80'],
            'zip_code' => ['sometimes', 'nullable', 'string', 'max:30'],
            'country' => ['sometimes', 'nullable', 'string', 'max:80'],

            'join_date' => ['sometimes', 'nullable', 'date'],
            'leave_date' => ['sometimes', 'nullable', 'date', 'after_or_equal:join_date'],

            'employee_id' => ['sometimes', 'nullable', 'string', 'max:60'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:10'],
            'image' => ['sometimes', 'nullable', 'string', 'max:255'],

            'employment_status_id' => ['sometimes', 'nullable', 'uuid', 'exists:employment_statuses,id'],
            'department_id' => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'role_id' => ['sometimes', 'nullable', 'uuid', 'exists:roles,id'],
            'shift_id' => ['sometimes', 'nullable', 'uuid', 'exists:shifts,id'],
            'leave_policy_id' => ['sometimes', 'nullable', 'uuid', 'exists:leave_policies,id'],
            'weekly_holiday_id' => ['sometimes', 'nullable', 'uuid', 'exists:weekly_holidays,id'],
            'payroll_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],

            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $this->pendingRoleId = $parentData['role_id'] ?? null;
        $parentData['name'] = $this->makeName($parentData);

        if (!empty($parentData['password'])) {
            $parentData['password'] = Hash::make($parentData['password']);
        }

        if (!array_key_exists('active', $parentData)) {
            $parentData['active'] = true;
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $this->pendingRoleId = array_key_exists('role_id', $parentData)
            ? $parentData['role_id']
            : false;

        if (
            empty($parentData['name']) &&
            (
                array_key_exists('first_name', $parentData) ||
                array_key_exists('last_name', $parentData)
            )
        ) {
            $parentData['name'] = $this->makeName([
                'first_name' => $parentData['first_name'] ?? $record->first_name,
                'last_name' => $parentData['last_name'] ?? $record->last_name,
            ]);
        }

        if (array_key_exists('password', $parentData)) {
            if (empty($parentData['password'])) {
                unset($parentData['password']);
            } else {
                $parentData['password'] = Hash::make($parentData['password']);
            }
        }

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        if ($this->pendingRoleId !== false) {
            if ($this->pendingRoleId) {
                $role = Role::query()
                    ->where('guard_name', 'web')
                    ->find($this->pendingRoleId);
                $record->syncRoles($role ? [$role->name] : []);
            } else {
                $record->syncRoles([]);
            }

            app(PermissionRegistrar::class)->forgetCachedPermissions();
        }

        if ($record->active) {
            app(PayrollAccountSyncService::class)->syncEmployeePayrollAccount($record);
            $record->refresh();
        }

        return $record->load(['role', 'roles', 'payrollAccount.chartOfAccounts']);
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        unset($data['password'], $data['remember_token']);

        return $data;
    }

    private function makeName(array $data): string
    {
        $name = trim((string) ($data['name'] ?? ''));

        if ($name !== '') {
            return $name;
        }

        return trim(
            ((string) ($data['first_name'] ?? '')) . ' ' . ((string) ($data['last_name'] ?? ''))
        );
    }

    private mixed $pendingRoleId = false;
}
