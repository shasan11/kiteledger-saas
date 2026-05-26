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
            // Force-resolve user branch even if frontend tried to override
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

        // Merge any caller-supplied compressed payload (already sanitized)
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

        $totals = (clone $q)->selectRaw('COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')->first();
        $balanceDue = (float) ($totals->total ?? 0) - (float) ($totals->paid ?? 0);

        $recent = (clone $q)
            ->select(['id', 'invoice_no', 'total', 'paid_amount', 'invoice_date'])
            ->orderByDesc('invoice_date')
            ->limit(min(20, $maxRows))
            ->get();

        return [
            'invoice_count' => (int) ($totals->count ?? 0),
            'total_sales' => (float) ($totals->total ?? 0),
            'paid_total' => (float) ($totals->paid ?? 0),
            'balance_due' => $balanceDue,
            'recent_invoices' => $recent,
        ];
    }

    private function purchaseSnapshot(array $branch, int $maxRows): array
    {
        if (!Schema::hasTable('purchase_bills')) return ['note' => 'No purchase_bills table'];

        $q = DB::table('purchase_bills');
        $this->applyBranch($q, $branch);

        $totals = (clone $q)->selectRaw('COUNT(*) as count, COALESCE(SUM(total),0) as total, COALESCE(SUM(paid_amount),0) as paid')->first();

        $recent = (clone $q)
            ->select(['id', 'bill_no', 'total', 'paid_amount', 'bill_date'])
            ->orderByDesc('bill_date')
            ->limit(min(20, $maxRows))
            ->get();

        return [
            'bill_count' => (int) ($totals->count ?? 0),
            'total_purchase' => (float) ($totals->total ?? 0),
            'paid_total' => (float) ($totals->paid ?? 0),
            'balance_due' => (float) (($totals->total ?? 0) - ($totals->paid ?? 0)),
            'recent_bills' => $recent,
        ];
    }

    private function inventorySnapshot(array $branch, int $maxRows): array
    {
        if (!Schema::hasTable('warehouse_items')) return ['note' => 'No warehouse_items table'];

        $q = DB::table('warehouse_items');
        if ($branch['branch_id']) {
            // warehouse_items might join warehouses by branch — best-effort filter:
            if (Schema::hasColumn('warehouse_items', 'branch_id')) {
                $q->where('branch_id', $branch['branch_id']);
            }
        }

        $value = (clone $q)->selectRaw('COALESCE(SUM(quantity * COALESCE(cost,0)),0) as v, COUNT(*) as c')->first();
        $low = (clone $q)->where('quantity', '<=', 5)->limit(min(20, $maxRows))->get(['id', 'product_id', 'quantity']);

        return [
            'inventory_lines' => (int) ($value->c ?? 0),
            'inventory_value' => (float) ($value->v ?? 0),
            'low_stock_items' => $low,
        ];
    }

    private function receivableSnapshot(array $branch): array
    {
        if (!Schema::hasTable('invoices')) return ['note' => 'No invoices table'];
        $q = DB::table('invoices')->whereRaw('(total - COALESCE(paid_amount,0)) > 0');
        $this->applyBranch($q, $branch);
        $total = (clone $q)->selectRaw('SUM(total - COALESCE(paid_amount,0)) as v')->value('v');
        $top = (clone $q)
            ->select(['id', 'invoice_no', 'contact_id', DB::raw('(total - COALESCE(paid_amount,0)) as due'), 'invoice_date'])
            ->orderByDesc('due')
            ->limit(20)
            ->get();
        return ['total_receivable' => (float) ($total ?? 0), 'top_overdue' => $top];
    }

    private function payableSnapshot(array $branch): array
    {
        if (!Schema::hasTable('purchase_bills')) return ['note' => 'No purchase_bills table'];
        $q = DB::table('purchase_bills')->whereRaw('(total - COALESCE(paid_amount,0)) > 0');
        $this->applyBranch($q, $branch);
        $total = (clone $q)->selectRaw('SUM(total - COALESCE(paid_amount,0)) as v')->value('v');
        $top = (clone $q)
            ->select(['id', 'bill_no', 'contact_id', DB::raw('(total - COALESCE(paid_amount,0)) as due'), 'bill_date'])
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
