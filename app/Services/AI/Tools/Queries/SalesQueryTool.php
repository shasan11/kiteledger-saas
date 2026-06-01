<?php

namespace App\Services\AI\Tools\Queries;

use App\Services\AI\Tools\AiToolResult;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class SalesQueryTool extends BaseQueryTool
{
    public function salesToday(Request $request): array
    {
        return $this->salesTotal($request, 'sales.today', 'Sales today', now()->toDateString(), now()->toDateString());
    }

    public function salesThisMonth(Request $request): array
    {
        return $this->salesTotal($request, 'sales.this_month', 'Sales this month', now()->startOfMonth()->toDateString(), now()->toDateString());
    }

    public function topCustomerBySales(Request $request): array
    {
        return $this->groupedInvoices($request, 'sales.top_customer', 'Top customer by sales', 'contacts.id', ['contacts.name as customer_name']);
    }

    public function topInvoiceByAmount(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices'])) {
            return $this->empty('sales.top_invoice', 'Top invoice by amount', $request);
        }

        $query = DB::table('invoices')->select(['id', 'invoice_no', 'invoice_date', 'total', 'status', 'contact_id']);
        $this->applyOperationalInvoiceTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(10)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'invoice_no' => $row->invoice_no,
            'invoice_date' => $row->invoice_date,
            'total' => $this->number($row->total),
            'status' => $row->status,
            'open_url' => '/payment-in/invoices/' . $row->id,
        ])->all();

        return AiToolResult::query('sales.top_invoice', 'Top invoice by amount', $records, $this->contextFilters($request), count($records) ? $records[0]['invoice_no'] . ' is the highest invoice by amount.' : 'No invoices were found.', '/payment-in/invoices')->toArray();
    }

    public function unpaidInvoices(Request $request): array
    {
        return $this->invoicesByStatus($request, 'sales.unpaid_invoices', 'Unpaid invoices', ['posted', 'part_paid'], true);
    }

    public function draftInvoices(Request $request): array
    {
        return $this->invoicesByStatus($request, 'sales.draft_invoices', 'Draft invoices', ['draft'], false);
    }

    public function approvedInvoices(Request $request): array
    {
        return $this->invoicesByStatus($request, 'sales.approved_invoices', 'Approved invoices', [], false, true);
    }

    public function salesByBranch(Request $request): array
    {
        return $this->groupedInvoices($request, 'sales.by_branch', 'Sales by branch', 'invoices.branch_id', ['invoices.branch_id']);
    }

    public function salesByProduct(Request $request): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices', 'invoice_lines', 'products'])) {
            return $this->empty('sales.by_product', 'Sales by product', $request);
        }

        $query = DB::table('invoice_lines')
            ->join('invoices', 'invoices.id', '=', 'invoice_lines.invoice_id')
            ->leftJoin('products', 'products.id', '=', 'invoice_lines.product_id')
            ->select([
                'products.id as product_id',
                DB::raw("COALESCE(products.name, invoice_lines.product_name, invoice_lines.description, 'Unnamed product') as product_name"),
                DB::raw('SUM(invoice_lines.qty) as quantity'),
                DB::raw('SUM(invoice_lines.line_total) as total'),
            ])
            ->groupBy('products.id', 'products.name', 'invoice_lines.product_name', 'invoice_lines.description');

        $this->applyOperationalInvoiceTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(20)->get()->map(fn ($row) => [
            'product_id' => $row->product_id ? (string) $row->product_id : null,
            'product_name' => $row->product_name,
            'quantity' => (float) $row->quantity,
            'total' => $this->number($row->total),
            'open_url' => $row->product_id ? '/inventory/products/' . $row->product_id : '/payment-in/invoices',
        ])->all();

        return AiToolResult::query('sales.by_product', 'Sales by product', $records, $this->contextFilters($request), count($records) ? $records[0]['product_name'] . ' is the top product by sales amount.' : 'No sales by product data was found.', '/reports/sales/sales-by-item')->toArray();
    }

    public function salesByStatus(Request $request): array
    {
        return $this->groupedInvoices($request, 'sales.by_status', 'Sales by status', 'invoices.status', ['invoices.status']);
    }

    private function salesTotal(Request $request, string $tool, string $title, string $from, string $to): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('invoices')->whereBetween('invoice_date', [$from, $to]);
        $this->applyOperationalInvoiceTruth($query, $request, false);

        $total = $this->number($query->sum('total'));
        $count = (clone $query)->count();

        return AiToolResult::query($tool, $title, [['invoice_count' => $count, 'total' => $total, 'from_date' => $from, 'to_date' => $to, 'open_url' => '/payment-in/invoices']], array_merge($this->contextFilters($request), ['from_date' => $from, 'to_date' => $to]), $title . ' is ' . number_format($total, 2) . ' from ' . $count . ' approved invoices.', '/payment-in/invoices')->toArray();
    }

    private function groupedInvoices(Request $request, string $tool, string $title, string $groupBy, array $extraSelect): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('invoices')
            ->select(array_merge($extraSelect, [DB::raw('COUNT(*) as invoice_count'), DB::raw('SUM(invoices.total) as total')]))
            ->groupBy($groupBy);

        if (in_array('contacts.name as customer_name', $extraSelect, true) && Schema::hasTable('contacts')) {
            $query->join('contacts', 'contacts.id', '=', 'invoices.contact_id');
        }

        $this->applyOperationalInvoiceTruth($query, $request);

        $records = $query->orderByDesc('total')->limit(10)->get()->map(function ($row) use ($groupBy) {
            return [
                'group' => $row->customer_name ?? $row->status ?? $row->branch_id ?? $groupBy,
                'invoice_count' => (int) $row->invoice_count,
                'total' => $this->number($row->total),
                'open_url' => '/payment-in/invoices',
            ];
        })->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $records[0]['group'] . ' is the top result with ' . number_format($records[0]['total'], 2) . '.' : 'No sales data was found.', '/payment-in/invoices')->toArray();
    }

    private function invoicesByStatus(Request $request, string $tool, string $title, array $statuses, bool $onlyBalance = false, bool $approved = false): array
    {
        $this->authorize($request);
        if (!$this->tableExists(['invoices'])) {
            return $this->empty($tool, $title, $request);
        }

        $query = DB::table('invoices')->select(['id', 'invoice_no', 'invoice_date', 'due_date', 'status', 'total', 'paid_total', 'balance_due']);
        if ($statuses) {
            $query->whereIn('status', $statuses);
        }
        if ($onlyBalance && Schema::hasColumn('invoices', 'balance_due')) {
            $query->where('balance_due', '>', 0);
        }
        if ($approved && Schema::hasColumn('invoices', 'approved')) {
            $query->where('approved', true);
        }
        $this->applyActive($query, 'invoices');
        $this->applyBranch($query, $request, 'invoices');
        $this->applyFiscalYear($query, $request, 'invoices', 'invoice_date');

        $records = $query->orderByDesc('invoice_date')->limit(20)->get()->map(fn ($row) => [
            'id' => (string) $row->id,
            'invoice_no' => $row->invoice_no,
            'invoice_date' => $row->invoice_date,
            'due_date' => $row->due_date,
            'status' => $row->status,
            'total' => $this->number($row->total),
            'paid_total' => $this->number($row->paid_total),
            'balance_due' => $this->number($row->balance_due),
            'open_url' => '/payment-in/invoices/' . $row->id,
        ])->all();

        return AiToolResult::query($tool, $title, $records, $this->contextFilters($request), count($records) ? $title . ' returned ' . count($records) . ' invoices.' : 'No invoices were found.', '/payment-in/invoices')->toArray();
    }

    private function applyOperationalInvoiceTruth($query, Request $request, bool $applyFiscal = true): void
    {
        $this->applyActive($query, 'invoices');
        if (Schema::hasColumn('invoices', 'approved')) {
            $query->where('invoices.approved', true);
        }
        if (Schema::hasColumn('invoices', 'void')) {
            $query->where('invoices.void', false);
        }
        $this->applyBranch($query, $request, 'invoices');
        if ($applyFiscal) {
            $this->applyFiscalYear($query, $request, 'invoices', 'invoice_date');
        }
    }
}
