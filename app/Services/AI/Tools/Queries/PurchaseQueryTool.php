<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PurchaseQueryTool extends BaseQueryTool
{
    public function purchasesToday(Request $request): array
    {
        return $this->purchaseTotal($request, 'purchase.today', 'Purchases today', now()->toDateString(), now()->toDateString());
    }

    public function purchasesThisMonth(Request $request): array
    {
        return $this->purchaseTotal($request, 'purchase.this_month', 'Purchases this month', now()->startOfMonth()->toDateString(), now()->toDateString());
    }

    public function topSupplierByPurchase(Request $request): array
    {
        return $this->groupedBills($request, 'purchase.top_supplier', 'Top supplier by purchase', 'contacts.id', ['contacts.name as supplier_name']);
    }

    public function topBillByAmount(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills'])) {
            return $this->empty('purchase.top_bill', 'Top bill by amount', $request);
        }

        $query = DB::table('purchase_bills')->select(['id', 'bill_no', 'bill_date', 'total', 'status']);
        $this->applyBillTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(10)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'bill_no' => $row->bill_no,
            'bill_date' => $row->bill_date,
            'total' => $this->number($row->total),
            'status' => $row->status,
            'open_url' => '/payment-out/purchase-bills/' . $row->id,
        ])->all();

        return AiToolResult::query('purchase.top_bill', 'Top bill by amount', $records, $this->contextFilters($request), count($records) ? $records[0]['bill_no'] . ' is the highest bill by amount.' : 'No purchase bills were found.', '/payment-out/purchase-bills')->toArray();
    }

    public function unpaidBills(Request $request): array
    {
        return app(PayableQueryTool::class)->unpaidBills($request);
    }

    public function draftPurchaseBills(Request $request): array
    {
        return $this->billsByStatus($request, 'purchase.draft_bills', 'Draft purchase bills', ['draft']);
    }

    public function approvedPurchaseBills(Request $request): array
    {
        return $this->billsByStatus($request, 'purchase.approved_bills', 'Approved purchase bills', [], true);
    }

    public function purchaseByBranch(Request $request): array
    {
        return $this->groupedBills($request, 'purchase.by_branch', 'Purchase by branch', 'purchase_bills.branch_id', ['purchase_bills.branch_id']);
    }

    public function purchaseByProduct(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills', 'purchase_bill_lines', 'products'])) {
            return $this->empty('purchase.by_product', 'Purchase by product', $request);
        }

        $query = DB::table('purchase_bill_lines')
            ->join('purchase_bills', 'purchase_bills.id', '=', 'purchase_bill_lines.purchase_bill_id')
            ->leftJoin('products', 'products.id', '=', 'purchase_bill_lines.product_id')
            ->select([
                'products.id as product_id',
                DB::raw("COALESCE(products.name, purchase_bill_lines.product_name, purchase_bill_lines.description, 'Unnamed product') as product_name"),
                DB::raw('SUM(purchase_bill_lines.qty) as quantity'),
                DB::raw('SUM(purchase_bill_lines.line_total) as total'),
            ])
            ->groupBy('products.id', 'products.name', 'purchase_bill_lines.product_name', 'purchase_bill_lines.description');

        $this->applyBillTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(20)->get()->map(fn ($row) => [
            'product_id' => $row->product_id ? (string) $row->product_id : null,
            'product_name' => $row->product_name,
            'quantity' => (float) $row->quantity,
            'total' => $this->number($row->total),
            'open_url' => $row->product_id ? '/inventory/products/' . $row->product_id : '/payment-out/purchase-bills',
        ])->all();

        return AiToolResult::query('purchase.by_product', 'Purchase by product', $records, $this->contextFilters($request), count($records) ? $records[0]['product_name'] . ' is the top purchased product by amount.' : 'No purchase by product data was found.', '/reports/purchase/purchase-by-item')->toArray();
    }

    public function purchaseByStatus(Request $request): array
    {
        return $this->groupedBills($request, 'purchase.by_status', 'Purchase by status', 'purchase_bills.status', ['purchase_bills.status']);
    }

    private function purchaseTotal(Request $request, string $tool, string $title, string $from, string $to): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('purchase_bills')->whereBetween('bill_date', [$from, $to]);
        $this->applyBillTruth($query, $request, false);

        $total = $this->number($query->sum('total'));
        $count = (clone $query)->count();

        return AiToolResult::query($tool, $title, [['bill_count' => $count, 'total' => $total, 'from_date' => $from, 'to_date' => $to, 'open_url' => '/payment-out/purchase-bills']], array_merge($this->contextFilters($request), ['from_date' => $from, 'to_date' => $to]), $title . ' is ' . number_format($total, 2) . ' from ' . $count . ' approved bills.', '/payment-out/purchase-bills')->toArray();
    }

    private function groupedBills(Request $request, string $tool, string $title, string $groupBy, array $extraSelect): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('purchase_bills')
            ->select(array_merge($extraSelect, [DB::raw('COUNT(*) as bill_count'), DB::raw('SUM(purchase_bills.total) as total')]))
            ->groupBy($groupBy);

        if (in_array('contacts.name as supplier_name', $extraSelect, true) && Schema::hasTable('contacts')) {
            $query->join('contacts', 'contacts.id', '=', 'purchase_bills.contact_id');
        }

        $this->applyBillTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(10)->get()->map(fn ($row) => [
            'group' => $row->supplier_name ?? $row->status ?? $row->branch_id ?? $groupBy,
            'bill_count' => (int) $row->bill_count,
            'total' => $this->number($row->total),
            'open_url' => '/payment-out/purchase-bills',
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $records[0]['group'] . ' is the top result with ' . number_format($records[0]['total'], 2) . '.' : 'No purchase data was found.', '/payment-out/purchase-bills')->toArray();
    }

    private function billsByStatus(Request $request, string $tool, string $title, array $statuses, bool $approved = false): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('purchase_bills')->select(['id', 'bill_no', 'bill_date', 'due_date', 'status', 'total', 'paid_total', 'balance_due']);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }
        if ($approved && Schema::hasColumn('purchase_bills', 'approved')) {
            $query->where('approved', true);
        }
        $this->applyActive($query, 'purchase_bills');
        $this->applyBranch($query, $request, 'purchase_bills');
        $this->applyFiscalYear($query, $request, 'purchase_bills', 'bill_date');

        $records = $query->orderByDesc('bill_date')->limit(20)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'bill_no' => $row->bill_no,
            'bill_date' => $row->bill_date,
            'due_date' => $row->due_date,
            'status' => $row->status,
            'total' => $this->number($row->total),
            'paid_total' => $this->number($row->paid_total),
            'balance_due' => $this->number($row->balance_due),
            'open_url' => '/payment-out/purchase-bills/' . $row->id,
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $title . ' returned ' . count($records) . ' bills.' : 'No purchase bills were found.', '/payment-out/purchase-bills')->toArray();
    }

    private function applyBillTruth($query, Request $request, bool $applyFiscal = true): void
    {
        $this->applyActive($query, 'purchase_bills');
        if (Schema::hasColumn('purchase_bills', 'approved')) {
            $query->where('purchase_bills.approved', true);
        }
        if (Schema::hasColumn('purchase_bills', 'void')) {
            $query->where('purchase_bills.void', false);
        }
        $this->applyBranch($query, $request, 'purchase_bills');
        if ($applyFiscal) {
            $this->applyFiscalYear($query, $request, 'purchase_bills', 'bill_date');
        }
    }
}
