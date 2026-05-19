<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayrollPeriod;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PayrollPeriodController extends BaseCrudApiController
{
    protected string $modelClass = PayrollPeriod::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected array $relations = ['branch'];
    protected array $relationDetails = ['branch' => 'branch_id'];
    protected array $filterable = ['month', 'year', 'branch_id', 'status'];
    protected array $sortable = ['year', 'month', 'status', 'created_at'];
    protected string $defaultSort = '-year';

    protected array $storeRules = [
        'month' => ['required', 'integer', 'min:1', 'max:12'],
        'year' => ['required', 'integer', 'min:1900'],
        'start_date' => ['required', 'date'],
        'end_date' => ['required', 'date', 'after:start_date'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'status' => ['nullable', 'in:open,processing,closed,locked'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'month' => ['sometimes', 'required', 'integer', 'min:1', 'max:12'],
            'year' => ['sometimes', 'required', 'integer', 'min:1900'],
            'start_date' => ['sometimes', 'required', 'date'],
            'end_date' => ['sometimes', 'required', 'date', 'after:start_date'],
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'status' => ['sometimes', 'nullable', 'in:open,processing,closed,locked'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $this->assertPeriodRules($parentData);

        return parent::mutateParentDataBeforeCreate($parentData, $nestedData);
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        if (in_array($record->status, ['closed', 'locked'], true) && collect($parentData)->except('status')->isNotEmpty()) {
            abort(422, 'Closed or locked payroll periods cannot be edited.');
        }

        $merged = array_merge($record->only(['month', 'year', 'start_date', 'end_date', 'branch_id', 'status']), $parentData);
        $this->assertPeriodRules($merged, $record);

        if (($parentData['status'] ?? null) === 'locked') {
            $parentData['locked_at'] = now();
            $parentData['locked_by'] = request()->user()?->id;
        }

        return parent::mutateParentDataBeforeUpdate($parentData, $nestedData, $record);
    }

    protected function assertPeriodRules(array $data, ?PayrollPeriod $ignore = null): void
    {
        $duplicate = PayrollPeriod::query()
            ->where('year', $data['year'])
            ->where('month', $data['month'])
            ->where(function ($query) use ($data) {
                empty($data['branch_id'])
                    ? $query->whereNull('branch_id')
                    : $query->where('branch_id', $data['branch_id']);
            })
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))
            ->exists();

        if ($duplicate) {
            abort(422, 'Payroll period already exists for this branch, year, and month.');
        }

        $overlap = PayrollPeriod::query()
            ->whereIn('status', ['open', 'processing'])
            ->where(function ($query) use ($data) {
                empty($data['branch_id'])
                    ? $query->whereNull('branch_id')
                    : $query->where('branch_id', $data['branch_id']);
            })
            ->when($ignore, fn ($query) => $query->whereKeyNot($ignore->id))
            ->whereDate('start_date', '<=', $data['end_date'])
            ->whereDate('end_date', '>=', $data['start_date'])
            ->exists();

        if ($overlap) {
            abort(422, 'Payroll period overlaps another open or processing period for this branch.');
        }
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        $crudPermission = match ($action) {
            'index', 'show' => 'view',
            'store', 'bulkStore' => 'create',
            'update', 'bulkUpdate' => 'update',
            'destroy', 'bulkDestroy' => 'delete',
            default => $action,
        };

        $user = $request->user();
        $allowed = collect([
            "hrm.payroll.{$crudPermission}",
            "hrm.payroll_period.{$crudPermission}",
            "payroll.{$crudPermission}",
            "payroll-period.{$crudPermission}",
        ])->contains(fn (string $permission) => $user?->can($permission));

        abort_unless($allowed, 403, 'You do not have permission to perform this action.');
    }
}
