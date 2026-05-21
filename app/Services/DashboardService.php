<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use App\Models\BankAccount;
class DashboardService
{
    protected array $transactionTables = [
        ['table' => 'invoices', 'type' => 'Invoice', 'module' => 'Sales', 'date' => 'invoice_date', 'number' => 'invoice_no', 'amount' => 'total', 'route' => '/payment-in/invoices'],
        ['table' => 'purchase_bills', 'type' => 'Purchase Bill', 'module' => 'Purchase', 'date' => 'bill_date', 'number' => 'bill_no', 'amount' => 'total', 'route' => '/payment-out/purchase-bills'],
        ['table' => 'customer_payments', 'type' => 'Customer Payment', 'module' => 'Payment In', 'date' => 'payment_date', 'number' => 'payment_no', 'amount' => 'amount', 'route' => '/payment-in/payments'],
        ['table' => 'supplier_payments', 'type' => 'Supplier Payment', 'module' => 'Payment Out', 'date' => 'payment_date', 'number' => 'payment_no', 'amount' => 'amount', 'route' => '/payment-out/payments'],
        ['table' => 'expenses', 'type' => 'Expense', 'module' => 'Purchase', 'date' => 'expense_date', 'number' => 'expense_no', 'amount' => 'total', 'route' => '/payment-out/expenses'],
        ['table' => 'cash_transfers', 'type' => 'Cash Transfer', 'module' => 'Accounting', 'date' => 'transfer_date', 'number' => 'transfer_no', 'amount' => 'total_amount', 'route' => '/accounting/cash-transfers'],
        ['table' => 'sales_returns', 'type' => 'Sales Return', 'module' => 'Sales', 'date' => 'sales_return_date', 'number' => 'sales_return_no', 'amount' => 'total', 'route' => '/payment-in/credit-notes'],
        ['table' => 'debit_notes', 'type' => 'Debit Note', 'module' => 'Purchase', 'date' => 'debit_note_date', 'number' => 'debit_note_no', 'amount' => 'total', 'route' => '/payment-out/debit-notes'],
        ['table' => 'inventory_adjustments', 'type' => 'Inventory Adjustment', 'module' => 'Inventory', 'date' => 'adjustment_date', 'number' => 'adjustment_no', 'amount' => 'total', 'route' => '/inventory/adjustments'],
        ['table' => 'loan_top_ups', 'type' => 'Loan TopUp', 'module' => 'Accounting', 'date' => 'topup_date', 'number' => 'topup_no', 'amount' => 'amount', 'route' => '/accounting/loan-accounts'],
        ['table' => 'loan_charges', 'type' => 'Loan Charge', 'module' => 'Accounting', 'date' => 'charge_date', 'number' => 'charge_no', 'amount' => 'amount', 'route' => '/accounting/loan-accounts'],
    ];

    public function getBranches(): array
    {
        if (!$this->tableExists('branches')) {
            return [];
        }

        return DB::table('branches')
            ->select('id', DB::raw($this->hasColumn('branches', 'name') ? 'name' : 'id as name'))
            ->orderBy($this->hasColumn('branches', 'name') ? 'name' : 'id')
            ->limit(100)
            ->get()
            ->map(fn($branch) => ['value' => $branch->id, 'label' => $branch->name])
            ->all();
    }

