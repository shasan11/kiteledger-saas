<?php

namespace App\Services;

use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Database\Query\Builder;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class DashboardService
{
    protected array $transactionTables = [
        ['table' => 'invoices', 'type' => 'Invoice', 'module' => 'Sales', 'date' => 'invoice_date', 'number' => 'invoice_no', 'amount' => 'total', 'route' => '/payment-in/invoices'],
        ['table' => 'purchase_bills', 'type' => 'Purchase Bill', 'module' => 'Purchase', 'date' => 'bill_date', 'number' => 'bill_no', 'amount' => 'total', 'route' => '/payment-out/purchase-bills'],
        ['table' => 'customer_payments', 'type' => 'Customer Payment', 'module' => 'Payment In', 'date' => 'payment_date', 'number' => 'payment_no', 'amount' => 'amount', 'route' => '/payment-in/payments'],
        ['table' => 'supplier_payments', 'type' => 'Supplier Payment', 'module' => 'Payment Out', 'date' => 'payment_date', 'number' => 'payment_no', 'amount' => 'amount', 'route' => '/payment-out/payments'],
        ['table' => 'expenses', 'type' => 'Expense', 'module' => 'Purchase', 'date' => 'expense_date', 'number' => 'expense_no', 'amount' => 'total', 'route' => '/payment-out/expenses'],
        ['table' => 'cash_transfers', 'type' => 'Cash Transfer', 'module' => 'Accounting', 'date' => 'transfer_date', 'number' => 'transfer_no', 'amount' => 'total_amount', 'route' => '/accounting/cash-transfers'],
        ['table' => 'journal_vouchers', 'type' => 'Journal Voucher', 'module' => 'Accounting', 'date' => 'voucher_date', 'number' => 'voucher_no', 'amount' => 'total', 'route' => '/accounting/journal-vouchers'],
        ['table' => 'sales_returns', 'type' => 'Sales Return', 'module' => 'Sales', 'date' => 'return_date', 'number' => 'sales_return_no', 'amount' => 'total', 'route' => '/payment-in/credit-notes'],
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
            ->map(fn ($branch) => ['value' => $branch->id, 'label' => $branch->name])
            ->all();
    }

    public function getSummary(array $filters): array
    {
        $today = now()->toDateString();
        $monthStart = now()->startOfMonth()->toDateString();
        $monthEnd = now()->endOfMonth()->toDateString();

        return [
            'sales_today' => $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $today, $today),
            'sales_this_month' => $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $monthStart, $monthEnd),
            'receivables' => $this->sumApproved('invoices', 'balance_due', 'invoice_date', $filters),
            'payables' => $this->sumApproved('purchase_bills', 'balance_due', 'bill_date', $filters),
            'cash_bank_balance' => $this->cashBankBalance($filters),
            'pending_approvals' => count($this->getPendingApprovals($filters)),
            'low_stock_items' => $this->lowStockCount(),
            'approved_jv_missing' => $this->approvedButJvMissingCount($filters),
        ];
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
        return [
            'approved_jv_missing' => $this->approvedButJvMissingCount($filters),
            'approved_number_missing' => $this->approvedButNumberMissingCount($filters),
            'journal_voucher_id_null' => $this->journalVoucherNullCount($filters),
            'auto_jv_created_today' => $this->autoJvCreatedToday($filters),
            'unbalanced_jvs' => count($this->unbalancedJournalVouchers($filters)),
            'voided_this_month' => $this->voidedThisMonth($filters),
            'reversal_jvs_this_month' => $this->reversalJvsThisMonth($filters),
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
        $incoming = $this->dailySums('customer_payments', 'amount', 'payment_date', $filters, $start, $end);
        $supplier = $this->dailySums('supplier_payments', 'amount', 'payment_date', $filters, $start, $end);
        $expenses = $this->dailySums('expenses', 'total', 'expense_date', $filters, $start, $end);

        $rows = [];
        foreach (CarbonPeriod::create($start, $end) as $date) {
            $key = $date->toDateString();
            $cashIn = (float) ($incoming[$key] ?? 0);
            $cashOut = (float) ($supplier[$key] ?? 0) + (float) ($expenses[$key] ?? 0);
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
                'cash_out_today' => (float) ($supplier[now()->toDateString()] ?? 0) + (float) ($expenses[now()->toDateString()] ?? 0),
                'net_cash_flow' => ((float) ($incoming[now()->toDateString()] ?? 0)) - ((float) ($supplier[now()->toDateString()] ?? 0) + (float) ($expenses[now()->toDateString()] ?? 0)),
                'bank_balance' => $this->bankBalance($filters),
                'cash_in_hand' => $this->cashInHand($filters),
                'expected_receivables' => $this->sumApproved('invoices', 'balance_due', 'due_date', $filters),
                'upcoming_payables' => $this->sumApproved('purchase_bills', 'balance_due', 'due_date', $filters, now()->toDateString(), now()->addDays(14)->toDateString()),
            ],
            'chart' => $rows,
        ];
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
                'sales_returns' => $this->countTable('sales_returns', 'return_date', $filters),
                'overdue_invoices' => $this->overdueCount('invoices', 'due_date', 'balance_due', $filters),
                'top_customers' => $this->topParties('invoices', 'invoice_date', 'total', $filters),
            ],
            'purchase' => [
                'purchase_orders' => $this->countTable('purchase_orders', 'order_date', $filters),
                'purchase_bills' => $this->countTable('purchase_bills', 'bill_date', $filters),
                'supplier_payments' => $this->countTable('supplier_payments', 'payment_date', $filters),
                'expenses' => $this->countTable('expenses', 'expense_date', $filters),
                'debit_notes' => $this->countTable('debit_notes', 'debit_note_date', $filters),
                'upcoming_bills' => $this->overdueCount('purchase_bills', 'due_date', 'balance_due', $filters, false),
                'top_suppliers' => $this->topParties('purchase_bills', 'bill_date', 'total', $filters),
            ],
            'chart' => [
                ['name' => 'Sales', 'amount' => $this->sumApproved('invoices', 'total', 'invoice_date', $filters, $monthStart, $monthEnd)],
                ['name' => 'Purchase', 'amount' => $this->sumApproved('purchase_bills', 'total', 'bill_date', $filters, $monthStart, $monthEnd)],
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
        $stockExpr = $stockColumn ?: '0';

        $products = DB::table('products')
            ->select('id', 'name', 'sku', 'code', 'reorder_level', DB::raw(($stockColumn ?: '0') . ' as current_stock'))
            ->where('active', true)
            ->orderBy('name')
            ->limit(300)
            ->get();

        $warnings = $products->filter(fn ($product) => (float) $product->current_stock <= (float) $product->reorder_level)
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
                'total_products' => DB::table('products')->where('active', true)->count(),
                'low_stock_products' => count($warnings),
                'negative_stock_warnings' => $products->filter(fn ($product) => (float) $product->current_stock < 0)->count(),
                'inventory_value' => $valueColumn ? (float) DB::table('products')->sum($valueColumn) : (float) DB::table('products')->sum(DB::raw("COALESCE($stockExpr, 0) * COALESCE(purchase_price, 0)")),
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

        return collect($alerts)->take(20)->values()->all();
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
            ['table' => 'journal_vouchers', 'module' => 'Accounting', 'date' => 'created_at', 'text' => 'Journal voucher created', 'number' => 'voucher_no', 'route' => '/accounting/journal-vouchers'],
        ];

        foreach ($recentConfigs as $config) {
            if (!$this->tableExists($config['table']) || !$this->hasColumn($config['table'], $config['date'])) {
                continue;
            }

            $query = DB::table($config['table'])->select($config['table'] . '.*')->orderByDesc($config['date'])->limit(8);
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
            ->reject(fn ($config) => $config['table'] === 'journal_vouchers')
            ->sum(fn ($config) => $this->approvedButJvMissingQuery($config, $filters)?->count() ?? 0);
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
        return collect($this->transactionTables)->sum(fn ($config) => $this->approvedButNumberMissingQuery($config, $filters)?->count() ?? 0);
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
            ->reject(fn ($config) => $config['table'] === 'journal_vouchers')
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

    protected function sumApproved(string $table, string $amountColumn, string $dateColumn, array $filters, ?string $from = null, ?string $to = null): float
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $amountColumn)) {
            return 0;
        }
        $query = DB::table($table);
        if ($this->hasColumn($table, 'approved')) {
            $query->where('approved', true);
        }
        $this->applyBranch($query, $table, $filters);
        if ($from && $to && $this->hasColumn($table, $dateColumn)) {
            $query->whereBetween($dateColumn, [$from, $to]);
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
            ->whereBetween($date, [$from->toDateString(), $to->toDateString()])
            ->groupBy(DB::raw("DATE($date)"));
        if ($this->hasColumn($table, 'approved')) {
            $query->where('approved', true);
        }
        $this->applyBranch($query, $table, $filters);

        return $query->pluck('amount', 'day')->all();
    }

    protected function cashBankBalance(array $filters): float
    {
        return $this->bankBalance($filters) + $this->cashInHand($filters);
    }

    protected function bankBalance(array $filters): float
    {
        if ($this->tableExists('bank_accounts') && $this->hasColumn('bank_accounts', 'current_balance')) {
            $query = DB::table('bank_accounts');
            $this->applyBranch($query, 'bank_accounts', $filters);
            return (float) $query->sum('current_balance');
        }
        return 0;
    }

    protected function cashInHand(array $filters): float
    {
        if (!$this->tableExists('accounts')) {
            return 0;
        }
        $balanceColumn = $this->firstExistingColumn('accounts', ['current_balance', 'balance', 'opening_balance']);
        if (!$balanceColumn) {
            return 0;
        }
        return (float) DB::table('accounts')->where('name', 'like', '%cash%')->sum($balanceColumn);
    }

    protected function countTable(string $table, string $dateColumn, array $filters): int
    {
        if (!$this->tableExists($table)) {
            return 0;
        }
        $query = DB::table($table);
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
        if (!$this->tableExists('products')) {
            return 0;
        }
        $stockColumn = $this->firstExistingColumn('products', ['current_stock', 'stock', 'quantity', 'opening_stock']);
        if (!$stockColumn) {
            return 0;
        }
        return DB::table('products')->whereColumn($stockColumn, '<=', 'reorder_level')->count();
    }

    protected function overdueCount(string $table, string $dateColumn, string $balanceColumn, array $filters, bool $past = true): int
    {
        if (!$this->tableExists($table) || !$this->hasColumn($table, $dateColumn)) {
            return 0;
        }
        $query = DB::table($table);
        $past ? $query->whereDate($dateColumn, '<', now()) : $query->whereBetween($dateColumn, [now(), now()->addDays(14)]);
        if ($this->hasColumn($table, $balanceColumn)) {
            $query->where($balanceColumn, '>', 0);
        }
        $this->applyBranch($query, $table, $filters);
        return $query->count();
    }

    protected function topParties(string $table, string $dateColumn, string $amountColumn, array $filters): array
    {
        if (!$this->tableExists($table) || !$this->tableExists('contacts') || !$this->hasColumn($table, 'contact_id')) {
            return [];
        }
        $query = DB::table($table)
            ->join('contacts', $table . '.contact_id', '=', 'contacts.id')
            ->select('contacts.name', DB::raw("SUM($table.$amountColumn) as amount"))
            ->groupBy('contacts.id', 'contacts.name')
            ->orderByDesc('amount')
            ->limit(5);
        $this->applyBranch($query, $table, $filters);
        $this->applyDateRange($query, $table, $dateColumn, $filters);

        return $query->get()->map(fn ($row) => ['name' => $row->name, 'amount' => (float) $row->amount])->all();
    }

    protected function whereCount(string $table, string $column, string $value): int
    {
        return $this->tableExists($table) && $this->hasColumn($table, $column) ? DB::table($table)->where($column, $value)->count() : 0;
    }

    protected function sumWhere(string $table, string $amount, string $column, string $value): float
    {
        return $this->tableExists($table) && $this->hasColumn($table, $amount) ? (float) DB::table($table)->where($column, $value)->sum($amount) : 0;
    }

    protected function dateDueCount(string $table, string $column, Carbon $from, Carbon $to): int
    {
        return $this->tableExists($table) && $this->hasColumn($table, $column) ? DB::table($table)->whereBetween($column, [$from, $to])->count() : 0;
    }

    protected function overdueActivities(): int
    {
        return $this->tableExists('crm_activities') ? DB::table('crm_activities')->whereNull('completed_at')->where('due_at', '<', now())->count() : 0;
    }

    protected function monthlyDealCount(string $status): int
    {
        return $this->tableExists('deals') ? DB::table('deals')->where('status', $status)->whereBetween('updated_at', [now()->startOfMonth(), now()->endOfMonth()])->count() : 0;
    }

    protected function pipeline(): array
    {
        $defaultStages = ['New', 'Contacted', 'Qualified', 'Proposal Sent', 'Negotiation', 'Won', 'Lost'];
        if (!$this->tableExists('deal_stages')) {
            return collect($defaultStages)->map(fn ($stage) => ['stage' => $stage, 'count' => 0, 'amount' => 0])->all();
        }

        return DB::table('deal_stages')
            ->leftJoin('deals', 'deal_stages.id', '=', 'deals.deal_stage_id')
            ->select('deal_stages.name as stage', DB::raw('COUNT(deals.id) as count'), DB::raw('COALESCE(SUM(deals.amount), 0) as amount'))
            ->groupBy('deal_stages.id', 'deal_stages.name', 'deal_stages.sort_order')
            ->orderBy('deal_stages.sort_order')
            ->get()
            ->map(fn ($row) => ['stage' => $row->stage, 'count' => (int) $row->count, 'amount' => (float) $row->amount])
            ->all();
    }

    protected function crmFollowups(): array
    {
        if (!$this->tableExists('crm_activities')) {
            return [];
        }

        return DB::table('crm_activities')
            ->leftJoin('leads', 'crm_activities.lead_id', '=', 'leads.id')
            ->leftJoin('deals', 'crm_activities.deal_id', '=', 'deals.id')
            ->leftJoin('contacts', 'crm_activities.contact_id', '=', 'contacts.id')
            ->leftJoin('users', 'crm_activities.assigned_to_id', '=', 'users.id')
            ->select('crm_activities.*', 'leads.name as lead_name', 'deals.title as deal_title', 'deals.amount as deal_amount', 'contacts.name as contact_name', 'users.name as assigned_to')
            ->whereNull('crm_activities.completed_at')
            ->where('crm_activities.due_at', '<=', now()->endOfDay())
            ->orderBy('crm_activities.due_at')
            ->limit(15)
            ->get()
            ->map(fn ($row) => [
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

    protected function weeklyLeadCount(): int
    {
        return $this->tableExists('leads')
            ? DB::table('leads')->where('created_at', '>=', now()->startOfWeek())->count()
            : 0;
    }

    protected function weightedForecastThisMonth(): float
    {
        if (!$this->tableExists('deals')) {
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
        if (!$this->tableExists('deals')) {
            return 0;
        }

        return DB::table('deals')
            ->where('status', 'open')
            ->where(function (Builder $query) use ($days) {
                $query->where('expected_close_date', '<', now()->toDateString())
                    ->orWhere('updated_at', '<', now()->subDays($days));
            })
            ->count();
    }

    protected function winRateThisMonth(): float
    {
        if (!$this->tableExists('deals')) {
            return 0;
        }

        $won = DB::table('deals')->where('status', 'won')->whereBetween('closed_date', [now()->startOfMonth(), now()->endOfMonth()])->count();
        $lost = DB::table('deals')->where('status', 'lost')->whereBetween('closed_date', [now()->startOfMonth(), now()->endOfMonth()])->count();
        $closed = $won + $lost;

        return $closed > 0 ? round(($won / $closed) * 100, 1) : 0;
    }

    protected function winRateBySource(): array
    {
        if (!$this->tableExists('deals')) {
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
