<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PayableQueryTool extends BaseQueryTool
{
    public function highestSupplierBalance(Request $request): array
    {
        return $this->supplierBalances($request, 'payable.highest_supplier_balance', 'Supplier with highest payable', true);
    }

    public function totalPayable(Request $request): array
    {
        $result = $this->supplierBalances($request, 'payable.total', 'Total payable', false);
        $total = array_sum(array_column($result['records'] ?? [], 'balance_due'));
        $result['summary'] = 'Total payable is ' . number_format($total, 2) . ' based on unpaid approved purchase bills.';
        return $result;
    }

    public function overduePayable(Request $request): array
    {
        return $this->billList($request, 'payable.overdue', 'Overdue payable', fn ($q) => $q->whereDate('due_date', '<', now()->toDateString())->where('balance_due', '>', 0));
    }

    public function topOverdueSuppliers(Request $request): array
    {
        return $this->supplierBalances($request, 'payable.top_overdue_suppliers', 'Top overdue suppliers', true, true);
    }

    public function unpaidBills(Request $request): array
    {
        return $this->billList($request, 'payable.unpaid_bills', 'Unpaid bills', fn ($q) => $q->where('balance_due', '>', 0));
    }

    public function partiallyPaidBills(Request $request): array
    {
        return $this->billList($request, 'payable.partially_paid_bills', 'Partially paid bills', fn ($q) => $q->where('paid_total', '>', 0)->where('balance_due', '>', 0));
    }

    public function supplierAgeing(Request $request): array
    {
        return app(ReportQueryTool::class)->supplierAgeing($request);
    }

    private function supplierBalances(Request $request, string $tool, string $title, bool $topOnly, bool $overdue = false): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills', 'contacts'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('purchase_bills')
            ->join('contacts', 'contacts.id', '=', 'purchase_bills.contact_id')
            ->select([
                'contacts.id as contact_id',
                'contacts.name as supplier_name',
                DB::raw('COUNT(purchase_bills.id) as bill_count'),
                DB::raw('SUM(purchase_bills.balance_due) as balance_due'),
            ])
            ->where('purchase_bills.balance_due', '>', 0)
            ->groupBy('contacts.id', 'contacts.name');

        if ($overdue) {
            $query->whereDate('purchase_bills.due_date', '<', now()->toDateString());
        }

        $this->applyBillTruth($query, $request);

        $records = $query->orderByDesc('balance_due')->limit($topOnly ? 10 : 50)->get()->map(fn ($row) => [
            'contact_id' => (string) $row->contact_id,
            'supplier_name' => $row->supplier_name,
            'bill_count' => (int) $row->bill_count,
            'balance_due' => $this->number($row->balance_due),
            'open_url' => '/crm/contacts/' . $row->contact_id,
        ])->all();

        $summary = count($records)
            ? $records[0]['supplier_name'] . ' has the highest payable with ' . number_format($records[0]['balance_due'], 2) . '.'
            : 'No payable balances were found.';

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), $summary, '/reports/payable/supplier-payable-summary')->toArray();
    }

    private function billList(Request $request, string $tool, string $title, callable $filter): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['purchase_bills'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('purchase_bills')->select(['id', 'bill_no', 'bill_date', 'due_date', 'total', 'paid_total', 'balance_due', 'status']);
        $filter($query);
        $this->applyBillTruth($query, $request);

        $records = $query->orderByDesc('balance_due')->limit(25)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'bill_no' => $row->bill_no,
            'bill_date' => $row->bill_date,
            'due_date' => $row->due_date,
            'total' => $this->number($row->total),
            'paid_total' => $this->number($row->paid_total),
            'balance_due' => $this->number($row->balance_due),
            'status' => $row->status,
            'open_url' => '/payment-out/purchase-bills/' . $row->id,
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $title . ' returned ' . count($records) . ' bills.' : 'No bills matched this payable query.', '/payment-out/purchase-bills')->toArray();
    }

    private function applyBillTruth($query, Request $request): void
    {
        $this->applyActive($query, 'purchase_bills');
        if (Schema::hasColumn('purchase_bills', 'approved')) {
            $query->where('purchase_bills.approved', true);
        }
        if (Schema::hasColumn('purchase_bills', 'void')) {
            $query->where('purchase_bills.void', false);
        }
        $this->applyBranch($query, $request, 'purchase_bills');
        $this->applyFiscalYear($query, $request, 'purchase_bills', 'bill_date');
    }
}
