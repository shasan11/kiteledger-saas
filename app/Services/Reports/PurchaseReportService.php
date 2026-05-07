<?php

namespace App\Services\Reports;

use App\Models\PurchaseBill;
use App\Models\PurchaseBillLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PurchaseReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'purchase-by-supplier' => $this->purchaseBySupplier($reportKey, $filters, $meta),
            'purchase-by-item' => $this->purchaseByItem($reportKey, $filters, $meta),
            'purchase-by-supplier-monthly' => $this->purchaseMonthly($reportKey, $filters, $meta, 'supplier'),
            'purchase-by-item-monthly' => $this->purchaseMonthly($reportKey, $filters, $meta, 'item'),
            'purchase-master' => $this->purchaseMaster($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported purchase report.'),
        };
    }

    protected function billQuery(array $filters)
    {
        $query = PurchaseBill::query()->with(['contact', 'warehouse', 'purchaseBillLines.product']);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        $query->whereBetween('bill_date', [$filters['date_from'], $filters['date_to']]);
        if (!empty($filters['supplier_id'])) {
            $query->where('contact_id', $filters['supplier_id']);
        }
        return $query;
    }

    protected function purchaseBySupplier(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->billQuery($filters)->get()->groupBy('contact_id')->map(function ($group) {
            $contact = $group->first()->contact;
            $qty = $group->sum(fn ($bill) => $bill->purchaseBillLines->sum('qty'));
            $gross = $group->sum(fn ($bill) => $bill->purchaseBillLines->sum(fn ($line) => (float) $line->qty * (float) $line->unit_price));
            $tax = $group->sum(fn ($bill) => $bill->purchaseBillLines->sum('tax_amount'));
            return [
                'supplier' => $contact?->name,
                'bill_count' => $group->count(),
                'qty' => round($qty, 4),
                'gross_purchase' => round($gross, 2),
                'discount' => round($gross - ($group->sum('total') - $tax), 2),
                'tax' => round($tax, 2),
                'net_purchase' => round($group->sum('total'), 2),
                'paid_total' => round($group->sum('paid_total'), 2),
                'balance_due' => round($group->sum('balance_due'), 2),
            ];
        })->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Supplier', 'key' => 'supplier'],
            ['title' => 'Bill Count', 'key' => 'bill_count'],
            ['title' => 'Qty', 'key' => 'qty'],
            ['title' => 'Gross Purchase', 'key' => 'gross_purchase'],
            ['title' => 'Discount', 'key' => 'discount'],
            ['title' => 'Tax', 'key' => 'tax'],
            ['title' => 'Net Purchase', 'key' => 'net_purchase'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows);
    }

    protected function purchaseByItem(string $reportKey, array $filters, array $meta): array
    {
        $rows = PurchaseBillLine::query()
            ->join('purchase_bills', 'purchase_bills.id', '=', 'purchase_bill_lines.purchase_bill_id')
            ->leftJoin('products', 'products.id', '=', 'purchase_bill_lines.product_id')
            ->whereBetween('purchase_bills.bill_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('purchase_bills.branch_id', $filters['branch_id']))
            ->groupBy('purchase_bill_lines.product_id', 'products.code', 'products.name', 'purchase_bill_lines.custom_product_name')
            ->get([
                'products.code as product_code',
                'products.name as product_name',
                'purchase_bill_lines.custom_product_name',
                DB::raw('SUM(purchase_bill_lines.qty) as qty_purchased'),
                DB::raw('SUM(purchase_bill_lines.qty * purchase_bill_lines.unit_price) as gross_purchase'),
                DB::raw('SUM(purchase_bill_lines.tax_amount) as tax'),
                DB::raw('SUM(purchase_bill_lines.line_total) as net_purchase'),
            ])->map(fn ($row) => [
                'product_code' => $row->product_code,
                'product_name' => $row->product_name ?: $row->custom_product_name,
                'qty_purchased' => round((float) $row->qty_purchased, 4),
                'gross_purchase' => round((float) $row->gross_purchase, 2),
                'discount' => round((float) $row->gross_purchase - ((float) $row->net_purchase - (float) $row->tax), 2),
                'tax' => round((float) $row->tax, 2),
                'net_purchase' => round((float) $row->net_purchase, 2),
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Product Code', 'key' => 'product_code'],
            ['title' => 'Product Name', 'key' => 'product_name'],
            ['title' => 'Qty Purchased', 'key' => 'qty_purchased'],
            ['title' => 'Gross Purchase', 'key' => 'gross_purchase'],
            ['title' => 'Discount', 'key' => 'discount'],
            ['title' => 'Tax', 'key' => 'tax'],
            ['title' => 'Net Purchase', 'key' => 'net_purchase'],
        ], $rows);
    }

    protected function purchaseMonthly(string $reportKey, array $filters, array $meta, string $mode): array
    {
        $query = $mode === 'supplier'
            ? PurchaseBill::query()->with('contact')->whereYear('bill_date', $filters['year'])
            : PurchaseBillLine::query()
                ->join('purchase_bills', 'purchase_bills.id', '=', 'purchase_bill_lines.purchase_bill_id')
                ->leftJoin('products', 'products.id', '=', 'purchase_bill_lines.product_id')
                ->whereYear('purchase_bills.bill_date', $filters['year']);

        if (!empty($filters['branch_id']) && $filters['branch_id'] !== 'all') {
            $query->where($mode === 'supplier' ? 'branch_id' : 'purchase_bills.branch_id', $filters['branch_id']);
        }

        $rows = $query->get()->groupBy(function ($row) use ($mode) {
            return $mode === 'supplier'
                ? ($row->contact?->name ?: 'Unknown')
                : ($row->product?->name ?? $row->product_name ?? $row->custom_product_name ?? 'Unknown');
        })->map(function ($items, $label) use ($mode) {
            $row = ['label' => $label];
            $total = 0;
            for ($month = 1; $month <= 12; $month++) {
                $value = $mode === 'supplier'
                    ? $items->filter(fn ($item) => (int) $item->bill_date?->format('n') === $month)->sum('total')
                    : $items->filter(fn ($item) => (int) Carbon::parse($item->bill_date)->format('n') === $month)->sum('line_total');
                $row[strtolower(Carbon::create()->month($month)->format('M'))] = round($value, 2);
                $total += $value;
            }
            $row['total'] = round($total, 2);
            return $row;
        })->values()->all();

        $columns = [['title' => ucfirst($mode === 'supplier' ? 'Supplier' : 'Product'), 'key' => 'label']];
        for ($month = 1; $month <= 12; $month++) {
            $columns[] = ['title' => Carbon::create()->month($month)->format('M'), 'key' => strtolower(Carbon::create()->month($month)->format('M'))];
        }
        $columns[] = ['title' => 'Total', 'key' => 'total'];
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, $columns, $rows);
    }

    protected function purchaseMaster(string $reportKey, array $filters, array $meta): array
    {
        $rows = $this->billQuery($filters)->get()->map(function ($bill) {
            $tax = $bill->purchaseBillLines->sum('tax_amount');
            return [
                'bill_no' => $bill->bill_no,
                'bill_date' => $bill->bill_date?->format('Y-m-d'),
                'supplier' => $bill->contact?->name,
                'warehouse' => $bill->warehouse?->name,
                'reference' => $bill->reference,
                'status' => $bill->status,
                'approval' => $bill->approved ? 'Approved' : 'Pending',
                'subtotal' => round($this->toFloat($bill->total) - $this->toFloat($tax), 2),
                'discount' => round($bill->purchaseBillLines->sum(fn ($line) => ((float) $line->qty * (float) $line->unit_price) - ((float) $line->line_total - (float) $line->tax_amount)), 2),
                'tax' => round($tax, 2),
                'grand_total' => $this->toFloat($bill->total),
                'paid_total' => $this->toFloat($bill->paid_total),
                'balance_due' => $this->toFloat($bill->balance_due),
            ];
        })->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Bill No', 'key' => 'bill_no'],
            ['title' => 'Bill Date', 'key' => 'bill_date'],
            ['title' => 'Supplier', 'key' => 'supplier'],
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
}
