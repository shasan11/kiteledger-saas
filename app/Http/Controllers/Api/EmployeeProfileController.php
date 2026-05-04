<?php

namespace App\Http\Controllers\Api;

use App\Models\Education;
use App\Models\EmployeeProfile;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class EmployeeProfileController extends BaseCrudApiController
{
    protected string $modelClass = EmployeeProfile::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'employmentStatus',
        'department',
        'designation',
        'shift',
        'leavePolicy',
        'weeklyHoliday',
        'user',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'employmentStatus' => 'employment_status_id',
        'department' => 'department_id',
        'designation' => 'designation_id',
        'shift' => 'shift_id',
        'leavePolicy' => 'leave_policy_id',
        'weeklyHoliday' => 'weekly_holiday_id',
        'user' => 'user_id',
    ];

    protected array $searchable = [
        'employee_id',
        'blood_group',
        'emergency_contact_name',
        'emergency_contact_phone',
        'address',
    ];

    protected array $filterable = [
        'branch_id',
        'employment_status_id',
        'department_id',
        'designation_id',
        'shift_id',
        'leave_policy_id',
        'weekly_holiday_id',
        'user_id',
    ];

    protected array $booleanFilters = ['active', 'is_system_generated'];

    protected array $dateRangeFilters = [
        'join_date' => ['from' => 'join_from', 'to' => 'join_to'],
        'leave_date' => ['from' => 'leave_from', 'to' => 'leave_to'],
    ];

    protected array $sortable = [
        'id',
        'employee_id',
        'join_date',
        'leave_date',
        'salary',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'educations' => [
            'relation' => 'educations',
            'model' => Education::class,
            'foreign_key' => 'user_id',
            'delete_key' => 'deleted_education_ids',
            'required' => false,
            'min' => 0,
            'replace_on_update' => false,
            'relations' => [],
            'relation_details' => [],
            'rules' => [
                'degree' => ['required', 'string', 'max:120'],
                'institution' => ['required', 'string', 'max:180'],
                'field_of_study' => ['required', 'string', 'max:120'],
                'result' => ['required', 'string', 'max:60'],
                'study_start_date' => ['required', 'date'],
                'study_end_date' => ['nullable', 'date', 'after_or_equal:study_start_date'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
            'update_rules' => [
                'degree' => ['required', 'string', 'max:120'],
                'institution' => ['required', 'string', 'max:180'],
                'field_of_study' => ['required', 'string', 'max:120'],
                'result' => ['required', 'string', 'max:60'],
                'study_start_date' => ['required', 'date'],
                'study_end_date' => ['nullable', 'date', 'after_or_equal:study_start_date'],
                'active' => ['nullable', 'boolean'],
                'is_system_generated' => ['nullable', 'boolean'],
            ],
        ],
    ];

    protected array $storeRules = [
        'user_id' => ['required', 'integer', 'exists:users,id', 'unique:employee_profiles,user_id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'employment_status_id' => ['nullable', 'uuid', 'exists:employment_statuses,id'],
        'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
        'designation_id' => ['nullable', 'uuid', 'exists:designations,id'],
        'shift_id' => ['nullable', 'uuid', 'exists:shifts,id'],
        'leave_policy_id' => ['nullable', 'uuid', 'exists:leave_policies,id'],
        'weekly_holiday_id' => ['nullable', 'uuid', 'exists:weekly_holidays,id'],
        'employee_id' => ['nullable', 'string', 'max:60'],
        'join_date' => ['nullable', 'date'],
        'leave_date' => ['nullable', 'date'],
        'salary' => ['nullable', 'numeric', 'min:0'],
        'blood_group' => ['nullable', 'string', 'max:10'],
        'emergency_contact_name' => ['nullable', 'string', 'max:120'],
        'emergency_contact_phone' => ['nullable', 'string', 'max:40'],
        'address' => ['nullable', 'string'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id', 'unique:employee_profiles,user_id,' . $record->id . ',id'],
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'employment_status_id' => ['sometimes', 'nullable', 'uuid', 'exists:employment_statuses,id'],
            'department_id' => ['sometimes', 'nullable', 'uuid', 'exists:departments,id'],
            'designation_id' => ['sometimes', 'nullable', 'uuid', 'exists:designations,id'],
            'shift_id' => ['sometimes', 'nullable', 'uuid', 'exists:shifts,id'],
            'leave_policy_id' => ['sometimes', 'nullable', 'uuid', 'exists:leave_policies,id'],
            'weekly_holiday_id' => ['sometimes', 'nullable', 'uuid', 'exists:weekly_holidays,id'],
            'employee_id' => ['sometimes', 'nullable', 'string', 'max:60'],
            'join_date' => ['sometimes', 'nullable', 'date'],
            'leave_date' => ['sometimes', 'nullable', 'date'],
            'salary' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:10'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:40'],
            'address' => ['sometimes', 'nullable', 'string'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function saveNestedCollections(
        Model $parent,
        array $nestedData,
        array $deletedIds,
        bool $isUpdate
    ): void {
        $educationConfig = null;

        $defaultNested = $this->nested;
        $deferredNested = [];

        foreach ($defaultNested as $field => $config) {
            if (($config['relation'] ?? null) === 'educations') {
                $educationConfig = ['field' => $field, 'config' => $config];
                continue;
            }

            $deferredNested[$field] = $config;
        }

        $this->nested = $deferredNested;

        try {
            parent::saveNestedCollections($parent, $nestedData, $deletedIds, $isUpdate);
        } finally {
            $this->nested = $defaultNested;
        }

        if (!$educationConfig) {
            return;
        }

        $field = $educationConfig['field'];
        $config = $educationConfig['config'];
        $childModel = $config['model'];
        $childKey = $this->primaryKeyName($childModel);

        if ($isUpdate && !empty($deletedIds[$field])) {
            $childModel::query()
                ->where('user_id', $parent->user_id)
                ->whereIn($childKey, $deletedIds[$field])
                ->delete();
        }

        if (!array_key_exists($field, $nestedData)) {
            return;
        }

        $rows = $nestedData[$field] ?? [];
        $incomingIds = [];

        foreach ($rows as $row) {
            if (!is_array($row)) {
                continue;
            }

            if (!empty($row['_destroy']) && !empty($row[$childKey])) {
                $childModel::query()
                    ->where('user_id', $parent->user_id)
                    ->where($childKey, $row[$childKey])
                    ->delete();
                continue;
            }

            $row = $this->mutateNestedRowBeforeSave($row, $parent, $config, $isUpdate);

            $id = $row[$childKey] ?? null;

            unset(
                $row[$childKey],
                $row['_destroy'],
                $row['created_at'],
                $row['updated_at'],
                $row['deleted_at']
            );

            $row['user_id'] = $parent->user_id;

            if ($isUpdate && $id) {
                $child = $childModel::query()
                    ->where('user_id', $parent->user_id)
                    ->where($childKey, $id)
                    ->first();

                if (!$child) {
                    $this->throwValidation([
                        $field => ['One or more child record IDs do not belong to this parent.'],
                    ]);
                }

                $child->update($row);
                $saved = $child->fresh($config['relations'] ?? []);
            } else {
                $saved = $childModel::create($row);
            }

            if ($saved && $saved->getKey()) {
                $incomingIds[] = $saved->getKey();
            }
        }
    }
}
