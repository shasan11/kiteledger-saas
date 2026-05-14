<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\PayrollPeriod;
use App\Models\PayrollRun;
use App\Models\User;
use App\Services\Payroll\PayrollRunService;
use Illuminate\Http\Request;

class PayrollRunController extends BaseCrudApiController
{
    protected string $modelClass = PayrollRun::class;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected array $relations = ['payrollPeriod', 'branch', 'currency', 'journalVoucher', 'payslips.employee', 'payslips.lines'];
    protected array $relationDetails = ['payrollPeriod' => 'payroll_period_id', 'branch' => 'branch_id', 'currency' => 'currency_id'];
    protected array $searchable = ['run_number', 'status'];
    protected array $filterable = ['payroll_period_id', 'branch_id', 'status'];
    protected array $sortable = ['run_number', 'status', 'total_net_payable', 'created_at'];

    protected array $storeRules = [
        'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'run_number' => ['nullable', 'string', 'max:40'],
        'status' => ['nullable', 'in:draft,generated,reviewed,approved,paid,locked,void'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
    ];

    public function dashboard(Request $request)
    {
        $this->checkAccess($request, 'index');

        $runs = PayrollRun::query()
            ->with('payrollPeriod')
            ->latest()
            ->limit(8)
            ->get();

        $current = PayrollPeriod::query()->where('status', 'open')->latest('year')->latest('month')->first();

        return response()->json([
            'current_period' => $current,
            'employees_included' => (int) PayrollRun::query()->sum('total_employees'),
            'gross_payroll' => (float) PayrollRun::query()->sum('total_gross'),
            'total_deductions' => (float) PayrollRun::query()->sum('total_deductions'),
            'net_payable' => (float) PayrollRun::query()->sum('total_net_payable'),
            'pending_approvals' => PayrollRun::query()->whereIn('status', ['generated', 'reviewed'])->count(),
            'paid_amount' => (float) PayrollRun::query()->where('status', 'paid')->sum('total_net_payable'),
            'unpaid_amount' => (float) PayrollRun::query()->whereIn('status', ['generated', 'reviewed', 'approved'])->sum('total_net_payable'),
            'recent_runs' => $runs,
        ]);
    }

    public function generate(Request $request, PayrollRunService $service)
    {
        $this->requirePermission($request, 'generate');

        $data = $request->validate([
            'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'employee_scope' => ['nullable', 'in:all,branch,department,selected'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['integer', 'exists:users,id'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
        ]);

        $period = PayrollPeriod::query()->findOrFail($data['payroll_period_id']);
        $employeeIds = $this->resolveEmployeeIds($data);

        $run = $service->generate(
            $period,
            $data['branch_id'] ?? $period->branch_id,
            $employeeIds,
            $request->user(),
            $data['idempotency_key'] ?? null
        );

        return response()->json($run);
    }

    public function review(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'review');

        return response()->json($service->transition(PayrollRun::query()->findOrFail($id), 'reviewed', 'review', $request->user()));
    }

    public function approve(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'approve');

        return response()->json($service->transition(PayrollRun::query()->findOrFail($id), 'approved', 'approve', $request->user()));
    }

    public function markPaid(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'pay');

        return response()->json($service->transition(PayrollRun::query()->findOrFail($id), 'paid', 'pay', $request->user()));
    }

    public function lock(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'lock');

        return response()->json($service->transition(PayrollRun::query()->findOrFail($id), 'locked', 'lock', $request->user()));
    }

    public function void(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'void');

        $data = $request->validate(['reason' => ['required', 'string', 'max:1000']]);

        return response()->json($service->transition(PayrollRun::query()->findOrFail($id), 'void', 'void', $request->user(), $data['reason']));
    }

    public function journalVoucher(Request $request, string $id, PayrollRunService $service)
    {
        $this->requirePermission($request, 'approve');

        return response()->json($service->generateJournalVoucher(PayrollRun::query()->findOrFail($id), $request->user()));
    }

    protected function resolveEmployeeIds(array $data): array
    {
        if (($data['employee_scope'] ?? null) === 'selected') {
            return array_values(array_unique($data['employee_ids'] ?? []));
        }

        return User::query()
            ->where('active', true)
            ->when($data['branch_id'] ?? null, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when(($data['employee_scope'] ?? null) === 'department', fn ($query) => $query->where('department_id', request('department_id')))
            ->pluck('id')
            ->all();
    }

    protected function requirePermission(Request $request, string $permission): void
    {
        abort_unless($request->user()?->can("hrm.payroll.{$permission}"), 403, 'You do not have permission to perform this action.');
    }
}
