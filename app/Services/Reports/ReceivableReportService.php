<?php

namespace App\Services\Reports;

use App\Models\CustomerPaymentLine;
use App\Models\Invoice;
use App\Models\SalesReturn;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class ReceivableReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'customer-receivable-summary' => $this->customerReceivableSummary($reportKey, $filters, $meta),
            'customer-ageing-summary' => $this->customerAgeingSummary($reportKey, $filters, $meta),
            'invoice-age' => $this->invoiceAge($reportKey, $filters, $meta),
            'customer-statement' => $this->customerStatement($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported receivable report.'),
        };
    }

    protected function invoiceBase(array $filters)
    {
        $query = Invoice::query()->with(['contact', 'branch']);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        if (!empty($filters['customer_id'])) {
            $query->where('contact_id', $filters['customer_id']);
        }

        return $query;
    }

    protected function paymentsByInvoice(array $invoiceIds): array
    {
        return CustomerPaymentLine::query()
            ->select('invoice_id', DB::raw('SUM(allocated_amount) as paid_total'))
            ->whereIn('invoice_id', $invoiceIds)
            ->groupBy('invoice_id')
            ->pluck('paid_total', 'invoice_id')
            ->map(fn ($value) => $this->toFloat($value))
            ->all();
    }

    protected function returnsByCustomer(array $contactIds, array $filters): array
    {
        $query = SalesReturn::query()
            ->select('contact_id', DB::raw('SUM(total) as total'))
            ->whereIn('contact_id', $contactIds)
            ->groupBy('contact_id');

        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        return $query->pluck('total', 'contact_id')
            ->map(fn ($value) => $this->toFloat($value))
            ->all();
    }

    protected function customerReceivableSummary(string $reportKey, array $filters, array $meta): array
    {
        $invoices = $this->invoiceBase($filters)
            ->whereDate('invoice_date', '<=', $filters['as_of_date'])
            ->get();

        $payments = $this->paymentsByInvoice($invoices->pluck('id')->all());
        $returns = $this->returnsByCustomer($invoices->pluck('contact_id')->unique()->all(), $filters);

        $rows = $invoices->groupBy('contact_id')->map(function ($group) use ($payments, $returns) {
            $contact = $group->first()->contact;
            $invoiceTotal = $this->toFloat($group->sum('total'));
            $paidTotal = $this->toFloat($group->sum(fn ($invoice) => $payments[$invoice->id] ?? $invoice->paid_total ?? 0));
            $creditTotal = $this->toFloat($returns[$group->first()->contact_id] ?? 0);

            return [
                'customer_code' => $contact?->code,
                'customer_name' => $contact?->name,
                'invoice_total' => $invoiceTotal,
                'paid_total' => $paidTotal,
                'credit_note_total' => $creditTotal,
                'balance_due' => round($invoiceTotal - $paidTotal - $creditTotal, 2),
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['balance_due']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Customer Code', 'key' => 'customer_code'],
            ['title' => 'Customer Name', 'key' => 'customer_name'],
            ['title' => 'Invoice Total', 'key' => 'invoice_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Credit Note Total', 'key' => 'credit_note_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows, [], [
            'invoice_total' => $this->total($rows, 'invoice_total'),
            'paid_total' => $this->total($rows, 'paid_total'),
            'credit_note_total' => $this->total($rows, 'credit_note_total'),
            'balance_due' => $this->total($rows, 'balance_due'),
        ]);
    }

    protected function customerAgeingSummary(string $reportKey, array $filters, array $meta): array
    {
        $rows = collect($this->invoiceAge($reportKey, $filters, $meta)['rows'])
            ->groupBy('customer')
            ->map(function ($items, $customer) {
                $buckets = ['Not Due' => 0, '0-30' => 0, '31-60' => 0, '61-90' => 0, '91-120' => 0, '120+' => 0];

                foreach ($items as $item) {
                    $buckets[$item['age_bucket']] += (float) $item['balance_due'];
                }

                return [
                    'customer' => $customer,
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
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'Not Due', 'key' => 'not_due'],
            ['title' => '0-30', 'key' => 'bucket_0_30'],
            ['title' => '31-60', 'key' => 'bucket_31_60'],
            ['title' => '61-90', 'key' => 'bucket_61_90'],
            ['title' => '91-120', 'key' => 'bucket_91_120'],
            ['title' => '120+', 'key' => 'bucket_120_plus'],
            ['title' => 'Total Due', 'key' => 'total_due'],
        ], $rows, [], [
            'total_due' => $this->total($rows, 'total_due'),
        ]);
    }

    protected function invoiceAge(string $reportKey, array $filters, array $meta): array
    {
        $invoices = $this->invoiceBase($filters)
            ->whereDate('invoice_date', '<=', $filters['ageing_as_of_date'])
            ->get();

        $payments = $this->paymentsByInvoice($invoices->pluck('id')->all());
        $asOf = Carbon::parse($filters['ageing_as_of_date']);

        $rows = $invoices->map(function ($invoice) use ($payments, $asOf) {
            $paidTotal = $this->toFloat($payments[$invoice->id] ?? $invoice->paid_total ?? 0);
            $balanceDue = round($this->toFloat($invoice->total) - $paidTotal, 2);
            $dueDate = Carbon::parse($invoice->due_date ?: $invoice->invoice_date);
            $ageDays = $dueDate->diffInDays($asOf, false);

            return [
                'invoice_no' => $invoice->invoice_no,
                'invoice_date' => $invoice->invoice_date?->format('Y-m-d'),
                'due_date' => $invoice->due_date?->format('Y-m-d') ?: $invoice->invoice_date?->format('Y-m-d'),
                'customer' => $invoice->contact?->name,
                'invoice_total' => $this->toFloat($invoice->total),
                'paid_total' => $paidTotal,
                'balance_due' => $balanceDue,
                'age_days' => max($ageDays, 0),
                'age_bucket' => $this->ageingBucket($ageDays),
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['balance_due']) > 0.0001)
            ->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Invoice No', 'key' => 'invoice_no'],
            ['title' => 'Invoice Date', 'key' => 'invoice_date'],
            ['title' => 'Due Date', 'key' => 'due_date'],
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'Invoice Total', 'key' => 'invoice_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
            ['title' => 'Age Days', 'key' => 'age_days'],
            ['title' => 'Age Bucket', 'key' => 'age_bucket'],
        ], $rows);
    }

    protected function customerStatement(string $reportKey, array $filters, array $meta): array
    {
        $customerId = $filters['customer_id'] ?: $filters['contact_id'];
        $invoiceQuery = $this->invoiceBase([...$filters, 'customer_id' => $customerId]);
        $invoices = $invoiceQuery->whereDate('invoice_date', '<', $filters['date_from'])->get();
        $opening = round($this->toFloat($invoices->sum('total')) - $this->toFloat($invoices->sum('paid_total')), 2);

        $statementRows = [];
        $running = $opening;

        $periodInvoices = $this->invoiceBase([...$filters, 'customer_id' => $customerId])
            ->whereBetween('invoice_date', [$filters['date_from'], $filters['date_to']])
            ->get();

        foreach ($periodInvoices as $invoice) {
            $running += $this->toFloat($invoice->total);
            $statementRows[] = [
                'date' => $invoice->invoice_date?->format('Y-m-d'),
                'document_type' => 'Invoice',
                'document_no' => $invoice->invoice_no,
                'reference' => $invoice->reference,
                'debit' => $this->toFloat($invoice->total),
                'credit' => 0,
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
        ], array_merge([[
            'date' => $filters['date_from'],
            'document_type' => 'Opening',
            'document_no' => 'OPENING',
            'reference' => null,
            'debit' => null,
            'credit' => null,
            'balance' => $opening,
        ]], $statementRows));
    }
}