    public function getSummary(array $filters): array
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        return [
            'sales_today' => $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $today, $today)
                - $this->sumApproved('sales_returns', 'total', 'sales_return_date', $filters, $today, $today),
            'sales_this_month' => $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $monthStart, $monthEnd)
                - $this->sumApproved('sales_returns', 'total', 'sales_return_date', $filters, $monthStart, $monthEnd),
            'receivables' => $this->customerReceivableBalance($filters),
            'payables' => $this->payableBalance($filters),
            'cash_bank_balance' => $this->cashBankBalance($filters),
            'pending_approvals' => count($this->getPendingApprovals($filters)),
            'low_stock_items' => $this->lowStockCount(),
            'approved_jv_missing' => $this->approvedButJvMissingCount($filters),
        ];
    }

    public function getFinancialSummary(array $filters): array
    {
        $start = $this->filterStart($filters, now()->startOfMonth())->toDateString();
        $end = $this->filterEnd($filters, now())->toDateString();
        $revenue = $this->periodRevenue($filters, $start, $end);
        $expenses = $this->periodExpenses($filters, $start, $end);

        return [
            'cash_bank_balance' => $this->cashBankBalance($filters),
            'bank_balance' => $this->bankBalance($filters),
            'cash_in_hand' => $this->cashInHand($filters),
            'receivables' => $this->customerReceivableBalance($filters),
            'payables' => $this->payableBalance($filters),
            'supplier_payables' => $this->supplierPayableBalance($filters),
            'employee_payables' => $this->employeePayableBalance($filters),
            'revenue' => $revenue,
            'expenses' => $expenses,
            'net_profit' => $revenue - $expenses,
            'period_start' => $start,
            'period_end' => $end,
        ];
    }

    public function getCashPosition(array $filters): array
    {
        $bankBalance = $this->bankBalance($filters);
        $cashInHand = $this->cashInHand($filters);

        return [
            'bank_balance' => $bankBalance,
            'cash_in_hand' => $cashInHand,
            'cash_bank_balance' => $bankBalance + $cashInHand,
            'expected_receivables' => $this->customerReceivableBalance($filters),
            'upcoming_payables' => $this->upcomingPayables($filters, now()->toDateString(), now()->addDays(14)->toDateString()),
            'supplier_payables' => $this->supplierPayableBalance($filters),
            'employee_payables' => $this->employeePayableBalance($filters),
            'bank_accounts' => $this->bankAccountBalances($filters),
        ];
    }

    public function getMetricSparklines(array $filters): array
    {
        $start = $this->filterStart($filters, now()->subDays(29));
        $end = $this->filterEnd($filters, now());
        $receivables = $this->dailySums('invoices', 'balance_due', 'invoice_date', $filters, $start, $end);
        $payables = $this->dailyPayables($filters, $start, $end);
        $revenue = $this->dailyRevenue($filters, $start, $end);
        $expenses = $this->dailyExpenses($filters, $start, $end);
        $cashIn = $this->dailyCashIn($filters, $start, $end);
        $cashOut = $this->dailyCashOut($filters, $start, $end);

        $cash = [];
        $receivableRows = [];
        $payableRows = [];
        $profit = [];

        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->toDateString();
            $revenueTotal = (float) ($revenue[$key] ?? 0);
            $expenseTotal = (float) ($expenses[$key] ?? 0);
            $cash[] = [
                'date' => $key,
                'value' => (float) ($cashIn[$key] ?? 0) - (float) ($cashOut[$key] ?? 0),
            ];
            $receivableRows[] = ['date' => $key, 'value' => (float) ($receivables[$key] ?? 0)];
            $payableRows[] = ['date' => $key, 'value' => (float) ($payables[$key] ?? 0)];
            $profit[] = ['date' => $key, 'value' => $revenueTotal - $expenseTotal];
        }

        return [
            'cash_bank' => $cash,
            'receivables' => $receivableRows,
            'payables' => $payableRows,
            'net_profit' => $profit,
        ];
    }

    public function getSalesSummary(array $filters): ?array
    {
        if (!$this->tableExists('invoices')) {
            return null;
        }

        $start = $this->filterStart($filters, now()->startOfMonth())->toDateString();
        $end = $this->filterEnd($filters, now())->toDateString();
        $salesTotal = $this->periodRevenue($filters, $start, $end);
        $invoiceCount = $this->countApproved('invoices', 'invoice_date', $filters, $start, $end);
        $paidAmount = $this->paidAmountFor('invoices', 'invoice_date', $filters, $start, $end);
        $unpaidAmount = $this->sumApproved('invoices', 'balance_due', 'invoice_date', $filters, $start, $end);
        $overdueAmount = $this->overdueSum('invoices', 'due_date', 'balance_due', $filters);

        if ($salesTotal == 0 && $invoiceCount == 0) {
            return null;
        }

        return [
            'sales_total' => $salesTotal,
            'invoice_count' => $invoiceCount,
            'paid_amount' => max(0, $paidAmount),
            'unpaid_amount' => $unpaidAmount,
            'overdue_amount' => $overdueAmount,
        ];
    }

    public function getPurchaseSummary(array $filters): ?array
    {
        if (!$this->tableExists('purchase_bills')) {
            return null;
        }

        $start = $this->filterStart($filters, now()->startOfMonth())->toDateString();
        $end = $this->filterEnd($filters, now())->toDateString();
        $purchaseTotal = $this->periodPurchases($filters, $start, $end);
        $billCount = $this->countApproved('purchase_bills', 'bill_date', $filters, $start, $end);
        $paidBills = $this->paidAmountFor('purchase_bills', 'bill_date', $filters, $start, $end);
        $unpaidBills = $this->sumApproved('purchase_bills', 'balance_due', 'bill_date', $filters, $start, $end);
        $expensePayables = $this->expensePayableBalance($filters);
        $upcomingPayables = $this->upcomingPayables($filters, now()->toDateString(), now()->addDays(14)->toDateString());

        if ($purchaseTotal == 0 && $billCount == 0 && $expensePayables == 0.0) {
            return null;
        }

        return [
            'purchase_total' => $purchaseTotal,
            'bill_count' => $billCount,
            'paid_amount' => max(0, $paidBills),
            'unpaid_amount' => $unpaidBills,
            'expense_payables' => $expensePayables,
            'total_payables' => $unpaidBills + $expensePayables,
            'upcoming_payables' => $upcomingPayables,
        ];
    }

    public function getCashflowSummary(array $filters): ?array
    {
        $start = $this->filterStart($filters, now()->startOfMonth());
        $end = $this->filterEnd($filters, now());
        $cashIn = $this->periodCashIn($filters, $start, $end);
        $cashOut = $this->periodCashOut($filters, $start, $end);

        if ($cashIn == 0 && $cashOut == 0) {
            return null;
        }

        return [
            'cash_in' => $cashIn,
            'cash_out' => $cashOut,
            'net_cash_flow' => $cashIn - $cashOut,
            'biggest_inflow' => $this->biggestInflowSource($filters, $start, $end),
            'biggest_outflow' => $this->biggestOutflowSource($filters, $start, $end),
        ];
    }

    public function getInventorySummaryCard(array $filters): ?array
    {
        if (!$this->tableExists('products')) {
            return null;
        }

        $totalProducts = $this->activeProductsQuery()->count();
        $lowStock = $this->lowStockCount();
        $valueColumn = $this->firstExistingColumn('products', ['inventory_value', 'stock_value']);
        $stockColumn = $this->firstExistingColumn('products', ['current_stock', 'stock', 'quantity', 'opening_stock']);
        $inventoryValue = 0.0;

        if ($valueColumn) {
            $inventoryValue = (float) DB::table('products')->sum($valueColumn);
        } elseif ($stockColumn && $this->hasColumn('products', 'purchase_price')) {
            $inventoryValue = (float) DB::table('products')->sum(DB::raw("COALESCE($stockColumn, 0) * COALESCE(purchase_price, 0)"));
        }

        $warehouseCount = $this->tableExists('warehouses') ? DB::table('warehouses')->count() : 0;

        if ($totalProducts == 0) {
            return null;
        }

        return [
            'total_products' => $totalProducts,
            'low_stock_items' => $lowStock,
            'inventory_value' => $inventoryValue,
            'warehouse_count' => $warehouseCount,
        ];
    }

    public function getCrmSummaryCard(array $filters): ?array
    {
        if (!$this->tableExists('deals') && !$this->tableExists('leads')) {
            return null;
        }

        $openLeads = $this->tableExists('leads') && $this->hasColumn('leads', 'status')
            ? DB::table('leads')->whereIn('status', ['new', 'NEW', 'open', 'OPEN'])->count()
            : 0;
        $openDeals = $this->whereCount('deals', 'status', 'open');
        if ($openDeals === 0 && $this->tableExists('deals') && $this->hasColumn('deals', 'status')) {
            $openDeals = DB::table('deals')->whereIn('status', ['OPEN', 'IN_PROGRESS', 'NEGOTIATION'])->count();
        }

        $pipelineValue = 0.0;
        if ($this->tableExists('deals') && $this->hasColumn('deals', 'amount')) {
            $query = DB::table('deals');
            if ($this->hasColumn('deals', 'status')) {
                $query->whereNotIn('status', ['lost', 'LOST', 'cancelled', 'CANCELLED']);
            }
            $pipelineValue = (float) $query->sum('amount');
        }

        $wonValue = 0.0;
        if ($this->tableExists('deals') && $this->hasColumn('deals', 'amount') && $this->hasColumn('deals', 'status')) {
            $query = DB::table('deals')->whereIn('status', ['won', 'WON']);
            if ($this->hasColumn('deals', 'closed_date')) {
                $query->whereBetween('closed_date', [now()->startOfMonth(), now()->endOfMonth()]);
            } elseif ($this->hasColumn('deals', 'updated_at')) {
                $query->whereBetween('updated_at', [now()->startOfMonth(), now()->endOfMonth()]);
            }
            $wonValue = (float) $query->sum('amount');
        }

        if ($openLeads == 0 && $openDeals == 0 && $pipelineValue == 0) {
            return null;
        }

        return [
            'open_leads' => $openLeads,
            'open_deals' => $openDeals,
            'pipeline_value' => $pipelineValue,
            'won_value' => $wonValue,
        ];
    }

    public function getHrmSummaryCard(array $filters): ?array
    {
        if (!$this->tableExists('employee_profiles')) {
            return null;
        }

        $employees = DB::table('employee_profiles');
        if ($this->hasColumn('employee_profiles', 'active')) {
            $employees->where('active', true);
        }
        $this->applyBranch($employees, 'employee_profiles', $filters);
        $activeEmployees = $employees->count();

        if ($activeEmployees == 0) {
            return null;
        }

        $leaveToday = 0;
        if ($this->tableExists('leave_applications') && $this->hasColumn('leave_applications', 'leave_from') && $this->hasColumn('leave_applications', 'leave_to')) {
            $leave = DB::table('leave_applications')
                ->whereDate('leave_from', '<=', now()->toDateString())
                ->whereDate('leave_to', '>=', now()->toDateString());
            if ($this->hasColumn('leave_applications', 'status')) {
                $leave->whereIn('status', ['APPROVED', 'approved']);
            }
            $this->applyBranch($leave, 'leave_applications', $filters);
            $leaveToday = $leave->count();
        }

        $attendanceToday = 0;
        if ($this->tableExists('attendances') && $this->hasColumn('attendances', 'in_time')) {
            $attendance = DB::table('attendances')->whereDate('in_time', now()->toDateString());
            $this->applyBranch($attendance, 'attendances', $filters);
            $attendanceToday = $attendance->count();
        }

        $payrollThisPeriod = 0.0;
        if ($this->tableExists('payrolls') && $this->hasColumn('payrolls', 'net_pay')) {
            $query = DB::table('payrolls');
            if ($this->hasColumn('payrolls', 'payroll_date')) {
                $query->whereBetween('payroll_date', [now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString()]);
            }
            $this->applyBranch($query, 'payrolls', $filters);
            $payrollThisPeriod = (float) $query->sum('net_pay');
        }

        return [
            'active_employees' => $activeEmployees,
            'on_leave_today' => $leaveToday,
            'attendance_today' => $attendanceToday,
            'payroll_this_period' => $payrollThisPeriod,
            'employee_payables' => $this->employeePayableBalance($filters),
        ];
    }

    public function getProjectSummaryCard(array $filters): ?array
    {
        if (!$this->tableExists('projects')) {
            return null;
        }

        $activeProjects = DB::table('projects');
        if ($this->hasColumn('projects', 'status')) {
            $activeProjects->whereIn('status', ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'pending', 'in_progress', 'on_hold']);
        }
        $activeCount = $activeProjects->count();

        $completedThisPeriod = 0;
        if ($this->hasColumn('projects', 'status')) {
            $query = DB::table('projects')->whereIn('status', ['COMPLETED', 'completed']);
            if ($this->hasColumn('projects', 'updated_at')) {
                $start = $this->filterStart($filters, now()->startOfMonth())->toDateString();
                $end = $this->filterEnd($filters, now())->toDateString();
                $query->whereBetween('updated_at', [$start, $end]);
            }
            $completedThisPeriod = $query->count();
        }

        $overdueProjectTasks = 0;
        if ($this->tableExists('tasks') && $this->hasColumn('tasks', 'project_id') && $this->hasColumn('tasks', 'end_date')) {
            $tasks = DB::table('tasks')
                ->join('projects', 'tasks.project_id', '=', 'projects.id')
                ->whereDate('tasks.end_date', '<', now()->toDateString());
            if ($this->hasColumn('tasks', 'active')) {
                $tasks->where('tasks.active', true);
            }
            if ($this->hasColumn('projects', 'status')) {
                $tasks->whereNotIn('projects.status', ['COMPLETED', 'CANCELLED', 'completed', 'cancelled']);
            }
            $overdueProjectTasks = $tasks->count();
        }

        $billingValue = 0.0;
        if ($this->hasColumn('projects', 'budget') || $this->hasColumn('projects', 'total_budget')) {
            $budgetCol = $this->firstExistingColumn('projects', ['budget', 'total_budget']);
            if ($budgetCol) {
                $query = DB::table('projects');
                if ($this->hasColumn('projects', 'status')) {
                    $query->whereIn('status', ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'pending', 'in_progress', 'on_hold']);
                }
                $billingValue = (float) $query->sum($budgetCol);
            }
        }

        if ($activeCount == 0 && $completedThisPeriod == 0) {
            return null;
        }

        return [
            'active_projects' => $activeCount,
            'completed_this_period' => $completedThisPeriod,
            'overdue_tasks' => $overdueProjectTasks,
            'billing_value' => $billingValue,
        ];
    }

    public function getBusinessSnapshots(array $filters): array
    {
        return collect([
            $this->crmSummary($filters),
            $this->hrmSummary($filters),
            $this->projectSummary($filters),
            $this->inventorySummary($filters),
        ])->filter()->values()->all();
    }

    public function getPendingApprovals(array $filters): array
    {
        $rows = [];

        foreach ($this->transactionTables as $config) {
            if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'approved')) {
                continue;
            }

            $query = $this->baseTransactionQuery($config, $filters)
                ->where(function (Builder $query) use ($config) {
                    $query->where($config['table'] . '.approved', false);
                    if ($this->hasColumn($config['table'], 'status')) {
                        $query->orWhereIn($config['table'] . '.status', ['draft', 'pending']);
                    }
                })
                ->where(function (Builder $query) use ($config) {
                    if ($this->hasColumn($config['table'], 'void')) {
                        $query->where($config['table'] . '.void', false);
                    }
                })
                ->orderByDesc($config['table'] . '.created_at')
                ->limit(10);

            foreach ($query->get() as $row) {
                $rows[] = $this->formatTransactionRow($row, $config, 'pending');
            }
        }

        return collect($rows)->sortByDesc('created_at')->take(30)->values()->all();
    }

    public function getAccountingHealth(array $filters): array
    {
        $criticalIssues = $this->approvedButJvMissingCount($filters)
            + $this->journalVoucherNullCount($filters)
            + count($this->unbalancedJournalVouchers($filters));
        $warningIssues = $this->approvedButNumberMissingCount($filters);

        return [
            'score' => max(0, 100 - ($criticalIssues * 12) - ($warningIssues * 5)),
            'approved_jv_missing' => $this->approvedButJvMissingCount($filters),
            'approved_number_missing' => $this->approvedButNumberMissingCount($filters),
            'journal_voucher_id_null' => $this->journalVoucherNullCount($filters),
            'auto_jv_created_today' => $this->autoJvCreatedToday($filters),
            'unbalanced_jvs' => count($this->unbalancedJournalVouchers($filters)),
            'voided_this_month' => $this->voidedThisMonth($filters),
            'reversal_jvs_this_month' => $this->reversalJvsThisMonth($filters),
        ];
    }

    public function getBusinessHealth(array $filters): array
    {
        $summary = $this->getSummary($filters);
        $revenue = (float) ($summary['sales_this_month'] ?? 0);
        $expenses = $this->periodExpenses($filters, now()->startOfMonth()->toDateString(), now()->endOfMonth()->toDateString());
        $profit = $revenue - $expenses;
        $overdueReceivables = (float) collect($this->getReceivableAgeing($filters))
            ->reject(fn($bucket) => $bucket['bucket'] === 'Current')
            ->sum('amount');
        $payablesDueSoon = $this->overdueCount('purchase_bills', 'due_date', 'balance_due', $filters, false);
        $lowStock = $this->lowStockCount();
        $crmFollowups = count($this->crmFollowups());
        $accountingScore = (float) ($this->getAccountingHealth($filters)['score'] ?? 100);

        $score = 100;
        if ($revenue > 0 && $profit < 0) {
            $score -= 18;
        }
        if (($summary['cash_bank_balance'] ?? 0) < 0) {
            $score -= 20;
        }
        if ($overdueReceivables > 0) {
            $score -= min(18, 6 + ($overdueReceivables / max(1, (float) ($summary['receivables'] ?? 1))) * 12);
        }
        $score -= min(12, $payablesDueSoon * 3);
        $score -= min(10, $lowStock * 2);
        $score -= min(8, $crmFollowups * 2);
        $score -= max(0, (100 - $accountingScore) * 0.35);
        $score = (int) round(max(0, min(100, $score)));

        return [
            'score' => $score,
            'status' => $score >= 85 ? 'Strong' : ($score >= 70 ? 'Stable' : ($score >= 50 ? 'Needs attention' : 'At risk')),
            'message' => $this->businessHealthMessage($score, $profit, (float) ($summary['cash_bank_balance'] ?? 0), $overdueReceivables),
            'profit' => $profit,
            'overdue_receivables' => $overdueReceivables,
            'payables_due_soon' => $payablesDueSoon,
            'low_stock' => $lowStock,
            'crm_followups' => $crmFollowups,
        ];
    }

    public function getAccountingIssues(array $filters): array
    {
        $issues = [];

        foreach ($this->transactionTables as $config) {
            if ($config['table'] === 'journal_vouchers' || !$this->tableExists($config['table'])) {
                continue;
            }

            foreach ($this->approvedButJvMissingRows($config, $filters, 8) as $row) {
                $issues[] = $this->issue('Approved but JV missing', $config, $row, 'critical');
            }

            foreach ($this->approvedButNumberMissingRows($config, $filters, 8) as $row) {
                $issues[] = $this->issue('Approved but number missing', $config, $row, 'warning');
            }

            foreach ($this->sourceWithMissingJvRows($config, $filters, 5) as $row) {
                $issues[] = $this->issue('Source JV reference missing', $config, $row, 'critical');
            }
        }

        foreach ($this->unbalancedJournalVouchers($filters) as $row) {
            $issues[] = [
                'key' => 'unbalanced-jv-' . $row->id,
                'issue_type' => 'Unbalanced journal voucher',
                'module' => 'Accounting',
                'record' => $row->voucher_no ?: $row->id,
                'amount' => abs((float) $row->debit_total - (float) $row->credit_total),
                'date' => $row->voucher_date,
                'severity' => 'critical',
                'action_url' => '/accounting/journal-vouchers/' . $row->id,
            ];
        }

        foreach ($this->jvWithNoLines($filters) as $row) {
            $issues[] = [
                'key' => 'empty-jv-' . $row->id,
                'issue_type' => 'JV has no lines',
                'module' => 'Accounting',
                'record' => $row->voucher_no ?: $row->id,
                'amount' => (float) ($row->total ?? 0),
                'date' => $row->voucher_date,
                'severity' => 'critical',
                'action_url' => '/accounting/journal-vouchers/' . $row->id,
            ];
        }

        return collect($issues)->take(50)->values()->all();
    }

    public function getCashFlow(array $filters): array
    {
        $start = now()->subDays(29)->startOfDay();
        $end = now()->endOfDay();
        $incoming = $this->dailyCashIn($filters, $start, $end);
        $outgoing = $this->dailyCashOut($filters, $start, $end);

        $rows = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->toDateString();
            $cashIn = (float) ($incoming[$key] ?? 0);
            $cashOut = (float) ($outgoing[$key] ?? 0);
            $rows[] = [
                'date' => $key,
                'cash_in' => $cashIn,
                'cash_out' => $cashOut,
                'net' => $cashIn - $cashOut,
            ];
        }

        return [
            'summary' => [
                'cash_in_today' => (float) ($incoming[now()->toDateString()] ?? 0),
                'cash_out_today' => (float) ($outgoing[now()->toDateString()] ?? 0),
                'net_cash_flow' => ((float) ($incoming[now()->toDateString()] ?? 0)) - (float) ($outgoing[now()->toDateString()] ?? 0),
                'bank_balance' => $this->bankBalance($filters),
                'cash_in_hand' => $this->cashInHand($filters),
                'expected_receivables' => $this->customerReceivableBalance($filters),
                'upcoming_payables' => $this->upcomingPayables($filters, now()->toDateString(), now()->addDays(14)->toDateString()),
            ],
            'chart' => $rows,
            'forecast' => $this->cashFlowForecast($filters),
        ];
    }

    public function getRevenueExpenseChart(array $filters): array
    {
        $start = $this->filterStart($filters, now()->subDays(29));
        $end = $this->filterEnd($filters, now());
        $revenue = $this->dailyRevenue($filters, $start, $end);
        $expenses = $this->dailyExpenses($filters, $start, $end);

        $rows = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->toDateString();
            $revenueTotal = (float) ($revenue[$key] ?? 0);
            $expenseTotal = (float) ($expenses[$key] ?? 0);
            $rows[] = [
                'date' => $key,
                'revenue' => $revenueTotal,
                'expenses' => $expenseTotal,
                'profit' => $revenueTotal - $expenseTotal,
            ];
        }

        return $rows;
    }

    public function getReceivableAgeing(array $filters): array
    {
        return $this->ageingBuckets('invoices', 'due_date', 'balance_due', $filters, '/payment-in/invoices');
    }

    public function getPayableAgeing(array $filters): array
    {
        return $this->combineAgeingBuckets([
            $this->ageingBuckets('purchase_bills', 'due_date', 'balance_due', $filters, '/payment-out/purchase-bills'),
            $this->expenseAgeingBuckets($filters),
        ]);
    }

    public function getSalesPurchase(array $filters): array
    {
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        return [
            'sales' => [
                'quotations' => $this->countTable('quotations', 'quotation_date', $filters),
                'sales_orders' => $this->countTable('sales_orders', 'order_date', $filters),
                'invoices' => $this->countTable('invoices', 'invoice_date', $filters),
                'customer_payments' => $this->countTable('customer_payments', 'payment_date', $filters),
                'sales_returns' => $this->countTable('sales_returns', 'sales_return_date', $filters),
                'overdue_invoices' => $this->overdueCount('invoices', 'due_date', 'balance_due', $filters),
                'top_customers' => $this->topParties('invoices', 'invoice_date', 'total', $filters),
            ],
            'purchase' => [
                'purchase_orders' => $this->countTable('purchase_orders', 'order_date', $filters),
                'purchase_bills' => $this->countTable('purchase_bills', 'bill_date', $filters),
                'supplier_payments' => $this->countTable('supplier_payments', 'payment_date', $filters),
                'expenses' => $this->countTable('expenses', 'expense_date', $filters),
                'debit_notes' => $this->countTable('debit_notes', 'debit_note_date', $filters),
                'upcoming_bills' => $this->overdueCount('purchase_bills', 'due_date', 'balance_due', $filters, false)
                    + $this->expenseDueCount($filters, now()->toDateString(), now()->addDays(14)->toDateString()),
                'top_suppliers' => $this->topParties('purchase_bills', 'bill_date', 'total', $filters),
            ],
            'chart' => [
                ['name' => 'Sales', 'amount' => $this->periodRevenue($filters, $monthStart, $monthEnd)],
                ['name' => 'Purchase', 'amount' => $this->periodPurchases($filters, $monthStart, $monthEnd)],
            ],
        ];
    }

    public function getInventorySnapshot(array $filters): array
    {
        if (!$this->tableExists('products')) {
            return ['summary' => [], 'warnings' => []];
        }

        $stockColumn = $this->firstExistingColumn('products', ['current_stock', 'stock', 'quantity', 'opening_stock']);
        $valueColumn = $this->firstExistingColumn('products', ['inventory_value', 'stock_value']);
        $reorderColumn = $this->hasColumn('products', 'reorder_level') ? 'reorder_level' : null;
        $nameColumn = $this->hasColumn('products', 'name') ? 'name' : 'id';
        $stockExpr = $stockColumn ?: '0';
        $selects = ['id', DB::raw($nameColumn . ' as name'), DB::raw(($reorderColumn ?: '0') . ' as reorder_level'), DB::raw(($stockColumn ?: '0') . ' as current_stock')];
        $selects[] = $this->hasColumn('products', 'sku') ? 'sku' : DB::raw('NULL as sku');
        $selects[] = $this->hasColumn('products', 'code') ? 'code' : DB::raw('NULL as code');

        $products = DB::table('products')
            ->select($selects);
        if ($this->hasColumn('products', 'active')) {
            $products->where('active', true);
        }
        $products = $products->orderBy($nameColumn)->limit(300)->get();

        $warnings = $products->filter(fn($product) => (float) $product->current_stock <= (float) $product->reorder_level)
            ->take(20)
            ->map(function ($product) {
                $stock = (float) $product->current_stock;
                return [
                    'key' => $product->id,
                    'product' => $product->name,
                    'sku' => $product->sku ?: $product->code,
                    'current_stock' => $stock,
                    'reorder_level' => (float) $product->reorder_level,
                    'warehouse' => null,
                    'status' => $stock < 0 ? 'negative' : ($stock == 0 ? 'no_stock' : 'low_stock'),
                    'action_url' => '/inventory/products/' . $product->id,
                ];
            })
            ->values()
            ->all();

        return [
            'summary' => [
                'total_products' => $this->activeProductsQuery()->count(),
                'low_stock_products' => count($warnings),
                'negative_stock_warnings' => $products->filter(fn($product) => (float) $product->current_stock < 0)->count(),
                'inventory_value' => $valueColumn ? (float) DB::table('products')->sum($valueColumn) : ($this->hasColumn('products', 'purchase_price') ? (float) DB::table('products')->sum(DB::raw("COALESCE($stockExpr, 0) * COALESCE(purchase_price, 0)")) : 0),
                'pending_warehouse_transfers' => $this->pendingCount('warehouse_transfers'),
                'pending_inventory_adjustments' => $this->pendingCount('inventory_adjustments'),
            ],
            'warnings' => $warnings,
        ];
    }

    public function getCrmSnapshot(array $filters): array
    {
        $todayStart = now()->startOfDay();
        $todayEnd = now()->endOfDay();

        return [
            'summary' => [
                'new_leads' => $this->whereCount('leads', 'status', 'new'),
                'open_deals' => $this->whereCount('deals', 'status', 'open'),
                'expected_deal_value' => $this->sumWhere('deals', 'amount', 'status', 'open'),
                'followups_due_today' => $this->dateDueCount('crm_activities', 'due_at', $todayStart, $todayEnd),
                'overdue_activities' => $this->overdueActivities(),
                'deals_at_risk' => $this->dealsAtRiskCount(14),
                'forecast_this_month' => $this->weightedForecastThisMonth(),
                'won_deals_this_month' => $this->monthlyDealCount('won'),
                'lost_deals_this_month' => $this->monthlyDealCount('lost'),
                'win_rate' => $this->winRateThisMonth(),
            ],
            'pipeline' => $this->pipeline(),
            'followups' => $this->crmFollowups(),
            'widgets' => [
                'leads_created_this_week_vs_target' => [
                    'actual' => $this->weeklyLeadCount(),
                    'target' => 25,
                    'action_url' => '/crm/leads',
                ],
                'followups_due_today' => [
                    'actual' => $this->dateDueCount('crm_activities', 'due_at', $todayStart, $todayEnd),
                    'action_url' => '/crm/activity-inbox?bucket=today',
                ],
                'deals_at_risk' => [
                    'actual' => $this->dealsAtRiskCount(14),
                    'action_url' => '/crm/deals?stuck=1',
                ],
                'forecast_this_month' => [
                    'actual' => $this->weightedForecastThisMonth(),
                    'action_url' => '/crm/forecast',
                ],
                'win_rate_by_source' => $this->winRateBySource(),
                'top_overdue_customer_responses' => $this->crmFollowups(),
            ],
        ];
    }

    public function getSmartAlerts(array $filters): array
    {
        $alerts = [];
        foreach ($this->getAccountingIssues($filters) as $issue) {
            $alerts[] = [
                'severity' => $issue['severity'],
                'title' => $issue['issue_type'],
                'description' => $issue['module'] . ' record ' . $issue['record'] . ' needs review.',
                'module' => $issue['module'],
                'action_url' => $issue['action_url'],
            ];
        }

        foreach (($this->getInventorySnapshot($filters)['warnings'] ?? []) as $warning) {
            $alerts[] = [
                'severity' => $warning['status'] === 'negative' ? 'critical' : 'warning',
                'title' => 'Product below reorder level',
                'description' => $warning['product'] . ' has stock of ' . $warning['current_stock'] . '.',
                'module' => 'Inventory',
                'action_url' => $warning['action_url'],
            ];
        }

        foreach ($this->crmFollowups() as $followup) {
            $alerts[] = [
                'severity' => !empty($followup['next_follow_up']) && Carbon::parse($followup['next_follow_up'])->isPast() ? 'warning' : 'info',
                'title' => 'CRM follow-up due',
                'description' => ($followup['name'] ?? 'Activity') . ' needs a response.',
                'module' => 'CRM',
                'action_url' => $followup['action_url'] ?? '/crm/activities',
            ];
        }

        return collect($alerts)->take(20)->values()->all();
    }

    public function getTopCustomers(array $filters): array
    {
        return $this->topParties('invoices', 'invoice_date', 'total', $filters);
    }

    public function getTopSuppliers(array $filters): array
    {
        return $this->topParties('purchase_bills', 'bill_date', 'total', $filters);
    }

    public function getExpenseBreakdown(array $filters): array
    {
        $start = $this->filterStart($filters, now()->startOfMonth())->toDateString();
        $end = $this->filterEnd($filters, now())->toDateString();
        $breakdown = [];

        if (
            $this->tableExists('expense_lines') && $this->hasColumn('expense_lines', 'expense_id')
            && $this->hasColumn('expense_lines', 'account_id') && $this->tableExists('chart_of_accounts')
        ) {

            $amountCol = $this->firstExistingColumn('expense_lines', ['amount', 'total', 'line_total']);

            if ($amountCol) {
                $nameCol = $this->hasColumn('chart_of_accounts', 'name')
                    ? 'chart_of_accounts.name'
                    : 'chart_of_accounts.id';

                $query = DB::table('expense_lines')
                    ->join('expenses', 'expense_lines.expense_id', '=', 'expenses.id')
                    ->leftJoin('chart_of_accounts', 'expense_lines.account_id', '=', 'chart_of_accounts.id')
                    ->whereDate('expenses.expense_date', '>=', $start)
                    ->whereDate('expenses.expense_date', '<=', $end);

                if ($this->hasColumn('expenses', 'approved')) {
                    $query->where('expenses.approved', true);
                }
                if ($this->hasColumn('expenses', 'void')) {
                    $query->where('expenses.void', false);
                }
                $this->applyBranch($query, 'expenses', $filters);

                $results = $query
                    ->select([
                        DB::raw("$nameCol as category"),
                        DB::raw("SUM(expense_lines.$amountCol) as total"),
                    ])
                    ->groupBy(DB::raw($nameCol))
                    ->orderByDesc('total')
                    ->limit(8)
                    ->get();

                foreach ($results as $row) {
                    if ((float) $row->total > 0) {
                        $breakdown[] = ['name' => $row->category ?: 'Uncategorized', 'value' => round((float) $row->total, 2)];
                    }
                }
            }
        }

        if (empty($breakdown)) {
            $purchases = $this->periodPurchases($filters, $start, $end);
            $expenses = $this->sumApproved('expenses', 'total', 'expense_date', $filters, $start, $end);
            if ($purchases > 0) {
                $breakdown[] = ['name' => 'Purchases', 'value' => round($purchases, 2)];
            }
            if ($expenses > 0) {
                $breakdown[] = ['name' => 'Operating Expenses', 'value' => round($expenses, 2)];
            }
        }

        return $breakdown;
    }

    public function getCashFlowChart(array $filters): array
    {
        $start = $this->filterStart($filters, now()->subDays(29));
        $end = $this->filterEnd($filters, now());
        $incoming = $this->dailyCashIn($filters, $start, $end);
        $outgoing = $this->dailyCashOut($filters, $start, $end);

        $rows = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->toDateString();
            $in = (float) ($incoming[$key] ?? 0);
            $out = (float) ($outgoing[$key] ?? 0);
            $rows[] = [
                'date' => $key,
                'cash_in' => round($in, 2),
                'cash_out' => round($out, 2),
                'net' => round($in - $out, 2),
            ];
        }

        return $rows;
    }

    public function getRecentActivity(array $filters): array
    {
        $activity = [];
        $recentConfigs = [
            ['table' => 'invoices', 'module' => 'Sales', 'date' => 'approved_at', 'text' => 'Invoice approved', 'number' => 'invoice_no', 'route' => '/payment-in/invoices'],
            ['table' => 'customer_payments', 'module' => 'Payment In', 'date' => 'approved_at', 'text' => 'Customer payment posted', 'number' => 'payment_no', 'route' => '/payment-in/payments'],
            ['table' => 'supplier_payments', 'module' => 'Payment Out', 'date' => 'approved_at', 'text' => 'Supplier payment posted', 'number' => 'payment_no', 'route' => '/payment-out/payments'],
            ['table' => 'contacts', 'module' => 'CRM', 'date' => 'created_at', 'text' => 'Contact created', 'number' => 'name', 'route' => '/crm/contacts'],
            ['table' => 'leads', 'module' => 'CRM', 'date' => 'created_at', 'text' => 'Lead created', 'number' => 'name', 'route' => '/crm/leads'],
        ];

        foreach ($recentConfigs as $config) {
            if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], $config['date'])) {
                continue;
            }

            $query = DB::table($config['table'])->select($config['table'] . '.*')->orderByDesc($config['date'])->limit(8);
            $this->applyDashboardRecordScope($query, $config['table'], in_array($config['table'], ['invoices', 'customer_payments', 'supplier_payments'], true));
            $this->applyBranch($query, $config['table'], $filters);

            foreach ($query->get() as $row) {
                $user = $this->userName($row->user_add_id ?? null);
                $activity[] = [
                    'key' => $config['table'] . '-' . $row->id,
                    'time' => $row->{$config['date']},
                    'module' => $config['module'],
                    'description' => trim($config['text'] . ' ' . ($row->{$config['number']} ?? '')),
                    'user' => $user,
                    'status' => $row->status ?? ($row->approved ?? false ? 'approved' : 'created'),
                    'action_url' => $config['route'] . '/' . $row->id,
                ];
            }
        }

        return collect($activity)->sortByDesc('time')->take(25)->values()->all();
    }

    public function getRecentTransactions(array $filters): array
    {
        $transactions = [];
        $configs = collect($this->transactionTables)
            ->whereIn('table', [
                'invoices',
                'purchase_bills',
                'customer_payments',
                'supplier_payments',
                'expenses',
                'cash_transfers',
            ])
            ->values();

        foreach ($configs as $config) {
            if (!$this->tableExists($config['table'])) {
                continue;
            }

            $query = $this->baseTransactionQuery($config, $filters);

            $this->applyDashboardRecordScope($query, $config['table'], true);

            $sortColumn = $this->hasColumn($config['table'], 'created_at') ? 'created_at' : $config['date'];
            $query->orderByDesc($config['table'] . '.' . $sortColumn)->limit(5);

            foreach ($query->get() as $row) {
                $date = $row->{$config['date']} ?? $row->created_at ?? null;
                $transactions[] = [
                    'key' => $config['table'] . '-' . $row->id,
                    'date' => $date,
                    'type' => $config['type'],
                    'number' => $row->{$config['number']} ?? $row->reference ?? (string) $row->id,
                    'party' => $row->party_name ?? $row->account_name ?? '-',
                    'amount' => (float) ($row->{$config['amount']} ?? $row->total ?? 0),
                    'status' => $row->status ?? ($row->approved ?? false ? 'posted' : 'created'),
                    'action_url' => $config['route'] . '/' . $row->id,
                    'created_at' => $row->created_at ?? $date,
                ];
            }
        }

        return collect($transactions)->sortByDesc('created_at')->take(8)->values()->all();
    }

    protected function bankAccountBalances(array $filters): array
    {
        if (!$this->tableExists('bank_accounts')) {
            return [];
        }

        $selects = [
            'bank_accounts.id',
            DB::raw(($this->hasColumn('bank_accounts', 'display_name') ? 'bank_accounts.display_name' : 'bank_accounts.id') . ' as display_name'),
            DB::raw(($this->hasColumn('bank_accounts', 'bank_name') ? 'bank_accounts.bank_name' : 'NULL') . ' as bank_name'),
            DB::raw(($this->hasColumn('bank_accounts', 'account_name') ? 'bank_accounts.account_name' : 'NULL') . ' as account_name'),
            DB::raw(($this->hasColumn('bank_accounts', 'account_number') ? 'bank_accounts.account_number' : 'NULL') . ' as account_number'),
        ];

        $query = DB::table('bank_accounts')->select($selects);

        if ($this->hasColumn('bank_accounts', 'account_id') && $this->tableExists('accounts') && $this->hasColumn('accounts', 'balance')) {
            $query->leftJoin('accounts', 'bank_accounts.account_id', '=', 'accounts.id')
                ->addSelect(DB::raw('COALESCE(accounts.balance, 0) as balance'));

            if ($this->hasColumn('accounts', 'active')) {
                $query->where(function (Builder $query) {
                    $query->whereNull('accounts.id')->orWhere('accounts.active', true);
                });
            }
        } else {
            $balanceColumn = $this->firstExistingColumn('bank_accounts', ['current_balance', 'balance', 'opening_balance']);
            if (!$balanceColumn) {
                return [];
            }

            $query->addSelect(DB::raw("bank_accounts.$balanceColumn as balance"));
        }

        if ($this->hasColumn('bank_accounts', 'currency_id') && $this->tableExists('currencies')) {
            $query->leftJoin('currencies', 'bank_accounts.currency_id', '=', 'currencies.id')
                ->addSelect(DB::raw($this->hasColumn('currencies', 'code') ? 'currencies.code as currency' : 'NULL as currency'));
        } else {
            $query->addSelect(DB::raw('NULL as currency'));
        }

        if ($this->hasColumn('bank_accounts', 'type')) {
            $query->where('bank_accounts.type', 'bank');
        }
        if ($this->hasColumn('bank_accounts', 'active')) {
            $query->where('bank_accounts.active', true);
        }

        $this->applyBranch($query, 'bank_accounts', $filters);

        return $query
            ->orderByDesc('balance')
            ->limit(5)
            ->get()
            ->map(fn($account) => [
                'key' => $account->id,
                'bank_name' => $account->bank_name ?: $account->display_name,
                'account_name' => $account->account_name ?: $account->display_name,
                'account_number' => $account->account_number,
                'balance' => (float) ($account->balance ?? 0),
                'currency' => $account->currency,
            ])
            ->all();
    }

    protected function crmSummary(array $filters): ?array
    {
        if (!$this->tableExists('deals') && !$this->tableExists('leads')) {
            return null;
        }

        $openDeals = $this->whereCount('deals', 'status', 'open');
        if ($openDeals === 0 && $this->tableExists('deals') && $this->hasColumn('deals', 'status')) {
            $openDeals = DB::table('deals')->whereIn('status', ['OPEN', 'IN_PROGRESS', 'NEGOTIATION'])->count();
        }

        $leadsThisMonth = 0;
        if ($this->tableExists('leads') && $this->hasColumn('leads', 'created_at')) {
            $leadsThisMonth = DB::table('leads')->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()])->count();
        }

        $pipelineValue = 0.0;
        if ($this->tableExists('deals') && $this->hasColumn('deals', 'amount')) {
            $query = DB::table('deals');
            if ($this->hasColumn('deals', 'status')) {
                $query->whereNotIn('status', ['lost', 'LOST', 'cancelled', 'CANCELLED']);
            }
            $pipelineValue = (float) $query->sum('amount');
        }

        if ($openDeals === 0 && $leadsThisMonth === 0 && $pipelineValue == 0.0) {
            return null;
        }

        return [
            'key' => 'crm',
            'title' => 'CRM',
            'href' => '/crm',
            'items' => [
                ['label' => 'Open deals', 'value' => $openDeals],
                ['label' => 'Leads this month', 'value' => $leadsThisMonth],
                ['label' => 'Pipeline value', 'value' => $pipelineValue, 'format' => 'money'],
            ],
        ];
    }

    protected function hrmSummary(array $filters): ?array
    {
        if (!$this->tableExists('employee_profiles')) {
            return null;
        }

        $employees = DB::table('employee_profiles');
        if ($this->hasColumn('employee_profiles', 'active')) {
            $employees->where('active', true);
        }
        $this->applyBranch($employees, 'employee_profiles', $filters);
        $activeEmployees = $employees->count();

        $attendanceToday = 0;
        if ($this->tableExists('attendances') && $this->hasColumn('attendances', 'in_time')) {
            $attendance = DB::table('attendances')->whereDate('in_time', now()->toDateString());
            $this->applyBranch($attendance, 'attendances', $filters);
            $attendanceToday = $attendance->count();
        }

        $leaveToday = 0;
        if ($this->tableExists('leave_applications') && $this->hasColumn('leave_applications', 'leave_from') && $this->hasColumn('leave_applications', 'leave_to')) {
            $leave = DB::table('leave_applications')
                ->whereDate('leave_from', '<=', now()->toDateString())
                ->whereDate('leave_to', '>=', now()->toDateString());
            if ($this->hasColumn('leave_applications', 'status')) {
                $leave->whereIn('status', ['APPROVED', 'approved']);
            }
            $this->applyBranch($leave, 'leave_applications', $filters);
            $leaveToday = $leave->count();
        }

        if ($activeEmployees === 0 && $attendanceToday === 0 && $leaveToday === 0) {
            return null;
        }

        return [
            'key' => 'hrm',
            'title' => 'HRM',
            'href' => '/hrm/users',
            'items' => [
                ['label' => 'Active employees', 'value' => $activeEmployees],
                ['label' => 'Today attendance', 'value' => $attendanceToday],
                ['label' => 'On leave today', 'value' => $leaveToday],
                ['label' => 'Employee payables', 'value' => $this->employeePayableBalance($filters), 'format' => 'money'],
            ],
        ];
    }

    protected function projectSummary(array $filters): ?array
    {
        if (!$this->tableExists('projects')) {
            return null;
        }

        $projects = DB::table('projects');
        if ($this->hasColumn('projects', 'active')) {
            $projects->where('active', true);
        }
        if ($this->hasColumn('projects', 'status')) {
            $projects->whereIn('status', ['PENDING', 'IN_PROGRESS', 'ON_HOLD', 'pending', 'in_progress', 'on_hold']);
        }
        $activeProjects = $projects->count();

        $overdueProjectTasks = 0;
        if ($this->tableExists('tasks') && $this->hasColumn('tasks', 'project_id') && $this->hasColumn('tasks', 'end_date')) {
            $tasks = DB::table('tasks')
                ->join('projects', 'tasks.project_id', '=', 'projects.id')
                ->whereDate('tasks.end_date', '<', now()->toDateString());
            if ($this->hasColumn('tasks', 'active')) {
                $tasks->where('tasks.active', true);
            }
            if ($this->hasColumn('projects', 'status')) {
                $tasks->whereNotIn('projects.status', ['COMPLETED', 'CANCELLED', 'completed', 'cancelled']);
            }
            $overdueProjectTasks = $tasks->count();
        }

        if ($activeProjects === 0 && $overdueProjectTasks === 0) {
            return null;
        }

        return [
            'key' => 'projects',
            'title' => 'Projects',
            'href' => '/hrm/projects',
            'items' => [
                ['label' => 'Active projects', 'value' => $activeProjects],
                ['label' => 'Overdue project work', 'value' => $overdueProjectTasks],
            ],
        ];
    }

    protected function inventorySummary(array $filters): ?array
    {
        if (!$this->tableExists('products')) {
            return null;
        }

        $products = $this->activeProductsQuery();
        $totalProducts = $products->count();
        $lowStock = $this->lowStockCount();
        $valueColumn = $this->firstExistingColumn('products', ['inventory_value', 'stock_value']);
        $stockColumn = $this->firstExistingColumn('products', ['current_stock', 'stock', 'quantity', 'opening_stock']);
        $inventoryValue = 0.0;

        if ($valueColumn) {
            $inventoryValue = (float) DB::table('products')->sum($valueColumn);
        } elseif ($stockColumn && $this->hasColumn('products', 'purchase_price')) {
            $inventoryValue = (float) DB::table('products')->sum(DB::raw("COALESCE($stockColumn, 0) * COALESCE(purchase_price, 0)"));
        }

        if ($totalProducts === 0 && $lowStock === 0 && $inventoryValue == 0.0) {
            return null;
        }

        return [
            'key' => 'inventory',
            'title' => 'Inventory',
            'href' => '/inventory/products',
            'items' => [
                ['label' => 'Total products', 'value' => $totalProducts],
                ['label' => 'Low stock count', 'value' => $lowStock],
                ['label' => 'Inventory value', 'value' => $inventoryValue, 'format' => 'money'],
            ],
        ];
    }

    protected function baseTransactionQuery(array $config, array $filters): Builder
    {
        $query = DB::table($config['table'])->select($config['table'] . '.*');

        if ($this->hasColumn($config['table'], 'contact_id') && $this->tableExists('contacts')) {
            $query->leftJoin('contacts', $config['table'] . '.contact_id', '=', 'contacts.id')
                ->addSelect('contacts.name as party_name');
        }

        if ($this->hasColumn($config['table'], 'user_add_id') && $this->tableExists('users')) {
            $query->leftJoin('users', $config['table'] . '.user_add_id', '=', 'users.id')
                ->addSelect('users.name as created_by_name');
        }

        $this->applyBranch($query, $config['table'], $filters);
        $this->applyDateRange($query, $config['table'], $config['date'], $filters);

        return $query;
    }

    protected function formatTransactionRow(object $row, array $config, string $fallbackStatus): array
    {
        $date = $row->{$config['date']} ?? $row->created_at ?? null;
        return [
            'key' => $config['table'] . '-' . $row->id,
            'id' => $row->id,
            'type' => $config['type'],
            'module' => $config['module'],
            'draft_ref' => $row->{$config['number']} ?? $row->reference ?? substr((string) $row->id, 0, 8),
            'party' => $row->party_name ?? $row->account_name ?? '-',
            'date' => $date,
            'amount' => (float) ($row->{$config['amount']} ?? $row->total ?? 0),
            'created_by' => $row->created_by_name ?? '-',
            'age' => $date ? Carbon::parse($date)->diffInDays(now()) : null,
            'status' => $row->status ?? $fallbackStatus,
            'approved' => (bool) ($row->approved ?? false),
            'created_at' => $row->created_at ?? null,
            'action_url' => $config['route'] . '/' . $row->id,
        ];
    }

    protected function issue(string $type, array $config, object $row, string $severity): array
    {
        return [
            'key' => $type . '-' . $config['table'] . '-' . $row->id,
            'issue_type' => $type,
            'module' => $config['module'],
            'record' => $row->{$config['number']} ?? $row->reference ?? $row->id,
            'amount' => (float) ($row->{$config['amount']} ?? $row->total ?? 0),
            'date' => $row->{$config['date']} ?? $row->created_at ?? null,
            'severity' => $severity,
            'action_url' => $config['route'] . '/' . $row->id,
        ];
    }

    protected function approvedButJvMissingCount(array $filters): int
    {
        return collect($this->transactionTables)
            ->reject(fn($config) => $config['table'] === 'journal_vouchers')
            ->sum(fn($config) => $this->approvedButJvMissingQuery($config, $filters)?->count() ?? 0);
    }

    protected function approvedButJvMissingRows(array $config, array $filters, int $limit)
    {
        return $this->approvedButJvMissingQuery($config, $filters)?->limit($limit)->get() ?? collect();
    }

    protected function approvedButJvMissingQuery(array $config, array $filters): ?Builder
    {
        if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'approved')) {
            return null;
        }

        $query = DB::table($config['table'])->where('approved', true);
        $this->applyBranch($query, $config['table'], $filters);

        if ($this->hasColumn($config['table'], 'journal_voucher_id')) {
            return $query->whereNull('journal_voucher_id');
        }

        if ($this->tableExists('journal_vouchers') && $this->hasColumn('journal_vouchers', 'source_type')) {
            $sourceType = str_replace(' ', '', $config['type']);
            $query->whereNotExists(function ($sub) use ($config, $sourceType) {
                $sub->select(DB::raw(1))
                    ->from('journal_vouchers')
                    ->whereColumn('journal_vouchers.source_id', $config['table'] . '.id')
                    ->where('journal_vouchers.source_type', $sourceType);
            });
        }

        return $query;
    }

    protected function approvedButNumberMissingCount(array $filters): int
    {
        return collect($this->transactionTables)->sum(fn($config) => $this->approvedButNumberMissingQuery($config, $filters)?->count() ?? 0);
    }

    protected function approvedButNumberMissingRows(array $config, array $filters, int $limit)
    {
        return $this->approvedButNumberMissingQuery($config, $filters)?->limit($limit)->get() ?? collect();
    }

    protected function approvedButNumberMissingQuery(array $config, array $filters): ?Builder
    {
        if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'approved') || !$this->hasColumn($config['table'], $config['number'])) {
            return null;
        }

        $query = DB::table($config['table'])
            ->where('approved', true)
            ->where(function ($query) use ($config) {
                $query->whereNull($config['number'])->orWhere($config['number'], '');
            });
        $this->applyBranch($query, $config['table'], $filters);

        return $query;
    }

    protected function sourceWithMissingJvRows(array $config, array $filters, int $limit)
    {
        if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'journal_voucher_id') || !$this->tableExists('journal_vouchers')) {
            return collect();
        }

        $query = DB::table($config['table'])
            ->leftJoin('journal_vouchers', $config['table'] . '.journal_voucher_id', '=', 'journal_vouchers.id')
            ->whereNotNull($config['table'] . '.journal_voucher_id')
            ->whereNull('journal_vouchers.id')
            ->select($config['table'] . '.*')
            ->limit($limit);
        $this->applyBranch($query, $config['table'], $filters);

        return $query->get();
    }

    protected function journalVoucherNullCount(array $filters): int
    {
        return collect($this->transactionTables)
            ->reject(fn($config) => $config['table'] === 'journal_vouchers')
            ->sum(function ($config) use ($filters) {
                if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'journal_voucher_id')) {
                    return 0;
                }

                $query = DB::table($config['table'])->whereNull('journal_voucher_id');
                $this->applyBranch($query, $config['table'], $filters);
                return $query->count();
            });
    }

    protected function unbalancedJournalVouchers(array $filters)
    {
        if (!$this->tableExists('journal_vouchers') || !$this->tableExists('journal_voucher_lines')) {
            return collect();
        }

        $query = DB::table('journal_vouchers')
            ->join('journal_voucher_lines', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->select('journal_vouchers.id', 'journal_vouchers.voucher_no', 'journal_vouchers.voucher_date', DB::raw('SUM(journal_voucher_lines.debit) as debit_total'), DB::raw('SUM(journal_voucher_lines.credit) as credit_total'))
            ->groupBy('journal_vouchers.id', 'journal_vouchers.voucher_no', 'journal_vouchers.voucher_date')
            ->havingRaw('ABS(SUM(journal_voucher_lines.debit) - SUM(journal_voucher_lines.credit)) > 0.01')
            ->limit(20);
        $this->applyBranch($query, 'journal_vouchers', $filters);

        return $query->get();
    }

    protected function jvWithNoLines(array $filters)
    {
        if (!$this->tableExists('journal_vouchers') || !$this->tableExists('journal_voucher_lines')) {
            return collect();
        }

        $query = DB::table('journal_vouchers')
            ->leftJoin('journal_voucher_lines', 'journal_vouchers.id', '=', 'journal_voucher_lines.journal_voucher_id')
            ->select('journal_vouchers.*')
            ->whereNull('journal_voucher_lines.id')
            ->limit(20);
        $this->applyBranch($query, 'journal_vouchers', $filters);

        return $query->get();
    }

    protected function autoJvCreatedToday(array $filters): int
    {
        if (!$this->tableExists('journal_vouchers') || !$this->hasColumn('journal_vouchers', 'is_auto_generated')) {
            return 0;
        }
        $query = DB::table('journal_vouchers')->where('is_auto_generated', true)->whereDate('created_at', now()->toDateString());
        $this->applyBranch($query, 'journal_vouchers', $filters);
        return $query->count();
    }

    protected function voidedThisMonth(array $filters): int
    {
        return collect($this->transactionTables)->sum(function ($config) use ($filters) {
            if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], 'voided_at')) {
                return 0;
            }
            $query = DB::table($config['table'])->whereBetween('voided_at', [now()->startOfMonth(), now()->endOfMonth()]);
            $this->applyBranch($query, $config['table'], $filters);
            return $query->count();
        });
    }

    protected function reversalJvsThisMonth(array $filters): int
    {
        if (!$this->tableExists('journal_vouchers') || !$this->hasColumn('journal_vouchers', 'reversed_journal_voucher_id')) {
            return 0;
        }
        $query = DB::table('journal_vouchers')->whereNotNull('reversed_journal_voucher_id')->whereBetween('created_at', [now()->startOfMonth(), now()->endOfMonth()]);
        $this->applyBranch($query, 'journal_vouchers', $filters);
        return $query->count();
    }

    protected function countApproved(string $table, string $dateColumn, array $filters, ?string $from = null, ?string $to = null): int
    {
        if (!$this->tableExists($table)) {
            return 0;
        }
        $query = DB::table($table);
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);
        if ($from && $to && $this->hasColumn($table, $dateColumn)) {
            $query->whereDate($dateColumn, '>=', $from)
                ->whereDate($dateColumn, '<=', $to);
        }
        return $query->count();
    }

    protected function overdueSum(string $table, string $dateColumn, string $balanceColumn, array $filters): float
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $dateColumn) || !$this->hasColumn($table, $balanceColumn)) {
            return 0;
        }
        $query = DB::table($table)->whereDate($dateColumn, '<', now())->where($balanceColumn, '>', 0);
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);
        return (float) $query->sum($balanceColumn);
    }

    protected function periodSum(string $table, string $amountColumn, string $dateColumn, array $filters, Carbon $from, Carbon $to): float
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $amountColumn) || !$this->hasColumn($table, $dateColumn)) {
            return 0;
        }
        $query = DB::table($table)
            ->whereDate($dateColumn, '>=', $from->toDateString())
            ->whereDate($dateColumn, '<=', $to->toDateString());
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);
        return (float) $query->sum($amountColumn);
    }

    protected function biggestInflowSource(array $filters, Carbon $from, Carbon $to): ?string
    {
        if (!$this->tableExists('customer_payments') || !$this->tableExists('contacts') || !$this->hasColumn('customer_payments', 'contact_id')) {
            return null;
        }
        $query = DB::table('customer_payments')
            ->join('contacts', 'customer_payments.contact_id', '=', 'contacts.id')
            ->select('contacts.name', DB::raw('SUM(customer_payments.amount) as total'))
            ->whereDate('customer_payments.payment_date', '>=', $from->toDateString())
            ->whereDate('customer_payments.payment_date', '<=', $to->toDateString())
            ->groupBy('contacts.id', 'contacts.name')
            ->orderByDesc('total');
        $this->applyDashboardRecordScope($query, 'customer_payments', true);
        $row = $query->first();
        return $row?->name;
    }

    protected function biggestOutflowSource(array $filters, Carbon $from, Carbon $to): ?string
    {
        $supplierRow = null;
        if ($this->tableExists('supplier_payments') && $this->tableExists('contacts') && $this->hasColumn('supplier_payments', 'contact_id')) {
            $query = DB::table('supplier_payments')
                ->join('contacts', 'supplier_payments.contact_id', '=', 'contacts.id')
                ->select('contacts.name', DB::raw('SUM(supplier_payments.amount) as total'))
                ->whereDate('supplier_payments.payment_date', '>=', $from->toDateString())
                ->whereDate('supplier_payments.payment_date', '<=', $to->toDateString())
                ->groupBy('contacts.id', 'contacts.name')
                ->orderByDesc('total');
            $this->applyDashboardRecordScope($query, 'supplier_payments', true);
            $supplierRow = $query->first();
        }

        $supplierTotal = (float) ($supplierRow->total ?? 0);
        $directExpenses = $this->directExpenseCashOut($filters, $from->toDateString(), $to->toDateString());

        if ($directExpenses > $supplierTotal) {
            return 'Direct expenses';
        }

        return $supplierRow?->name;
    }

    protected function periodRevenue(array $filters, string $from, string $to): float
    {
        return $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $from, $to)
            - $this->sumApproved('sales_returns', 'total', 'sales_return_date', $filters, $from, $to);
    }

    protected function periodPurchases(array $filters, string $from, string $to): float
    {
        return $this->sumApproved('purchase_bills', 'total', 'bill_date', $filters, $from, $to)
            - $this->sumApproved('debit_notes', 'total', 'debit_note_date', $filters, $from, $to);
    }

    protected function periodExpenses(array $filters, string $from, string $to): float
    {
        return $this->periodPurchases($filters, $from, $to)
            + $this->sumApproved('expenses', 'total', 'expense_date', $filters, $from, $to);
    }

    protected function payableBalance(array $filters): float
    {
        $linkedAccountPayables = $this->supplierPayableBalance($filters)
            + $this->employeePayableBalance($filters);

        if ($linkedAccountPayables > 0) {
            return $linkedAccountPayables;
        }

        return $this->sumApproved('purchase_bills', 'balance_due', 'bill_date', $filters)
            + $this->expensePayableBalance($filters);
    }

    protected function expensePayableBalance(array $filters, ?string $from = null, ?string $to = null, string $dateColumn = 'due_date'): float
    {
        if (!$this->tableExists('expenses') || !$this->hasColumn('expenses', 'total')) {
            return 0.0;
        }

        $query = DB::table('expenses')->where('total', '>', 0);
        $this->applyDashboardRecordScope($query, 'expenses', true);
        $this->applyBranch($query, 'expenses', $filters);

        if ($this->hasColumn('expenses', 'contact_id')) {
            $query->whereNotNull('contact_id');
        }

        if ($from && $to && $this->hasColumn('expenses', $dateColumn)) {
            $query->whereDate($dateColumn, '>=', $from)
                ->whereDate($dateColumn, '<=', $to);
        }

        return (float) $query->sum('total');
    }

    protected function directExpenseCashOut(array $filters, string $from, string $to): float
    {
        if (!$this->tableExists('expenses') || !$this->hasColumn('expenses', 'total') || !$this->hasColumn('expenses', 'expense_date')) {
            return 0.0;
        }

        $query = DB::table('expenses')
            ->where('total', '>', 0)
            ->whereDate('expense_date', '>=', $from)
            ->whereDate('expense_date', '<=', $to);
        $this->applyDashboardRecordScope($query, 'expenses', true);
        $this->applyBranch($query, 'expenses', $filters);

        if ($this->hasColumn('expenses', 'contact_id')) {
            $query->whereNull('contact_id');
        }

        return (float) $query->sum('total');
    }

    protected function upcomingPayables(array $filters, string $from, string $to): float
    {
        return $this->sumApproved('purchase_bills', 'balance_due', 'due_date', $filters, $from, $to)
            + $this->expensePayableBalance($filters, $from, $to, 'due_date');
    }

    protected function periodCashIn(array $filters, Carbon $from, Carbon $to): float
    {
        return $this->periodSum('customer_payments', 'amount', 'payment_date', $filters, $from, $to);
    }

    protected function periodCashOut(array $filters, Carbon $from, Carbon $to): float
    {
        return $this->periodSum('supplier_payments', 'amount', 'payment_date', $filters, $from, $to)
            + $this->directExpenseCashOut($filters, $from->toDateString(), $to->toDateString());
    }

    protected function paidAmountFor(string $table, string $dateColumn, array $filters, string $from, string $to): float
    {
        if ($this->hasColumn($table, 'paid_total')) {
            return $this->sumApproved($table, 'paid_total', $dateColumn, $filters, $from, $to);
        }

        return max(0, $this->sumApproved($table, 'total', $dateColumn, $filters, $from, $to)
            - $this->sumApproved($table, 'balance_due', $dateColumn, $filters, $from, $to));
    }

    protected function dailyRevenue(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->combineDailySums([
            $this->dailySums('invoices', 'total', 'invoice_date', $filters, $from, $to),
            $this->negateDailySums($this->dailySums('sales_returns', 'total', 'sales_return_date', $filters, $from, $to)),
        ]);
    }

    protected function dailyExpenses(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->combineDailySums([
            $this->dailySums('purchase_bills', 'total', 'bill_date', $filters, $from, $to),
            $this->negateDailySums($this->dailySums('debit_notes', 'total', 'debit_note_date', $filters, $from, $to)),
            $this->dailySums('expenses', 'total', 'expense_date', $filters, $from, $to),
        ]);
    }

    protected function dailyCashIn(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->dailySums('customer_payments', 'amount', 'payment_date', $filters, $from, $to);
    }

    protected function dailyPayables(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->combineDailySums([
            $this->dailySums('purchase_bills', 'balance_due', 'bill_date', $filters, $from, $to),
            $this->dailyExpensePayables($filters, $from, $to),
        ]);
    }

    protected function dailyExpensePayables(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->dailyExpenseSums($filters, $from, $to, true);
    }

    protected function dailyDirectExpenseCashOut(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->dailyExpenseSums($filters, $from, $to, false);
    }

    protected function dailyExpenseSums(array $filters, Carbon $from, Carbon $to, bool $requiresContact): array
    {
        if (!$this->tableExists('expenses') || !$this->hasColumn('expenses', 'total') || !$this->hasColumn('expenses', 'expense_date')) {
            return [];
        }

        $query = DB::table('expenses')
            ->select(DB::raw('DATE(expense_date) as day'), DB::raw('SUM(total) as amount'))
            ->where('total', '>', 0)
            ->whereDate('expense_date', '>=', $from->toDateString())
            ->whereDate('expense_date', '<=', $to->toDateString())
            ->groupBy(DB::raw('DATE(expense_date)'));
        $this->applyDashboardRecordScope($query, 'expenses', true);
        $this->applyBranch($query, 'expenses', $filters);

        if ($this->hasColumn('expenses', 'contact_id')) {
            $requiresContact ? $query->whereNotNull('contact_id') : $query->whereNull('contact_id');
        }

        return $query->pluck('amount', 'day')->map(fn($v) => (float) $v)->all();
    }

    protected function dailyCashOut(array $filters, Carbon $from, Carbon $to): array
    {
        return $this->combineDailySums([
            $this->dailySums('supplier_payments', 'amount', 'payment_date', $filters, $from, $to),
            $this->dailyDirectExpenseCashOut($filters, $from, $to),
        ]);
    }

    protected function negateDailySums(array $sums): array
    {
        return collect($sums)
            ->map(fn($value) => -1 * (float) $value)
            ->all();
    }

    protected function combineDailySums(array $series): array
    {
        $combined = [];

        foreach ($series as $items) {
            foreach ($items as $date => $amount) {
                $combined[$date] = (float) ($combined[$date] ?? 0) + (float) $amount;
            }
        }

        return $combined;
    }

    protected function sumApproved(string $table, string $amountColumn, string $dateColumn, array $filters, ?string $from = null, ?string $to = null): float
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $amountColumn)) {
            return 0;
        }
        $query = DB::table($table);
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);
        if ($from && $to && $this->hasColumn($table, $dateColumn)) {
            $query->whereDate($dateColumn, '>=', $from)
                ->whereDate($dateColumn, '<=', $to);
        }
        return (float) $query->sum($amountColumn);
    }

    protected function dailySums(string $table, string $amount, string $date, array $filters, Carbon $from, Carbon $to): array
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $amount) || !$this->hasColumn($table, $date)) {
            return [];
        }
        $query = DB::table($table)
            ->select(DB::raw("DATE($date) as day"), DB::raw("SUM($amount) as amount"))
            ->whereDate($date, '>=', $from->toDateString())
            ->whereDate($date, '<=', $to->toDateString())
            ->groupBy(DB::raw("DATE($date)"));
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);

        return $query->pluck('amount', 'day')->all();
    }

    protected function linkedBankAccountBalance(array $filters, string $type): float
    {
        $query = BankAccount::query()
            ->where('type', $type)
            ->where('active', true)
            ->whereNotNull('account_id')
            ->whereHas('account', function ($query) {
                $query->where('active', true);
            })
            ->with('account');

        if (!empty($filters['branch_id']) && $filters['branch_id'] !== 'all') {
            $query->where('branch_id', $filters['branch_id']);
        }

        return round(
            (float) $query->get()->sum(fn($bankAccount) => $bankAccount->account?->balance ?? 0),
            2
        );
    }

    protected function customerReceivableBalance(array $filters): float
    {
        $balance = $this->contactAccountBalance($filters, 'customer');

        if ($balance > 0) {
            return $balance;
        }

        return $this->sumApproved('invoices', 'balance_due', 'invoice_date', $filters);
    }

    protected function supplierPayableBalance(array $filters): float
    {
        return $this->contactAccountBalance($filters, 'supplier');
    }

    protected function employeePayableBalance(array $filters): float
    {
        if (
            $this->tableExists('users')
            && $this->tableExists('accounts')
            && $this->hasColumn('users', 'payroll_account_id')
            && $this->hasColumn('accounts', 'balance')
        ) {
            $query = DB::table('users')
                ->join('accounts', 'users.payroll_account_id', '=', 'accounts.id')
                ->whereNotNull('users.payroll_account_id');

            if ($this->hasColumn('users', 'active')) {
                $query->where('users.active', true);
            }
            if ($this->hasColumn('accounts', 'active')) {
                $query->where('accounts.active', true);
            }
            $this->applyBranch($query, 'users', $filters);

            return round((float) $query
                ->selectRaw('COALESCE(SUM(CASE WHEN accounts.balance < 0 THEN accounts.balance * -1 ELSE 0 END), 0) as total')
                ->value('total'), 2);
        }

        return $this->payslipPayableBalance($filters);
    }

    protected function payslipPayableBalance(array $filters): float
    {
        if (!$this->tableExists('payslips')) {
            return 0.0;
        }

        $amountColumn = $this->firstExistingColumn('payslips', ['net_payable', 'total_payable', 'salary_payable']);
        if (!$amountColumn) {
            return 0.0;
        }

        $query = DB::table('payslips');
        $this->applyBranch($query, 'payslips', $filters);

        if ($this->hasColumn('payslips', 'active')) {
            $query->where('active', true);
        }

        if ($this->hasColumn('payslips', 'status')) {
            $query->whereNotIn('status', ['void', 'voided', 'cancelled', 'rejected', 'VOID', 'VOIDED', 'CANCELLED', 'REJECTED']);
        }

        if ($this->hasColumn('payslips', 'payment_status')) {
            $query->whereIn('payment_status', ['UNPAID', 'PARTIAL', 'unpaid', 'partial']);
        }

        $grossPayable = (float) $query->sum($amountColumn);

        if (!$this->tableExists('payroll_payments') || !$this->hasColumn('payroll_payments', 'amount')) {
            return round(max(0, $grossPayable), 2);
        }

        $paid = DB::table('payroll_payments')
            ->when($this->hasColumn('payroll_payments', 'status'), function (Builder $query) {
                $query->whereNotIn('status', ['cancelled', 'failed', 'void', 'voided', 'CANCELLED', 'FAILED', 'VOID', 'VOIDED']);
            })
            ->when(!empty($filters['branch_id']) && $this->hasColumn('payroll_payments', 'payroll_run_id') && $this->tableExists('payroll_runs') && $this->hasColumn('payroll_runs', 'branch_id'), function (Builder $query) use ($filters) {
                $query->join('payroll_runs', 'payroll_payments.payroll_run_id', '=', 'payroll_runs.id')
                    ->where('payroll_runs.branch_id', $filters['branch_id']);
            })
            ->sum('payroll_payments.amount');

        return round(max(0, $grossPayable - (float) $paid), 2);
    }

    protected function contactAccountBalance(array $filters, string $partyType): float
    {
        if (!$this->tableExists('contacts') || !$this->tableExists('accounts') || !$this->hasColumn('contacts', 'account_id') || !$this->hasColumn('accounts', 'balance')) {
            return 0.0;
        }

        $query = DB::table('contacts')
            ->join('accounts', 'contacts.account_id', '=', 'accounts.id')
            ->whereNotNull('contacts.account_id');

        if ($this->hasColumn('contacts', 'active')) {
            $query->where('contacts.active', true);
        }
        if ($this->hasColumn('accounts', 'active')) {
            $query->where('accounts.active', true);
        }

        if ($partyType === 'customer') {
            $query->where(function (Builder $query) {
                if ($this->hasColumn('contacts', 'contact_type')) {
                    $query->whereIn('contacts.contact_type', ['customer', 'Customer', 'CUSTOMER', 'client', 'Client', 'CLIENT', 'both', 'Both', 'BOTH']);
                }

                if (!$this->hasColumn('contacts', 'contact_type') && $this->hasColumn('contacts', 'accept_purchase')) {
                    $query->where(function (Builder $query) {
                        $query->where('contacts.accept_purchase', false)
                            ->orWhereNull('contacts.accept_purchase');
                    });
                }
            });

            $select = 'COALESCE(SUM(CASE WHEN accounts.balance > 0 THEN accounts.balance ELSE 0 END), 0) as total';
        } else {
            $query->where(function (Builder $query) {
                if ($this->hasColumn('contacts', 'contact_type')) {
                    $query->whereIn('contacts.contact_type', ['supplier', 'Supplier', 'SUPPLIER', 'vendor', 'Vendor', 'VENDOR', 'both', 'Both', 'BOTH']);
                }

                if ($this->hasColumn('contacts', 'accept_purchase')) {
                    $query->orWhere('contacts.accept_purchase', true);
                }
            });

            $select = 'COALESCE(SUM(CASE WHEN accounts.balance < 0 THEN accounts.balance * -1 ELSE 0 END), 0) as total';
        }

        $this->applyBranch($query, 'contacts', $filters);

        return round((float) $query->selectRaw($select)->value('total'), 2);
    }

    protected function cashBankBalance(array $filters): float
    {
        return $this->bankBalance($filters) + $this->cashInHand($filters);
    }

    protected function bankBalance(array $filters): float
    {
        return $this->linkedBankAccountBalance($filters, 'bank');
    }

    protected function cashInHand(array $filters): float
    {
        return $this->linkedBankAccountBalance($filters, 'cash');
    }

    protected function countTable(string $table, string $dateColumn, array $filters): int
    {
        if (!$this->tableExists($table)) {
            return 0;
        }
        $query = DB::table($table);
        $this->applyDashboardRecordScope($query, $table);
        $this->applyBranch($query, $table, $filters);
        $this->applyDateRange($query, $table, $dateColumn, $filters);
        return $query->count();
    }

    protected function pendingCount(string $table): int
    {
        if (!$this->tableExists($table)) {
            return 0;
        }
        $query = DB::table($table);
        if ($this->hasColumn($table, 'approved')) {
            $query->where('approved', false);
        } elseif ($this->hasColumn($table, 'status')) {
            $query->whereIn('status', ['draft', 'pending']);
        }
        return $query->count();
    }

    protected function lowStockCount(): int
    {
        if (!$this->tableExists('products') || !$this->hasColumn('products', 'reorder_level')) {
            return 0;
        }
        $stockColumn = $this->firstExistingColumn('products', ['current_stock', 'stock', 'quantity', 'opening_stock']);
        if (!$stockColumn) {
            return 0;
        }
        $query = $this->activeProductsQuery();
        return $query->whereColumn($stockColumn, '<=', 'reorder_level')->count();
    }

    protected function overdueCount(string $table, string $dateColumn, string $balanceColumn, array $filters, bool $past = true): int
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $dateColumn)) {
            return 0;
        }
        $query = DB::table($table);
        $this->applyDashboardRecordScope($query, $table);
        $past ? $query->whereDate($dateColumn, '<', now()) : $query->whereBetween($dateColumn, [now(), now()->addDays(14)]);
        if ($this->hasColumn($table, $balanceColumn)) {
            $query->where($balanceColumn, '>', 0);
        }
        $this->applyBranch($query, $table, $filters);
        return $query->count();
    }

    protected function topParties(string $table, string $dateColumn, string $amountColumn, array $filters): array
    {
        if (!$this->tableExists($table) || !$this->tableExists('contacts') || !$this->hasColumn($table, 'contact_id') || !$this->hasColumn($table, $amountColumn) || !$this->hasColumn('contacts', 'name')) {
            return [];
        }
        $query = DB::table($table)
            ->join('contacts', $table . '.contact_id', '=', 'contacts.id')
            ->select('contacts.name', DB::raw("SUM($table.$amountColumn) as amount"))
            ->groupBy('contacts.id', 'contacts.name')
            ->orderByDesc('amount')
            ->limit(5);
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);
        $this->applyDateRange($query, $table, $dateColumn, $filters);

        return $query->get()->map(fn($row) => ['name' => $row->name, 'amount' => (float) $row->amount])->all();
    }

    protected function whereCount(string $table, string $column, string $value): int
    {
        return $this->tableExists($table) && $this->hasColumn($table, $column) ? DB::table($table)->where($column, $value)->count() : 0;
    }

    protected function sumWhere(string $table, string $amount, string $column, string $value): float
    {
        return $this->tableExists($table) && $this->hasColumn($table, $amount) && $this->hasColumn($table, $column) ? (float) DB::table($table)->where($column, $value)->sum($amount) : 0;
    }

    protected function dateDueCount(string $table, string $column, Carbon $from, Carbon $to): int
    {
        return $this->tableExists($table) && $this->hasColumn($table, $column) ? DB::table($table)->whereBetween($column, [$from, $to])->count() : 0;
    }

    protected function overdueActivities(): int
    {
        if (!$this->tableExists('crm_activities') || !$this->hasColumn('crm_activities', 'due_at')) {
            return 0;
        }
        $query = DB::table('crm_activities')->where('due_at', '<', now());
        if ($this->hasColumn('crm_activities', 'completed_at')) {
            $query->whereNull('completed_at');
        }
        return $query->count();
    }

    protected function monthlyDealCount(string $status): int
    {
        return $this->tableExists('deals') && $this->hasColumn('deals', 'status') && $this->hasColumn('deals', 'updated_at')
            ? DB::table('deals')->where('status', $status)->whereBetween('updated_at', [now()->startOfMonth(), now()->endOfMonth()])->count()
            : 0;
    }

    protected function pipeline(): array
    {
        $defaultStages = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
        if (!$this->tableExists('deal_stages') || !$this->tableExists('deals') || !$this->hasColumn('deals', 'deal_stage_id') || !$this->hasColumn('deal_stages', 'name')) {
            return collect($defaultStages)->map(fn($stage) => ['stage' => $stage, 'count' => 0, 'amount' => 0])->all();
        }

        $query = DB::table('deal_stages')
            ->leftJoin('deals', 'deal_stages.id', '=', 'deals.deal_stage_id')
            ->select('deal_stages.name as stage', DB::raw('COUNT(deals.id) as count'), DB::raw('COALESCE(SUM(deals.amount), 0) as amount'))
            ->groupBy('deal_stages.id', 'deal_stages.name');
        if ($this->hasColumn('deal_stages', 'sort_order')) {
            $query->addSelect('deal_stages.sort_order')->groupBy('deal_stages.sort_order')->orderBy('deal_stages.sort_order');
        } else {
            $query->orderBy('deal_stages.name');
        }

        return $query->get()
            ->map(fn($row) => ['stage' => $row->stage, 'count' => (int) $row->count, 'amount' => (float) $row->amount])
            ->all();
    }

    protected function crmFollowups(): array
    {
        if (!$this->tableExists('crm_activities') || !$this->hasColumn('crm_activities', 'due_at')) {
            return [];
        }

        $query = DB::table('crm_activities')->select('crm_activities.*');
        if ($this->tableExists('leads') && $this->hasColumn('crm_activities', 'lead_id')) {
            $query->leftJoin('leads', 'crm_activities.lead_id', '=', 'leads.id')->addSelect('leads.name as lead_name');
        } else {
            $query->addSelect(DB::raw('NULL as lead_name'));
        }
        if ($this->tableExists('deals') && $this->hasColumn('crm_activities', 'deal_id')) {
            $query->leftJoin('deals', 'crm_activities.deal_id', '=', 'deals.id')->addSelect('deals.title as deal_title', 'deals.amount as deal_amount');
        } else {
            $query->addSelect(DB::raw('NULL as deal_title'), DB::raw('0 as deal_amount'));
        }
        if ($this->tableExists('contacts') && $this->hasColumn('crm_activities', 'contact_id')) {
            $query->leftJoin('contacts', 'crm_activities.contact_id', '=', 'contacts.id')->addSelect('contacts.name as contact_name');
        } else {
            $query->addSelect(DB::raw('NULL as contact_name'));
        }
        if ($this->tableExists('users') && $this->hasColumn('crm_activities', 'assigned_to_id')) {
            $query->leftJoin('users', 'crm_activities.assigned_to_id', '=', 'users.id')->addSelect('users.name as assigned_to');
        } else {
            $query->addSelect(DB::raw('NULL as assigned_to'));
        }
        if ($this->hasColumn('crm_activities', 'completed_at')) {
            $query->whereNull('crm_activities.completed_at');
        }

        return $query->where('crm_activities.due_at', '<=', now()->endOfDay())
            ->orderBy('crm_activities.due_at')
            ->limit(15)
            ->get()
            ->map(fn($row) => [
                'key' => $row->id,
                'name' => $row->deal_title ?: $row->lead_name ?: $row->subject,
                'contact' => $row->contact_name,
                'stage' => $row->status,
                'amount' => (float) ($row->deal_amount ?? 0),
                'assigned_to' => $row->assigned_to,
                'next_follow_up' => $row->due_at,
                'action_url' => '/crm/activities/' . $row->id,
            ])
            ->all();
    }

    protected function cashFlowForecast(array $filters): array
    {
        $opening = $this->cashBankBalance($filters);
        $closing = $opening;
        $rows = [];

        foreach ([0, 7, 14, 21, 30] as $offset) {
            $from = $offset === 0 ? now()->toDateString() : now()->addDays($offset - 6)->toDateString();
            $to = now()->addDays($offset)->toDateString();
            $receivables = $this->sumApproved('invoices', 'balance_due', 'due_date', $filters, $from, $to);
            $payables = $this->upcomingPayables($filters, $from, $to);
            $closing += $receivables - $payables;
            $rows[] = [
                'date' => $to,
                'cash_in' => $receivables,
                'cash_out' => $payables,
                'projected_cash' => $closing,
            ];
        }

        return $rows;
    }

    protected function ageingBuckets(string $table, string $dateColumn, string $balanceColumn, array $filters, string $route): array
    {
        $labels = [
            'Current' => ['amount' => 0.0, 'count' => 0],
            '1-30' => ['amount' => 0.0, 'count' => 0],
            '31-60' => ['amount' => 0.0, 'count' => 0],
            '61-90' => ['amount' => 0.0, 'count' => 0],
            '90+' => ['amount' => 0.0, 'count' => 0],
        ];

        if (!$this->tableExists($table) || !$this->hasColumn($table, $dateColumn) || !$this->hasColumn($table, $balanceColumn)) {
            return $this->formatAgeingBuckets($labels, $route);
        }

        $query = DB::table($table)
            ->select('id', $dateColumn, $balanceColumn)
            ->where($balanceColumn, '>', 0);
        $this->applyDashboardRecordScope($query, $table, true);
        $this->applyBranch($query, $table, $filters);

        foreach ($query->get() as $row) {
            $bucket = 'Current';
            if (!empty($row->{$dateColumn})) {
                $days = Carbon::parse($row->{$dateColumn})->startOfDay()->diffInDays(now()->startOfDay(), false);
                $bucket = $days <= 0 ? 'Current' : ($days <= 30 ? '1-30' : ($days <= 60 ? '31-60' : ($days <= 90 ? '61-90' : '90+')));
            }
            $labels[$bucket]['amount'] += (float) $row->{$balanceColumn};
            $labels[$bucket]['count']++;
        }

        return $this->formatAgeingBuckets($labels, $route);
    }

    protected function expenseAgeingBuckets(array $filters): array
    {
        $labels = [
            'Current' => ['amount' => 0.0, 'count' => 0],
            '1-30' => ['amount' => 0.0, 'count' => 0],
            '31-60' => ['amount' => 0.0, 'count' => 0],
            '61-90' => ['amount' => 0.0, 'count' => 0],
            '90+' => ['amount' => 0.0, 'count' => 0],
        ];

        if (!$this->tableExists('expenses') || !$this->hasColumn('expenses', 'total')) {
            return $this->formatAgeingBuckets($labels, '/payment-out/expenses');
        }

        $query = DB::table('expenses')
            ->select('id', 'due_date', 'expense_date', 'total')
            ->where('total', '>', 0);
        $this->applyDashboardRecordScope($query, 'expenses', true);
        $this->applyBranch($query, 'expenses', $filters);

        if ($this->hasColumn('expenses', 'contact_id')) {
            $query->whereNotNull('contact_id');
        }

        foreach ($query->get() as $row) {
            $date = $row->due_date ?: $row->expense_date;
            $bucket = 'Current';
            if (!empty($date)) {
                $days = Carbon::parse($date)->startOfDay()->diffInDays(now()->startOfDay(), false);
                $bucket = $days <= 0 ? 'Current' : ($days <= 30 ? '1-30' : ($days <= 60 ? '31-60' : ($days <= 90 ? '61-90' : '90+')));
            }
            $labels[$bucket]['amount'] += (float) $row->total;
            $labels[$bucket]['count']++;
        }

        return $this->formatAgeingBuckets($labels, '/payment-out/expenses');
    }

    protected function combineAgeingBuckets(array $bucketSets): array
    {
        $combined = [
            'Current' => ['amount' => 0.0, 'count' => 0, 'action_url' => '/payment-out/purchase-bills'],
            '1-30' => ['amount' => 0.0, 'count' => 0, 'action_url' => '/payment-out/purchase-bills'],
            '31-60' => ['amount' => 0.0, 'count' => 0, 'action_url' => '/payment-out/purchase-bills'],
            '61-90' => ['amount' => 0.0, 'count' => 0, 'action_url' => '/payment-out/purchase-bills'],
            '90+' => ['amount' => 0.0, 'count' => 0, 'action_url' => '/payment-out/purchase-bills'],
        ];

        foreach ($bucketSets as $buckets) {
            foreach ($buckets as $bucket) {
                $key = $bucket['bucket'] ?? null;
                if (!$key || !isset($combined[$key])) {
                    continue;
                }
                $combined[$key]['amount'] += (float) ($bucket['amount'] ?? 0);
                $combined[$key]['count'] += (int) ($bucket['count'] ?? 0);
            }
        }

        return collect($combined)
            ->map(fn($values, $bucket) => [
                'bucket' => $bucket,
                'amount' => round((float) $values['amount'], 2),
                'count' => (int) $values['count'],
                'action_url' => $values['action_url'],
            ])
            ->values()
            ->all();
    }

    protected function expenseDueCount(array $filters, string $from, string $to): int
    {
        if (!$this->tableExists('expenses') || !$this->hasColumn('expenses', 'due_date')) {
            return 0;
        }

        $query = DB::table('expenses')
            ->where('total', '>', 0)
            ->whereDate('due_date', '>=', $from)
            ->whereDate('due_date', '<=', $to);
        $this->applyDashboardRecordScope($query, 'expenses', true);
        $this->applyBranch($query, 'expenses', $filters);

        if ($this->hasColumn('expenses', 'contact_id')) {
            $query->whereNotNull('contact_id');
        }

        return $query->count();
    }

    protected function formatAgeingBuckets(array $buckets, string $route): array
    {
        return collect($buckets)
            ->map(fn($values, $bucket) => [
                'bucket' => $bucket,
                'amount' => round((float) $values['amount'], 2),
                'count' => (int) $values['count'],
                'action_url' => $route,
            ])
            ->values()
            ->all();
    }

    protected function filterStart(array $filters, Carbon $fallback): Carbon
    {
        return !empty($filters['date_from']) ? Carbon::parse($filters['date_from'])->startOfDay() : $fallback->copy()->startOfDay();
    }

    protected function filterEnd(array $filters, Carbon $fallback): Carbon
    {
        return !empty($filters['date_to']) ? Carbon::parse($filters['date_to'])->endOfDay() : $fallback->copy()->endOfDay();
    }

    protected function activeProductsQuery(): Builder
    {
        $query = DB::table('products');
        if ($this->hasColumn('products', 'active')) {
            $query->where('active', true);
        }

        return $query;
    }

    protected function businessHealthMessage(int $score, float $profit, float $cash, float $overdueReceivables): string
    {
        if ($score >= 85) {
            return 'Healthy cash, clean books, and no major blockers in the current view.';
        }
        if ($cash < 0) {
            return 'Cash needs attention before the next payable cycle.';
        }
        if ($profit < 0) {
            return 'Revenue is not covering expenses in the selected period.';
        }
        if ($overdueReceivables > 0) {
            return 'Collections are the biggest lever today.';
        }

        return 'A few operational items need review today.';
    }

    protected function weeklyLeadCount(): int
    {
        return $this->tableExists('leads') && $this->hasColumn('leads', 'created_at')
            ? DB::table('leads')->where('created_at', '>=', now()->startOfWeek())->count()
            : 0;
    }

    protected function weightedForecastThisMonth(): float
    {
        if (!$this->tableExists('deals') || !$this->hasColumn('deals', 'status') || !$this->hasColumn('deals', 'expected_close_date') || !$this->hasColumn('deals', 'amount') || !$this->hasColumn('deals', 'probability')) {
            return 0;
        }

        $row = DB::table('deals')
            ->where('status', 'open')
            ->whereBetween('expected_close_date', [now()->startOfMonth(), now()->endOfMonth()])
            ->selectRaw('COALESCE(SUM(amount * probability / 100), 0) as total')
            ->first();

        return (float) ($row->total ?? 0);
    }

    protected function dealsAtRiskCount(int $days): int
    {
        if (!$this->tableExists('deals') || !$this->hasColumn('deals', 'status') || (!$this->hasColumn('deals', 'expected_close_date') && !$this->hasColumn('deals', 'updated_at'))) {
            return 0;
        }

        $query = DB::table('deals')->where('status', 'open');
        $query->where(function (Builder $query) use ($days) {
            if ($this->hasColumn('deals', 'expected_close_date')) {
                $query->where('expected_close_date', '<', now()->toDateString());
            }
            if ($this->hasColumn('deals', 'updated_at')) {
                $query->orWhere('updated_at', '<', now()->subDays($days));
            }
        });

        return $query->count();
    }

    protected function winRateThisMonth(): float
    {
        if (!$this->tableExists('deals') || !$this->hasColumn('deals', 'status') || !$this->hasColumn('deals', 'closed_date')) {
            return 0;
        }

        $won = DB::table('deals')->where('status', 'won')->whereBetween('closed_date', [now()->startOfMonth(), now()->endOfMonth()])->count();
        $lost = DB::table('deals')->where('status', 'lost')->whereBetween('closed_date', [now()->startOfMonth(), now()->endOfMonth()])->count();
        $closed = $won + $lost;

        return $closed > 0 ? round(($won / $closed) * 100, 1) : 0;
    }

    protected function winRateBySource(): array
    {
        if (!$this->tableExists('deals') || !$this->hasColumn('deals', 'status') || !$this->hasColumn('deals', 'source')) {
            return [];
        }

        return DB::table('deals')
            ->select('source', DB::raw("SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as won"), DB::raw("SUM(CASE WHEN status = 'lost' THEN 1 ELSE 0 END) as lost"))
            ->whereIn('status', ['won', 'lost'])
            ->groupBy('source')
            ->orderByDesc('won')
            ->limit(8)
            ->get()
            ->map(function ($row) {
                $closed = (int) $row->won + (int) $row->lost;

                return [
                    'source' => $row->source ?: 'Unspecified',
                    'win_rate' => $closed > 0 ? round(((int) $row->won / $closed) * 100, 1) : 0,
                    'won' => (int) $row->won,
                    'lost' => (int) $row->lost,
                ];
            })
            ->all();
    }

    protected function userName($userId): string
    {
        if (!$userId || !$this->tableExists('users')) {
            return '-';
        }
        return DB::table('users')->where('id', $userId)->value('name') ?: '-';
    }

    protected function applyBranch(Builder $query, string $table, array $filters): void
    {
        if (!empty($filters['branch_id']) && $this->hasColumn($table, 'branch_id')) {
            $query->where($table . '.branch_id', $filters['branch_id']);
        }
    }

    protected function applyDateRange(Builder $query, string $table, string $dateColumn, array $filters): void
    {
        if (!$this->hasColumn($table, $dateColumn)) {
            return;
        }
        if (!empty($filters['date_from'])) {
            $query->whereDate($table . '.' . $dateColumn, '>=', $filters['date_from']);
        }
        if (!empty($filters['date_to'])) {
            $query->whereDate($table . '.' . $dateColumn, '<=', $filters['date_to']);
        }
    }

    protected function applyDashboardRecordScope(Builder $query, string $table, bool $requireApproved = false): void
    {
        if ($requireApproved && $this->hasColumn($table, 'approved')) {
            $query->where($table . '.approved', true);
        }

        if ($this->hasColumn($table, 'active')) {
            $query->where($table . '.active', true);
        }

        if ($this->hasColumn($table, 'void')) {
            $query->where($table . '.void', false);
        }

        if ($this->hasColumn($table, 'status')) {
            $query->whereNotIn($table . '.status', ['void', 'VOID', 'cancelled', 'CANCELLED', 'canceled', 'CANCELED']);
        }
    }

    protected function tableExists(string $table): bool
    {
        return Schema::hasTable($table);
    }

    protected function hasColumn(string $table, string $column): bool
    {
        return Schema::hasTable($table) && Schema::hasColumn($table, $column);
    }

    protected function firstExistingColumn(string $table, array $columns): ?string
    {
        foreach ($columns as $column) {
            if ($this->hasColumn($table, $column)) {
                return $column;
            }
        }

        return null;
    }
}
