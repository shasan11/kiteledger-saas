<?php

namespace App\Http\Controllers\Api\Payroll;

use App\Http\Controllers\Api\BaseCrudApiController;
use App\Models\Currency;
use App\Models\Payroll;
use App\Models\PayrollPeriod;
use App\Models\PayrollSetting;
use App\Models\User;
use App\Services\BusinessRules\TransactionRuleValidator;
use App\Services\Payroll\PayrollAccountSyncService;
use App\Services\Payroll\PayrollService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class PayrollController extends BaseCrudApiController
{
    protected string $modelClass = Payroll::class;
    protected ?string $businessRuleModule = 'payroll';
    protected bool $validateBusinessRulesOnSave = true;
    protected bool $validateBusinessRulesOnEdit = true;
    protected ?string $permissionPrefix = 'hrm.payroll';
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;

    protected array $relations = [
        'payrollPeriod',
        'branch',
        'currency',
        'sourceAccount',
        'journalVoucher',
        'paymentJournalVoucher',
        'reversalJournalVoucher',
        'paymentReversalJournalVoucher',
        'additions.component',
        'deductions.component',
        'payslips.employee.payrollAccount.chartOfAccounts',
        'payslips.lines.component',
    ];

    protected array $relationDetails = [
        'payrollPeriod' => 'payroll_period_id',
        'branch' => 'branch_id',
        'currency' => 'currency_id',
        'sourceAccount' => 'source_account_id',
        'journalVoucher' => 'journal_voucher_id',
        'paymentJournalVoucher' => 'payment_journal_voucher_id',
        'reversalJournalVoucher' => 'reversal_journal_voucher_id',
        'paymentReversalJournalVoucher' => 'payment_reversal_journal_voucher_id',
    ];

    protected array $searchable = ['payroll_number', 'run_number', 'status'];
    protected array $filterable = ['payroll_period_id', 'branch_id', 'status'];
    protected array $sortable = ['payroll_number', 'status', 'total_net_payable', 'created_at'];

    protected array $storeRules = [
        'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'payroll_number' => ['nullable', 'string', 'max:40'],
        'status' => ['nullable', 'in:draft,previewed,generated,approved,processed,paid,locked,void,voided,reopened'],
        'currency_id' => ['required', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['required', 'numeric', 'gt:0'],
        'source_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
    ];

    public function dashboard(Request $request)
    {
        $this->checkAccess($request, 'index');

        $payrolls = Payroll::query()
            ->with([
                'payrollPeriod',
                'branch',
                'currency',
                'sourceAccount',
                'journalVoucher',
            ])
            ->latest()
            ->limit(8)
            ->get();

        $current = PayrollPeriod::query()
            ->where('status', 'open')
            ->latest('year')
            ->latest('month')
            ->first();

        return response()->json([
            'current_period' => $current,
            'employees_included' => (int) Payroll::query()->sum('total_employees'),
            'gross_payroll' => (float) Payroll::query()->sum('total_earnings'),
            'total_deductions' => (float) Payroll::query()->sum('total_deductions'),
            'net_payable' => (float) Payroll::query()->sum('total_net_payable'),
            'pending_approvals' => Payroll::query()->where('status', 'generated')->count(),
            'paid_amount' => (float) Payroll::query()->where('status', 'paid')->sum('total_net_payable'),
            'unpaid_amount' => (float) Payroll::query()
                ->whereIn('status', ['generated', 'approved', 'processed'])
                ->sum('total_net_payable'),
            'recent_payrolls' => $payrolls,
            'recent_runs' => $payrolls,
        ]);
    }

    public function generate(Request $request, PayrollService $service)
    {
        $this->requirePermission($request, 'generate');

        $data = $request->validate([
            'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'source_account_id' => ['required', 'uuid', 'exists:accounts,id'],
            'payment_reference' => ['nullable', 'string', 'max:120'],
            'employee_scope' => ['nullable', 'in:all,branch,department,selected'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['integer', 'exists:users,id'],
            'strict' => ['nullable', 'boolean'],
            'strict_attendance_lock' => ['nullable', 'boolean'],
            'idempotency_key' => ['nullable', 'string', 'max:100'],
        ]);

        $period = PayrollPeriod::query()->findOrFail($data['payroll_period_id']);
        $branchId = $data['branch_id'] ?? $period->branch_id;

        $data['branch_id'] = $branchId;
        $data['currency_id'] = $this->resolveCurrencyId($data, $branchId);
        $data['exchange_rate'] = $this->resolveExchangeRate($data['currency_id'], $data['exchange_rate'] ?? null);
        $data['strict'] = $request->boolean('strict', false);

        $employeeIds = $this->resolveEmployeeIds($data);

        if (empty($employeeIds)) {
            abort(422, 'No active employees found for the selected payroll scope.');
        }

        return response()->json($service->generate(
            $period,
            $branchId,
            $employeeIds,
            $request->user(),
            $data
        ));
    }

    public function preview(Request $request, PayrollService $service)
    {
        $this->requirePermission($request, 'generate');

        $data = $request->validate([
            'payroll_period_id' => ['required', 'uuid', 'exists:payroll_periods,id'],
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
            'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
            'employee_scope' => ['nullable', 'in:all,branch,department,selected'],
            'department_id' => ['nullable', 'uuid', 'exists:departments,id'],
            'employee_ids' => ['nullable', 'array'],
            'employee_ids.*' => ['integer', 'exists:users,id'],
            'strict_attendance_lock' => ['nullable', 'boolean'],
        ]);

        $period = PayrollPeriod::query()->findOrFail($data['payroll_period_id']);
        $branchId = $data['branch_id'] ?? $period->branch_id;

        $data['branch_id'] = $branchId;
        $data['currency_id'] = $this->resolveCurrencyId($data, $branchId);
        $data['exchange_rate'] = $this->resolveExchangeRate($data['currency_id'], $data['exchange_rate'] ?? null);

        $employeeIds = $this->resolveEmployeeIds($data);

        if (empty($employeeIds)) {
            abort(422, 'No active employees found for the selected payroll scope.');
        }

        return response()->json($service->preview(
            $period,
            $branchId,
            $employeeIds,
            $data
        ));
    }

    public function approve(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'approve');

        $payroll = Payroll::query()->with($this->relations)->findOrFail($id);
        $businessRules = app(TransactionRuleValidator::class)->validateForApproval('payroll', $payroll);
        $this->blockIfBusinessRuleErrors($businessRules);

        $approved = $service->transition(
            $payroll,
            'approved',
            'approve',
            $request->user()
        );

        return response()->json($this->withBusinessRules($approved, $businessRules));
    }

    public function review(Request $request, string $id)
    {
        $this->requirePermission($request, 'review');

        return response()->json(Payroll::query()
            ->with($this->relations)
            ->findOrFail($id));
    }

    public function process(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'process');

        return response()->json($service->transition(
            Payroll::query()->findOrFail($id),
            'processed',
            'process',
            $request->user()
        ));
    }

    public function markPaid(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'pay');

        $data = $request->validate([
            'source_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        ]);

        $payroll = Payroll::query()->findOrFail($id);

        if (! empty($data['source_account_id'])) {
            $payroll->forceFill([
                'source_account_id' => $data['source_account_id'],
            ])->save();
        }

        $payroll->load($this->relations);
        $businessRules = app(TransactionRuleValidator::class)->validateForApproval('payroll', $payroll);
        $this->blockIfBusinessRuleErrors($businessRules);

        if ($payroll->status === 'approved') {
            $service->transition($payroll, 'processed', 'process', $request->user());
            $payroll = Payroll::query()->findOrFail($id);
        }

        $paid = $service->transition(
            $payroll,
            'paid',
            'pay',
            $request->user()
        );

        if (! empty($data['payment_reference'])) {
            $paid->payslips()->update(['payment_reference' => $data['payment_reference']]);
            $paid->refresh();
        }

        return response()->json($this->withBusinessRules($paid, $businessRules));
    }

    public function lock(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'lock');

        return response()->json($service->transition(
            Payroll::query()->findOrFail($id),
            'locked',
            'lock',
            $request->user()
        ));
    }

    public function void(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'void');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($service->transition(
            Payroll::query()->findOrFail($id),
            'voided',
            'void',
            $request->user(),
            $data['reason']
        ));
    }

    public function reopen(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'reopen');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($service->transition(
            Payroll::query()->findOrFail($id),
            'reopened',
            'reopen',
            $request->user(),
            $data['reason']
        ));
    }

    public function reverse(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'reverse');

        $data = $request->validate([
            'reason' => ['required', 'string', 'max:1000'],
        ]);

        return response()->json($service->reverse(
            Payroll::query()->findOrFail($id),
            $request->user(),
            $data['reason']
        ));
    }

    public function payslips(Request $request, string $id)
    {
        $this->requirePermission($request, 'view');

        return response()->json([
            'results' => Payroll::query()
                ->findOrFail($id)
                ->payslips()
                ->with(['employee', 'lines.component', 'currency'])
                ->orderBy('payslip_number')
                ->get(),
        ]);
    }

    public function summaryReport(Request $request)
    {
        $this->requirePermission($request, 'report');

        $rows = Payroll::query()
            ->with(['payrollPeriod', 'branch'])
            ->when($request->query('branch_id'), fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when($request->query('status'), fn ($query, $status) => $query->where('status', $status))
            ->latest()
            ->get();

        return response()->json([
            'results' => $rows,
            'totals' => [
                'total_employees' => (int) $rows->sum('total_employees'),
                'gross' => (float) $rows->sum('total_gross'),
                'deductions' => (float) $rows->sum('total_deductions'),
                'net_payable' => (float) $rows->sum('total_net_payable'),
            ],
        ]);
    }

    public function journalVoucher(Request $request, string $id, PayrollService $service)
    {
        $this->requirePermission($request, 'approve');

        return response()->json($service->generateJournalVoucher(
            Payroll::query()->findOrFail($id),
            $request->user()
        ));
    }

    public function syncAccounts(Request $request, PayrollAccountSyncService $service)
    {
        $this->requirePermission($request, 'update');

        $data = $request->validate([
            'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        ]);

        $count = $service->syncEmployeesMissingPayrollAccounts($data['branch_id'] ?? null);

        return response()->json([
            'message' => "Synced {$count} employee payroll account(s).",
            'count' => $count,
        ]);
    }

    public function storeAdjustment(Request $request, string $id, string $kind, PayrollService $service)
    {
        $this->requirePermission($request, 'generate');

        abort_unless(in_array($kind, ['addition', 'deduction'], true), 404);

        $data = $this->validateAdjustment($request);

        return response()->json($service->addPayrollAdjustment(
            Payroll::query()->findOrFail($id),
            $kind,
            $data,
            $request->user()
        ));
    }

    public function destroyAdjustment(Request $request, string $id, string $kind, string $adjustmentId, PayrollService $service)
    {
        $this->requirePermission($request, 'generate');

        abort_unless(in_array($kind, ['addition', 'deduction'], true), 404);

        return response()->json($service->deletePayrollAdjustment(
            Payroll::query()->findOrFail($id),
            $kind,
            $adjustmentId,
            $request->user()
        ));
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'payroll_period_id' => ['sometimes', 'required', 'uuid', 'exists:payroll_periods,id'],
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'source_account_id' => [
                'sometimes',
                'nullable',
                'uuid',
                Rule::exists('accounts', 'id')->where(fn ($query) => $query->where('active', true)),
            ],
            'status' => ['sometimes', 'in:draft,previewed,generated,approved,processed,paid,locked,void,voided,reopened'],
        ];
    }

    protected function resolveEmployeeIds(array $data): array
    {
        if (($data['employee_scope'] ?? null) === 'selected') {
            return array_values(array_unique($data['employee_ids'] ?? []));
        }

        return User::query()
            ->where('active', true)
            ->when($data['branch_id'] ?? null, fn ($query, $branchId) => $query->where('branch_id', $branchId))
            ->when(
                ($data['employee_scope'] ?? null) === 'department',
                fn ($query) => $query->where('department_id', $data['department_id'] ?? null)
            )
            ->pluck('id')
            ->all();
    }

    protected function resolveCurrencyId(array $data, ?string $branchId): string
    {
        if (! empty($data['currency_id'])) {
            return $data['currency_id'];
        }

        $settings = PayrollSetting::query()
            ->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)->orWhereNull('branch_id');
            })
            ->orderByRaw('branch_id is null')
            ->first();

        if ($settings?->currency_id) {
            return $settings->currency_id;
        }

        $baseCurrency = Currency::query()
            ->where('active', true)
            ->where('is_base', true)
            ->first();

        if ($baseCurrency) {
            return $baseCurrency->id;
        }

        $firstActiveCurrency = Currency::query()
            ->where('active', true)
            ->orderBy('code')
            ->first();

        if ($firstActiveCurrency) {
            return $firstActiveCurrency->id;
        }

        abort(422, 'Payroll currency is not configured. Select a currency in payroll generation, configure Payroll Settings, or create an active base currency.');
    }

    protected function resolveExchangeRate(string $currencyId, mixed $exchangeRate = null): float
    {
        if ($exchangeRate && (float) $exchangeRate > 0) {
            return (float) $exchangeRate;
        }

        $currency = Currency::query()->find($currencyId);

        return (float) ($currency?->exchange_rate ?: 1);
    }

    protected function validateAdjustment(Request $request): array
    {
        return $request->validate([
            'component_id' => ['nullable', 'uuid', 'exists:salary_components,id'],
            'name' => ['required', 'string', 'max:190'],
            'amount' => ['required', 'numeric', 'gt:0'],
            'calculation_type' => ['required', 'in:fixed,percentage'],
            'applicability_type' => ['required', 'in:all_employees,selected_employees'],
            'selected_employee_ids' => ['nullable', 'array', 'required_if:applicability_type,selected_employees'],
            'selected_employee_ids.*' => ['integer', 'exists:users,id'],
            'remarks' => ['nullable', 'string', 'max:1000'],
        ]);
    }

    protected function withBusinessRules(Model $record, array $businessRules): array
    {
        $payload = $record->toArray();
        $payload['business_rules'] = $businessRules;

        if ($businessRules['has_warnings'] ?? false) {
            $payload['message'] = 'Saved with warnings.';
        }

        return $payload;
    }

    protected function requirePermission(Request $request, string $permission): void
    {
        $user = $request->user();
        $aliases = [
            "hrm.payroll.{$permission}",
            "payroll.{$permission}",
        ];

        abort_unless(
            $user && collect($aliases)->contains(fn ($name) => $user->can($name)),
            403,
            'You do not have permission to perform this action.'
        );
    }
}
