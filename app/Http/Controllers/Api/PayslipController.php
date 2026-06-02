<?php

namespace App\Http\Controllers\Api;

use App\Models\Payslip;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PayslipController extends BaseCrudApiController
{
    protected string $modelClass = Payslip::class;

    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;

    protected array $relations = [
        'branch',
        'user',
        'employee.payrollAccount',
        'payroll',
        'lines.component',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'user' => 'user_id',
        'payroll' => 'payroll_id',
    ];

    protected array $searchable = [
        'payment_status',
        'branch.name',
        'branch.code',
        'user.first_name',
        'user.last_name',
        'user.username',
        'user.email',
    ];

    protected array $filterable = [
        'branch_id',
        'payroll_id',
        'payroll_run_id',
        'user_id',
        'employee_id',
        'salary_month',
        'salary_year',
        'payment_status',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'user_id',
        'salary_month',
        'salary_year',
        'salary',
        'salary_payable',
        'total_payable',
        'payment_status',
        'branch_id',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'user_id' => ['required', 'integer', 'exists:users,id'],
        'salary_month' => ['required', 'integer', 'min:1', 'max:12'],
        'salary_year' => ['required', 'integer', 'min:1900'],
        'salary' => ['required', 'numeric', 'min:0'],
        'paid_leave' => ['required', 'integer', 'min:0'],
        'unpaid_leave' => ['required', 'integer', 'min:0'],
        'monthly_holiday' => ['required', 'integer', 'min:0'],
        'public_holiday' => ['required', 'integer', 'min:0'],
        'work_day' => ['required', 'integer', 'min:0'],
        'shift_wise_work_hour' => ['required', 'numeric', 'min:0'],
        'monthly_work_hour' => ['required', 'numeric', 'min:0'],
        'hourly_salary' => ['required', 'numeric', 'min:0'],
        'working_hour' => ['required', 'numeric', 'min:0'],
        'salary_payable' => ['required', 'numeric', 'min:0'],
        'bonus' => ['nullable', 'numeric', 'min:0'],
        'bonus_comment' => ['nullable', 'string', 'max:255'],
        'deduction' => ['nullable', 'numeric', 'min:0'],
        'deduction_comment' => ['nullable', 'string', 'max:255'],
        'total_payable' => ['required', 'numeric', 'min:0'],
        'payment_status' => ['nullable', 'string', 'in:UNPAID,PAID,PARTIAL'],
        'active' => ['nullable', 'boolean'],
        'is_system_generated' => ['nullable', 'boolean'],
        'user_add_id' => ['nullable', 'integer', 'exists:users,id'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'user_id' => ['sometimes', 'required', 'integer', 'exists:users,id'],
            'salary_month' => ['sometimes', 'required', 'integer', 'min:1', 'max:12'],
            'salary_year' => ['sometimes', 'required', 'integer', 'min:1900'],
            'salary' => ['sometimes', 'required', 'numeric', 'min:0'],
            'paid_leave' => ['sometimes', 'required', 'integer', 'min:0'],
            'unpaid_leave' => ['sometimes', 'required', 'integer', 'min:0'],
            'monthly_holiday' => ['sometimes', 'required', 'integer', 'min:0'],
            'public_holiday' => ['sometimes', 'required', 'integer', 'min:0'],
            'work_day' => ['sometimes', 'required', 'integer', 'min:0'],
            'shift_wise_work_hour' => ['sometimes', 'required', 'numeric', 'min:0'],
            'monthly_work_hour' => ['sometimes', 'required', 'numeric', 'min:0'],
            'hourly_salary' => ['sometimes', 'required', 'numeric', 'min:0'],
            'working_hour' => ['sometimes', 'required', 'numeric', 'min:0'],
            'salary_payable' => ['sometimes', 'required', 'numeric', 'min:0'],
            'bonus' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'bonus_comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'deduction' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'deduction_comment' => ['sometimes', 'nullable', 'string', 'max:255'],
            'total_payable' => ['sometimes', 'required', 'numeric', 'min:0'],
            'payment_status' => ['sometimes', 'nullable', 'string', 'in:UNPAID,PAID,PARTIAL'],
            'active' => ['sometimes', 'nullable', 'boolean'],
            'is_system_generated' => ['sometimes', 'nullable', 'boolean'],
            'user_add_id' => ['sometimes', 'nullable', 'integer', 'exists:users,id'],
        ];
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        $user = $request->user();
        abort_unless($user, 401, 'Unauthenticated.');

        if ($this->userHasAdministrativeBypass($user)) {
            return;
        }

        $permission = match ($action) {
            'index', 'show' => 'view',
            'update', 'bulkUpdate' => 'update',
            'pdf' => 'download',
            default => $action,
        };

        $aliases = [
            "hrm.payslips.{$permission}",
            "payslip.{$permission}",
        ];

        abort_unless(
            collect($aliases)->contains(fn ($name) => $user->can($name)),
            403,
            'You do not have permission to perform this action.'
        );
    }

    public function pdf(Request $request, string $id)
    {
        $this->checkAccess($request, 'pdf');

        $payslip = Payslip::query()
            ->with(['employee', 'user', 'branch', 'payroll.payrollPeriod', 'lines.component'])
            ->findOrFail($id);

        $html = view('pdf.payslip', ['payslip' => $payslip])->render();

        return Pdf::loadHTML($html)
            ->setPaper('a4')
            ->download(($payslip->payslip_number ?: 'payslip') . '.pdf');
    }
}
