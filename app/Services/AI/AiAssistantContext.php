<?php

namespace App\Services\AI;

use App\Models\Branch;
use App\Models\User;
use App\Services\BranchScopeService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Branch-scoped context builder for AI Assistant.
 * Server-side authoritative; ignores frontend branch_id for branch-limited users.
 */
class AiAssistantContext
{
    public function __construct(
        protected BranchScopeService $scope,
        protected AiSettingsService $settings,
    ) {}

    public function branchScope(Request $request, ?User $user): array
    {
        $canViewAll = $this->scope->canViewAllBranches($user);
        $currentBranchId = $this->scope->selectedBranchId($request, $user);
        $branchId = $currentBranchId;
        $label = 'Current Branch';

        if (!$canViewAll) {
            $assigned = $this->scope->assignedBranchIds($user);
            $branchId = $currentBranchId ?: ($assigned[0] ?? null);
        }

        if ($branchId) {
            try {
                $name = Branch::query()->where('id', $branchId)->value('name');
                if ($name) $label = $name;
            } catch (Throwable) {}
        } elseif ($canViewAll) {
            $label = 'All Branches';
        }

        return [
            'branch_id' => $branchId,
            'current_branch_id' => $currentBranchId,
            'can_view_all_branches' => $canViewAll,
            'label' => $label,
        ];
    }

    public function build(Request $request, string $type, array $payload = []): array
    {
        $user = $request->user();
        $branch = $this->branchScope($request, $user);
        $maxRows = $this->settings->contextMaxRows();

        $context = [
            'company' => config('app.name', 'KiteLedger'),
            'user' => [
                'name' => $user?->name,
                'email' => $user?->email,
            ],
            'branch_scope' => $branch,
            'current_date' => now()->toDateString(),
            'type' => $type,
        ];

        try {
            switch ($type) {
                case 'sales':
                    $context['data'] = $this->salesSnapshot($branch, $maxRows);
                    break;
                case 'purchase':
                    $context['data'] = $this->purchaseSnapshot($branch, $maxRows);
                    break;
                case 'inventory':
                    $context['data'] = $this->inventorySnapshot($branch, $maxRows);
                    break;
                case 'receivable':
                    $context['data'] = $this->receivableSnapshot($branch);
                    break;
                case 'payable':
                    $context['data'] = $this->payableSnapshot($branch);
                    break;
                case 'accounting':
                    $context['data'] = $this->accountingSnapshot($branch);
                    break;
                case 'report':
                    $context['data'] = ['note' => 'Report context should be built via reportSummary endpoint.'];
                    break;
                case 'general':
                default:
                    $context['data'] = ['note' => 'General context'];
                    break;
            }
        } catch (Throwable $e) {
            $context['data'] = ['error' => 'Failed to load context: ' . $e->getMessage()];
        }

        if (!empty($payload)) {
            $context['extra'] = $payload;
        }

        return $context;
    }

    private function applyBranch($query, array $branch, string $column = 'branch_id')
    {
        if (!$branch['can_view_all_branches'] && $branch['branch_id']) {
            return $query->where($column, $branch['branch_id']);
        }

        if ($branch['branch_id']) {
            return $query->where($column, $branch['branch_id']);
        }

        return $query;
    }

    private function salesSnapshot(array $branch, int $maxRows): array
    {
        if (!Schema::hasTable('invoices')) return ['note' => 'No invoices table'];

        $q = DB::table('invoices');
        $this->applyBranch($q, $branch);

        $paidColumn = Schema::hasColumn('invoices', 'paid_total') ? 'paid_total' : null;
        $balanceColumn = Schema::hasColumn('invoices', 'balance_due') ? 'balance_due' : null;

        $paidExpr = $paidColumn ? "COALESCE(SUM({$paidColumn}),0)" : '0';
        $balanceExpr = $balanceColumn ? "COALESCE(SUM({$balanceColumn}),0)" : "COALESCE(SUM(total),0) - {$paidExpr}";

        $totals = (clone $q)
            ->selectRaw("COUNT(*) as count, COALESCE(SUM(total),0) as total, {$paidExpr} as paid, {$balanceExpr} as balance_due")
            ->first();

        $recentColumns = ['id', 'invoice_no', 'total', 'invoice_date'];
        if ($paidColumn) $recentColumns[] = $paidColumn;
        if ($balanceColumn) $recentColumns[] = $balanceColumn;

        $recent = (clone $q)
            ->select($recentColumns)
            ->orderByDesc('invoice_date')
            ->limit(min(20, $maxRows))
            ->get();

        return [
            'invoice_count' => (int) ($totals->count ?? 0),
            'total_sales' => (float) ($totals->total ?? 0),
            'paid_total' => (float) ($totals->paid ?? 0),
            'balance_due' => (float) ($totals->balance_due ?? 0),
            'recent_invoices' => $recent,
        ];
    }

