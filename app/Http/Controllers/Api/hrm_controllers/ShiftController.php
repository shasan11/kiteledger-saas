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

    protected array $relations = [
        'branch',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
    ];

    protected array $searchable = [
        'name',
        'branch.name',
        'branch.code',
    ];

    protected array $filterable = [
        'branch_id',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'name',
        'start_time',
        'end_time',
        'work_hour',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'name';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'name' => ['required', 'string', 'max:120', 'unique:shifts,name'],
        'start_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        'end_time' => ['required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
        'work_hour' => ['nullable', 'numeric', 'min:0'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'name' => ['sometimes', 'required', 'string', 'max:120', 'unique:shifts,name,' . $record->id . ',id'],
            'start_time' => ['sometimes', 'required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'end_time' => ['sometimes', 'required', 'regex:/^\d{2}:\d{2}(:\d{2})?$/'],
            'work_hour' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        return $this->normalizeShiftPayload(parent::mutateParentDataBeforeCreate($parentData, $nestedData));
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        return $this->normalizeShiftPayload(parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record));
    }

    protected function normalizeShiftPayload(array $data): array
    {
        foreach (['start_time', 'end_time'] as $field) {
            if (! empty($data[$field]) && preg_match('/^\d{2}:\d{2}$/', $data[$field])) {
                $data[$field] .= ':00';
            }
        }

        if ((! isset($data['work_hour']) || $data['work_hour'] === null) && ! empty($data['start_time']) && ! empty($data['end_time'])) {
            $start = strtotime('2000-01-01 ' . $data['start_time']);
            $end = strtotime('2000-01-01 ' . $data['end_time']);
            if ($start !== false && $end !== false) {
                if ($end <= $start) {
                    $end += 86400;
                }
                $data['work_hour'] = round(($end - $start) / 3600, 2);
            }
        }

        return $data;
    }
}
