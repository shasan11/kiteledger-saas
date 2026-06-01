<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class ReceivableQueryTool extends BaseQueryTool
{
    public function highestCustomerBalance(Request $request): array
    {
        return $this->customerBalances($request, 'receivable.highest_customer_balance', 'Customer with highest receivable', true);
    }

    public function totalReceivable(Request $request): array
    {
        $records = $this->customerBalances($request, 'receivable.total', 'Total receivable', false);
        $total = array_sum(array_column($records['records'] ?? [], 'balance_due'));
        $records['summary'] = 'Total receivable is ' . number_format($total, 2) . ' based on unpaid approved invoices.';
        return $records;
    }

    public function overdueReceivable(Request $request): array
    {
        return $this->invoiceList($request, 'receivable.overdue', 'Overdue receivable', fn ($q) => $q->whereDate('due_date', '<', now()->toDateString())->where('balance_due', '>', 0));
    }

    public function topOverdueCustomers(Request $request): array
    {
        return $this->customerBalances($request, 'receivable.top_overdue_customers', 'Top overdue customers', true, true);
    }

    public function unpaidInvoices(Request $request): array
    {
        return $this->invoiceList($request, 'receivable.unpaid_invoices', 'Unpaid invoices', fn ($q) => $q->where('balance_due', '>', 0));
    }

    public function partiallyPaidInvoices(Request $request): array
    {
        return $this->invoiceList($request, 'receivable.partially_paid_invoices', 'Partially paid invoices', fn ($q) => $q->where('paid_total', '>', 0)->where('balance_due', '>', 0));
    }

    public function customerAgeing(Request $request): array
    {
        return app(ReportQueryTool::class)->customerAgeing($request);
    }

    private function customerBalances(Request $request, string $tool, string $title, bool $topOnly, bool $overdue = false): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices', 'contacts'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('invoices')
            ->join('contacts', 'contacts.id', '=', 'invoices.contact_id')
            ->select([
                'contacts.id as contact_id',
                'contacts.name as customer_name',
                DB::raw('COUNT(invoices.id) as invoice_count'),
                DB::raw('SUM(invoices.balance_due) as balance_due'),
            ])
            ->where('invoices.balance_due', '>', 0)
            ->groupBy('contacts.id', 'contacts.name');

        if ($overdue) {
            $query->whereDate('invoices.due_date', '<', now()->toDateString());
        }

        $this->applyInvoiceTruth($query, $request);

        $records = $query->orderByDesc('balance_due')->limit($topOnly ? 10 : 50)->get()->map(fn ($row) => [
            'contact_id' => (string) $row->contact_id,
            'customer_name' => $row->customer_name,
            'invoice_count' => (int) $row->invoice_count,
            'balance_due' => $this->number($row->balance_due),
            'open_url' => '/crm/contacts/' . $row->contact_id,
        ])->all();

        $summary = count($records)
            ? $records[0]['customer_name'] . ' has the highest receivable with ' . number_format($records[0]['balance_due'], 2) . '.'
            : 'No receivable balances were found.';

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), $summary, '/reports/receivable/customer-receivable-summary')->toArray();
    }

    private function invoiceList(Request $request, string $tool, string $title, callable $filter): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('invoices')->select(['id', 'invoice_no', 'invoice_date', 'due_date', 'total', 'paid_total', 'balance_due', 'status']);
        $filter($query);
        $this->applyInvoiceTruth($query, $request);

        $records = $query->orderByDesc('balance_due')->limit(25)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'invoice_no' => $row->invoice_no,
            'invoice_date' => $row->invoice_date,
            'due_date' => $row->due_date,
            'total' => $this->number($row->total),
            'paid_total' => $this->number($row->paid_total),
            'balance_due' => $this->number($row->balance_due),
            'status' => $row->status,
            'open_url' => '/payment-in/invoices/' . $row->id,
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $title . ' returned ' . count($records) . ' invoices.' : 'No invoices matched this receivable query.', '/payment-in/invoices')->toArray();
    }

    private function applyInvoiceTruth($query, Request $request): void
    {
        $this->applyActive($query, 'invoices');
        if (Schema::hasColumn('invoices', 'approved')) {
            $query->where('invoices.approved', true);
        }
        if (Schema::hasColumn('invoices', 'void')) {
            $query->where('invoices.void', false);
        }
        $this->applyBranch($query, $request, 'invoices');
        $this->applyFiscalYear($query, $request, 'invoices', 'invoice_date');
    }
}