    private function purchaseSnapshot(array $branch, int $maxRows): array
    {
        if (!Schema::hasTable('purchase_bills')) return ['note' => 'No purchase_bills table'];

        $q = DB::table('purchase_bills');
        $this->applyBranch($q, $branch);

        $paidColumn = Schema::hasColumn('purchase_bills', 'paid_total') ? 'paid_total' : null;
        $balanceColumn = Schema::hasColumn('purchase_bills', 'balance_due') ? 'balance_due' : null;

        $paidExpr = $paidColumn ? "COALESCE(SUM({$paidColumn}),0)" : '0';
        $balanceExpr = $balanceColumn ? "COALESCE(SUM({$balanceColumn}),0)" : "COALESCE(SUM(total),0) - {$paidExpr}";

        $totals = (clone $q)
            ->selectRaw("COUNT(*) as count, COALESCE(SUM(total),0) as total, {$paidExpr} as paid, {$balanceExpr} as balance_due")
            ->first();

        $recentColumns = ['id', 'bill_no', 'total', 'bill_date'];
        if ($paidColumn) $recentColumns[] = $paidColumn;
        if ($balanceColumn) $recentColumns[] = $balanceColumn;

        $recent = (clone $q)
            ->select($recentColumns)
            ->orderByDesc('bill_date')
            ->limit(min(20, $maxRows))
            ->get();

        return [
            'bill_count' => (int) ($totals->count ?? 0),
            'total_purchase' => (float) ($totals->total ?? 0),
            'paid_total' => (float) ($totals->paid ?? 0),
            'balance_due' => (float) ($totals->balance_due ?? 0),
            'recent_bills' => $recent,
        ];
    }

    private function inventorySnapshot(array $branch, int $maxRows): array
    {
        if (!Schema::hasTable('warehouse_items')) return ['note' => 'No warehouse_items table'];

        $q = DB::table('warehouse_items');
        if ($branch['branch_id'] && Schema::hasColumn('warehouse_items', 'branch_id')) {
            $q->where('branch_id', $branch['branch_id']);
        }

        $quantityColumn = Schema::hasColumn('warehouse_items', 'qty_on_hand') ? 'qty_on_hand' : 'quantity';
        $costColumn = Schema::hasColumn('warehouse_items', 'cost') ? 'cost' : (Schema::hasColumn('warehouse_items', 'average_cost') ? 'average_cost' : null);
        $costExpr = $costColumn ? "COALESCE({$costColumn},0)" : '0';

        $value = (clone $q)->selectRaw("COALESCE(SUM({$quantityColumn} * {$costExpr}),0) as v, COUNT(*) as c")->first();
        $low = (clone $q)->where($quantityColumn, '<=', 5)->limit(min(20, $maxRows))->get(['id', 'product_id', $quantityColumn]);

        return [
            'inventory_lines' => (int) ($value->c ?? 0),
            'inventory_value' => (float) ($value->v ?? 0),
            'low_stock_items' => $low,
        ];
    }

    private function receivableSnapshot(array $branch): array
    {
        if (!Schema::hasTable('invoices')) return ['note' => 'No invoices table'];

        $dueExpression = Schema::hasColumn('invoices', 'balance_due')
            ? 'COALESCE(balance_due,0)'
            : 'COALESCE(total,0) - COALESCE(paid_total,0)';

        $q = DB::table('invoices')->whereRaw("{$dueExpression} > 0");
        $this->applyBranch($q, $branch);

        $total = (clone $q)->selectRaw("SUM({$dueExpression}) as v")->value('v');
        $top = (clone $q)
            ->select(['id', 'invoice_no', 'contact_id', DB::raw("{$dueExpression} as due"), 'invoice_date'])
            ->orderByDesc('due')
            ->limit(20)
            ->get();

        return ['total_receivable' => (float) ($total ?? 0), 'top_overdue' => $top];
    }

    private function payableSnapshot(array $branch): array
    {
        if (!Schema::hasTable('purchase_bills')) return ['note' => 'No purchase_bills table'];

        $dueExpression = Schema::hasColumn('purchase_bills', 'balance_due')
            ? 'COALESCE(balance_due,0)'
            : 'COALESCE(total,0) - COALESCE(paid_total,0)';

        $q = DB::table('purchase_bills')->whereRaw("{$dueExpression} > 0");
        $this->applyBranch($q, $branch);

        $total = (clone $q)->selectRaw("SUM({$dueExpression}) as v")->value('v');
        $top = (clone $q)
            ->select(['id', 'bill_no', 'contact_id', DB::raw("{$dueExpression} as due"), 'bill_date'])
            ->orderByDesc('due')
            ->limit(20)
            ->get();

        return ['total_payable' => (float) ($total ?? 0), 'top_overdue' => $top];
    }

    private function accountingSnapshot(array $branch): array
    {
        $out = ['note' => 'Aggregate accounting snapshot'];

        if (Schema::hasTable('journal_vouchers')) {
            $q = DB::table('journal_vouchers');
            $this->applyBranch($q, $branch);
            $out['journal_count'] = (int) (clone $q)->count();
        }

        return $out;
    }
}
