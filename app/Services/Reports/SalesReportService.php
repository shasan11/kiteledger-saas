<?php

namespace App\Services\Reports;

use App\Models\Invoice;
use App\Models\InvoiceLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class SalesReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'sales-by-customer' => $this->salesByCustomer($reportKey, $filters, $meta),
            'sales-by-item' => $this->salesByItem($reportKey, $filters, $meta),
            'sales-by-customer-monthly' => $this->salesByCustomerMonthly($reportKey, $filters, $meta),
            'sales-by-item-monthly' => $this->salesByItemMonthly($reportKey, $filters, $meta),
            'sales-master' => $this->salesMaster($reportKey, $filters, $meta),
            'sales-summary' => $this->salesSummary($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported sales report.'),
        };
    }

    protected function invoiceQuery(array $filters)
    {
        $query = Invoice::query()->with(['contact', 'warehouse', 'branch', 'invoiceLines.product']);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        $query->whereBetween('invoice_date', [$filters['date_from'], $filters['date_to']]);

        if (!empty($filters['customer_id'])) {
            $query->where('contact_id', $filters['customer_id']);
        }

        return $query;
    }

    protected function salesByCustomer(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->invoiceQuery($filters)->get()->groupBy('contact_id')->map(function ($group) {
            $contact = $group->first()->contact;
            $invoiceCount = $group->count();
            $qty = $group->sum(fn ($invoice) => $invoice->invoiceLines->sum('qty'));
            $subtotal = $group->sum('total');
            $tax = $group->sum(fn ($invoice) => $invoice->invoiceLines->sum('tax_amount'));
            $grossWithoutTax = $group->sum(fn ($invoice) => $invoice->invoiceLines->sum(fn ($line) => (float) $line->qty * (float) $line->unit_price));
            $discount = round($grossWithoutTax - ($subtotal - $tax), 2);
            return [
                'customer' => $contact?->name,
                'invoice_count' => $invoiceCount,
                'qty' => round($qty, 4),
                'subtotal' => round($subtotal - $tax, 2),
                'discount' => $discount,
                'tax' => round($tax, 2),
                'sales_total' => round($subtotal, 2),
                'paid_total' => round($group->sum('paid_total'), 2),
                'balance_due' => round($group->sum('balance_due'), 2),
            ];
        })->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'Invoice Count', 'key' => 'invoice_count'],
            ['title' => 'Qty', 'key' => 'qty'],
            ['title' => 'Subtotal', 'key' => 'subtotal'],
            ['title' => 'Discount', 'key' => 'discount'],
            ['title' => 'Tax', 'key' => 'tax'],
            ['title' => 'Sales Total', 'key' => 'sales_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows);
    }

    protected function salesByItem(string $reportKey, array $filters, array $meta): array
    {
        $rows = InvoiceLine::query()
            ->join('invoices', 'invoices.id', '=', 'invoice_lines.invoice_id')
            ->leftJoin('products', 'products.id', '=', 'invoice_lines.product_id')
            ->whereBetween('invoices.invoice_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['product_id']), fn ($query) => $query->where('invoice_lines.product_id', $filters['product_id']))
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('invoices.branch_id', $filters['branch_id']))
            ->groupBy('invoice_lines.product_id', 'products.code', 'products.name', 'invoice_lines.custom_product_name')
            ->get([
                'products.code as product_code',
                'products.name as product_name',
                'invoice_lines.custom_product_name',
                DB::raw('SUM(invoice_lines.qty) as qty_sold'),
                DB::raw('SUM(invoice_lines.qty * invoice_lines.unit_price) as gross_sales'),
                DB::raw('SUM(invoice_lines.tax_amount) as tax'),
                DB::raw('SUM(invoice_lines.line_total) as net_sales'),
            ])->map(fn ($row) => [
                'product_code' => $row->product_code,
                'product_name' => $row->product_name ?: $row->custom_product_name,
                'qty_sold' => round((float) $row->qty_sold, 4),
                'gross_sales' => round((float) $row->gross_sales, 2),
                'discount' => round((float) $row->gross_sales - ((float) $row->net_sales - (float) $row->tax), 2),
                'tax' => round((float) $row->tax, 2),
                'net_sales' => round((float) $row->net_sales, 2),
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product Code', 'key' => 'product_code'],
            ['title' => 'Product Name', 'key' => 'product_name'],
            ['title' => 'Qty Sold', 'key' => 'qty_sold'],
            ['title' => 'Gross Sales', 'key' => 'gross_sales'],
            ['title' => 'Discount', 'key' => 'discount'],
            ['title' => 'Tax', 'key' => 'tax'],
            ['title' => 'Net Sales', 'key' => 'net_sales'],
        ], $rows);
    }

    protected function salesByCustomerMonthly(string $reportKey, array $filters, array $meta): array
    {
        return $this->monthlyPivot($reportKey, $filters, $meta, 'customer');
    }

    protected function salesByItemMonthly(string $reportKey, array $filters, array $meta): array
    {
        return $this->monthlyPivot($reportKey, $filters, $meta, 'item');
    }

    protected function monthlyPivot(string $reportKey, array $filters, array $meta, string $mode): array
    {
        $query = $mode === 'customer'
            ? Invoice::query()->with('contact')->whereYear('invoice_date', $filters['year'])
            : InvoiceLine::query()
                ->join('invoices', 'invoices.id', '=', 'invoice_lines.invoice_id')
                ->leftJoin('products', 'products.id', '=', 'invoice_lines.product_id')
                ->whereYear('invoices.invoice_date', $filters['year']);

        if (!empty($filters['branch_id']) && $filters['branch_id'] !== 'all') {
            $query->where($mode === 'customer' ? 'branch_id' : 'invoices.branch_id', $filters['branch_id']);
        }

        $data = $query->get();
        $rows = collect($data)->groupBy(function ($row) use ($mode) {
            if ($mode === 'customer') {
                return $row->contact?->name ?: 'Unknown';
            }

            return $row->product?->name ?? $row->product_name ?? $row->custom_product_name ?? 'Unknown';
        })->map(function ($items, $label) use ($mode) {
            $row = ['label' => $label];
            $total = 0;
            for ($month = 1; $month <= 12; $month++) {
                $monthTotal = $mode === 'customer'
                    ? $items->filter(fn ($item) => (int) $item->invoice_date?->format('n') === $month)->sum('total')
                    : $items->filter(fn ($item) => (int) Carbon::parse($item->invoice_date)->format('n') === $month)->sum('line_total');
                $row[strtolower(Carbon::create()->month($month)->format('M'))] = round($monthTotal, 2);
                $total += $monthTotal;
            }
            $row['total'] = round($total, 2);
            return $row;
        })->values()->all();

        $columns = [['title' => ucfirst($mode === 'customer' ? 'Customer' : 'Product'), 'key' => 'label']];
        for ($month = 1; $month <= 12; $month++) {
            $columns[] = ['title' => Carbon::create()->month($month)->format('M'), 'key' => strtolower(Carbon::create()->month($month)->format('M'))];
        }
        $columns[] = ['title' => 'Total', 'key' => 'total'];

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, $columns, $rows);
    }

    protected function salesMaster(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->invoiceQuery($filters)->get()->map(function ($invoice) {
            $tax = $invoice->invoiceLines->sum('tax_amount');
            return [
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date?->format('Y-m-d'),
                'customer' => $invoice->contact?->name,
                'warehouse' => $invoice->warehouse?->name,
                'reference' => $invoice->reference,
                'status' => $invoice->status,
                'approval' => $invoice->approved ? 'Approved' : 'Pending',
                'subtotal' => round($this->toFloat($invoice->total) - $this->toFloat($tax), 2),
                'discount' => round($invoice->invoiceLines->sum(fn ($line) => ((float) $line->qty * (float) $line->unit_price) - ((float) $line->line_total - (float) $line->tax_amount)), 2),
                'tax' => round($tax, 2),
                'grand_total' => $this->toFloat($invoice->total),
                'paid_total' => $this->toFloat($invoice->paid_total),
                'balance_due' => $this->toFloat($invoice->balance_due),
            ];
        })->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Invoice No', 'key' => 'invoice_no'],
            ['title' => 'Invoice Date', 'key' => 'invoice_date'],
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'Warehouse', 'key' => 'warehouse'],
            ['title' => 'Reference', 'key' => 'reference'],
            ['title' => 'Status', 'key' => 'status'],
            ['title' => 'Approval', 'key' => 'approval'],
            ['title' => 'Subtotal', 'key' => 'subtotal'],
            ['title' => 'Discount', 'key' => 'discount'],
            ['title' => 'Tax', 'key' => 'tax'],
            ['title' => 'Grand Total', 'key' => 'grand_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows);
    }

    protected function salesSummary(string $reportKey, array $filters, array $meta): array
    {
        $invoices = $this->invoiceQuery($filters)->get();
        $grouped = $invoices->groupBy(function ($invoice) use ($filters) {
            return match ($filters['group_by']) {
                'month' => $invoice->invoice_date?->format('Y-m'),
                'week' => $invoice->invoice_date?->format('o-\WW'),
                'customer' => $invoice->contact?->name,
                'branch' => $invoice->branch?->name,
                default => $invoice->invoice_date?->format('Y-m-d'),
            };
        })->map(fn ($items, $label) => [
            'group' => $label,
            'total_sales' => round($items->sum('total'), 2),
            'invoice_count' => $items->count(),
            'paid_amount' => round($items->sum('paid_total'), 2),
            'balance_due' => round($items->sum('balance_due'), 2),
        ])->values()->all();

        $totalSales = round($invoices->sum('total'), 2);
        $paidAmount = round($invoices->sum('paid_total'), 2);

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Group', 'key' => 'group'],
            ['title' => 'Total Sales', 'key' => 'total_sales'],
            ['title' => 'Invoice Count', 'key' => 'invoice_count'],
            ['title' => 'Paid Amount', 'key' => 'paid_amount'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $grouped, [
            ['label' => 'Total Sales', 'value' => $totalSales],
            ['label' => 'Total Invoices', 'value' => $invoices->count()],
            ['label' => 'Paid Amount', 'value' => $paidAmount],
            ['label' => 'Balance Due', 'value' => round($invoices->sum('balance_due'), 2)],
            ['label' => 'Sales Return', 'value' => 0],
            ['label' => 'Net Sales', 'value' => $totalSales],
        ]);
    }
}
