<?php

namespace App\Services\Reports;

use App\Models\DebitNote;
use App\Models\PurchaseBill;
use App\Models\SupplierPaymentLine;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class PayableReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'supplier-payable-summary' => $this->supplierPayableSummary($reportKey, $filters, $meta),
            'supplier-ageing-summary' => $this->supplierAgeingSummary($reportKey, $filters, $meta),
            'purchase-bill-age' => $this->purchaseBillAge($reportKey, $filters, $meta),
            'supplier-statement' => $this->supplierStatement($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported payable report.'),
        };
    }

    protected function billBase(array $filters)
    {
        $query = PurchaseBill::query()->with('contact');
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);
        if (!empty($filters['supplier_id'])) {
            $query->where('contact_id', $filters['supplier_id']);
        }

        return $query;
    }

    protected function supplierPayableSummary(string $reportKey, array $filters, array $meta): array
    {
        $bills = $this->billBase($filters)->whereDate('bill_date', '<=', $filters['as_of_date'])->get();
        $rows = $bills->groupBy('contact_id')->map(function ($group) {
            $contact = $group->first()->contact;
            $billTotal = $this->toFloat($group->sum('total'));
            $paidTotal = $this->toFloat($group->sum('paid_total'));
            return [
                'supplier_code' => $contact?->code,
                'supplier_name' => $contact?->name,
                'bill_total' => $billTotal,
                'paid_total' => $paidTotal,
                'debit_note_total' => 0,
                'balance_due' => round($billTotal - $paidTotal, 2),
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['balance_due']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Supplier Code', 'key' => 'supplier_code'],
            ['title' => 'Supplier Name', 'key' => 'supplier_name'],
            ['title' => 'Bill Total', 'key' => 'bill_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Debit Note Total', 'key' => 'debit_note_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows);
    }

    protected function supplierAgeingSummary(string $reportKey, array $filters, array $meta): array
    {
        $rows = collect($this->purchaseBillAge($reportKey, $filters, $meta)['rows'])
            ->groupBy('supplier')
            ->map(function ($items, $supplier) {
                $buckets = ['Not Due' => 0, '0-30' => 0, '31-60' => 0, '61-90' => 0, '91-120' => 0, '120+' => 0];
                foreach ($items as $item) {
                    $buckets[$item['age_bucket']] += (float) $item['balance_due'];
                }
                return [
                    'supplier' => $supplier,
                    'not_due' => round($buckets['Not Due'], 2),
                    'bucket_0_30' => round($buckets['0-30'], 2),
                    'bucket_31_60' => round($buckets['31-60'], 2),
                    'bucket_61_90' => round($buckets['61-90'], 2),
                    'bucket_91_120' => round($buckets['91-120'], 2),
                    'bucket_120_plus' => round($buckets['120+'], 2),
                    'total_due' => round(array_sum($buckets), 2),
                ];
            })->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Supplier', 'key' => 'supplier'],
            ['title' => 'Not Due', 'key' => 'not_due'],
            ['title' => '0-30', 'key' => 'bucket_0_30'],
            ['title' => '31-60', 'key' => 'bucket_31_60'],
            ['title' => '61-90', 'key' => 'bucket_61_90'],
            ['title' => '91-120', 'key' => 'bucket_91_120'],
            ['title' => '120+', 'key' => 'bucket_120_plus'],
            ['title' => 'Total Due', 'key' => 'total_due'],
        ], $rows);
    }

    protected function purchaseBillAge(string $reportKey, array $filters, array $meta): array
    {
        $bills = $this->billBase($filters)->whereDate('bill_date', '<=', $filters['ageing_as_of_date'])->get();
        $asOf = Carbon::parse($filters['ageing_as_of_date']);
        $rows = $bills->map(function ($bill) use ($asOf) {
            $balanceDue = round($this->toFloat($bill->total) - $this->toFloat($bill->paid_total), 2);
            $dueDate = Carbon::parse($bill->due_date ?: $bill->bill_date);
            $ageDays = $dueDate->diffInDays($asOf, false);
            return [
                'bill_no' => $bill->bill_no,
                'bill_date' => $bill->bill_date?->format('Y-m-d'),
                'due_date' => $bill->due_date?->format('Y-m-d') ?: $bill->bill_date?->format('Y-m-d'),
                'supplier' => $bill->contact?->name,
                'bill_total' => $this->toFloat($bill->total),
                'paid_total' => $this->toFloat($bill->paid_total),
                'balance_due' => $balanceDue,
                'age_days' => max($ageDays, 0),
                'age_bucket' => $this->ageingBucket($ageDays),
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['balance_due']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Bill No', 'key' => 'bill_no'],
            ['title' => 'Bill Date', 'key' => 'bill_date'],
            ['title' => 'Due Date', 'key' => 'due_date'],
            ['title' => 'Supplier', 'key' => 'supplier'],
            ['title' => 'Bill Total', 'key' => 'bill_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
            ['title' => 'Age Days', 'key' => 'age_days'],
            ['title' => 'Age Bucket', 'key' => 'age_bucket'],
        ], $rows);
    }

    protected function supplierStatement(string $reportKey, array $filters, array $meta): array
    {
        $supplierId = $filters['supplier_id'] ?: $filters['contact_id'];
        $openingBills = $this->billBase([...$filters, 'supplier_id' => $supplierId])->whereDate('bill_date', '<', $filters['date_from'])->get();
        $opening = round($this->toFloat($openingBills->sum('total')) - $this->toFloat($openingBills->sum('paid_total')), 2);
        $running = $opening;
        $rows = [[
            'date' => $filters['date_from'],
            'document_type' => 'Opening',
            'document_no' => 'OPENING',
            'reference' => null,
            'debit' => null,
            'credit' => null,
            'balance' => $opening,
        ]];

        foreach ($this->billBase([...$filters, 'supplier_id' => $supplierId])->whereBetween('bill_date', [$filters['date_from'], $filters['date_to']])->get() as $bill) {
            $running += $this->toFloat($bill->total);
            $rows[] = [
                'date' => $bill->bill_date?->format('Y-m-d'),
                'document_type' => 'Purchase Bill',
                'document_no' => $bill->bill_no,
                'reference' => $bill->reference,
                'debit' => 0,
                'credit' => $this->toFloat($bill->total),
                'balance' => round($running, 2),
            ];
        }

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Document Type', 'key' => 'document_type'],
            ['title' => 'Document No', 'key' => 'document_no'],
            ['title' => 'Reference', 'key' => 'reference'],
            ['title' => 'Debit', 'key' => 'debit'],
            ['title' => 'Credit', 'key' => 'credit'],
            ['title' => 'Balance', 'key' => 'balance'],
        ], $rows);
    }
}
