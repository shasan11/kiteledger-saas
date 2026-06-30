<?php

namespace App\Services\Reports;

use App\Models\DebitNote;
use App\Models\PurchaseBill;
use App\Models\SupplierPayment;
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
        if (! empty($filters['supplier_id'])) {
            $query->where('contact_id', $filters['supplier_id']);
        }

        return $query;
    }

    protected function supplierPayableSummary(string $reportKey, array $filters, array $meta): array
    {
        $bills = $this->billBase($filters)->whereDate('bill_date', '<=', $filters['as_of_date'])->get();
        $payments = $this->paymentsByBill($bills->pluck('id')->all(), $filters, $filters['as_of_date']);
        $debitNotes = $this->debitNotesBySupplier($bills->pluck('contact_id')->unique()->all(), $filters, $filters['as_of_date']);
        $rows = $bills->groupBy('contact_id')->map(function ($group) use ($payments, $debitNotes) {
            $contact = $group->first()->contact;
            $billTotal = $this->toFloat($group->sum('total'));
            $paidTotal = $this->toFloat($group->sum(fn ($bill) => $payments[$bill->id] ?? 0));
            $debitNoteTotal = $this->toFloat($debitNotes[$group->first()->contact_id] ?? 0);

            return [
                'supplier_code' => $contact?->code,
                'supplier_name' => $contact?->name,
                'bill_total' => $billTotal,
                'paid_total' => $paidTotal,
                'debit_note_total' => $debitNoteTotal,
                'balance_due' => round($billTotal - $paidTotal - $debitNoteTotal, 2),
            ];
        })->filter(fn ($row) => $filters['include_zero_balance'] || abs($row['balance_due']) > 0.0001)->values()->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Supplier Code', 'key' => 'supplier_code'],
            ['title' => 'Supplier Name', 'key' => 'supplier_name'],
            ['title' => 'Bill Total', 'key' => 'bill_total'],
            ['title' => 'Paid Total', 'key' => 'paid_total'],
            ['title' => 'Debit Note Total', 'key' => 'debit_note_total'],
            ['title' => 'Balance Due', 'key' => 'balance_due'],
        ], $rows, [], [
            'bill_total' => $this->total($rows, 'bill_total'),
            'paid_total' => $this->total($rows, 'paid_total'),
            'debit_note_total' => $this->total($rows, 'debit_note_total'),
            'balance_due' => $this->total($rows, 'balance_due'),
        ]);
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
        $payments = $this->paymentsByBill($bills->pluck('id')->all(), $filters, $filters['ageing_as_of_date']);
        $asOf = Carbon::parse($filters['ageing_as_of_date']);
        $rows = $bills->map(function ($bill) use ($asOf, $payments) {
            $paidTotal = $this->toFloat($payments[$bill->id] ?? 0);
            $balanceDue = round($this->toFloat($bill->total) - $paidTotal, 2);
            $dueDate = Carbon::parse($bill->due_date ?: $bill->bill_date);
            $ageDays = $dueDate->diffInDays($asOf, false);

            return [
                'bill_no' => $bill->bill_no,
                'bill_date' => $bill->bill_date?->format('Y-m-d'),
                'due_date' => $bill->due_date?->format('Y-m-d') ?: $bill->bill_date?->format('Y-m-d'),
                'supplier' => $bill->contact?->name,
                'bill_total' => $this->toFloat($bill->total),
                'paid_total' => $paidTotal,
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
        $openingPayments = $this->supplierPaymentBase($filters, $supplierId)->whereDate('payment_date', '<', $filters['date_from'])->sum('amount');
        $openingDebitNotes = $this->debitNoteBase($filters, $supplierId)->whereDate('debit_note_date', '<', $filters['date_from'])->sum('total');
        $opening = round($this->toFloat($openingBills->sum('total')) - $this->toFloat($openingPayments) - $this->toFloat($openingDebitNotes), 2);
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

        $events = [];
        foreach ($this->billBase([...$filters, 'supplier_id' => $supplierId])->whereBetween('bill_date', [$filters['date_from'], $filters['date_to']])->get() as $bill) {
            $events[] = [
                'date' => $bill->bill_date?->format('Y-m-d'), 'document_type' => 'Purchase Bill',
                'document_no' => $bill->bill_no, 'reference' => $bill->reference,
                'debit' => 0, 'credit' => $this->toFloat($bill->total), 'amount' => $this->toFloat($bill->total),
            ];
        }
        foreach ($this->supplierPaymentBase($filters, $supplierId)->whereBetween('payment_date', [$filters['date_from'], $filters['date_to']])->get() as $payment) {
            $events[] = [
                'date' => $payment->payment_date?->format('Y-m-d'), 'document_type' => 'Supplier Payment',
                'document_no' => $payment->payment_no, 'reference' => $payment->reference,
                'debit' => $this->toFloat($payment->amount), 'credit' => 0, 'amount' => -$this->toFloat($payment->amount),
            ];
        }
        foreach ($this->debitNoteBase($filters, $supplierId)->whereBetween('debit_note_date', [$filters['date_from'], $filters['date_to']])->get() as $note) {
            $events[] = [
                'date' => $note->debit_note_date?->format('Y-m-d'), 'document_type' => 'Debit Note',
                'document_no' => $note->debit_note_no, 'reference' => $note->reference,
                'debit' => $this->toFloat($note->total), 'credit' => 0, 'amount' => -$this->toFloat($note->total),
            ];
        }
        foreach (collect($events)->sortBy('date') as $event) {
            $running += (float) $event['amount'];
            unset($event['amount']);
            $event['balance'] = round($running, 2);
            $rows[] = [
                ...$event,
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

    private function paymentsByBill(array $billIds, array $filters, string $asOf): array
    {
        return SupplierPaymentLine::query()
            ->join('supplier_payments', 'supplier_payments.id', '=', 'supplier_payment_lines.supplier_payment_id')
            ->select('supplier_payment_lines.purchase_bill_id', DB::raw('SUM(supplier_payment_lines.allocated_amount) as paid_total'))
            ->whereIn('supplier_payment_lines.purchase_bill_id', $billIds)
            ->whereDate('supplier_payments.payment_date', '<=', $asOf)
            ->where(fn ($query) => $query->where('supplier_payments.void', false)->orWhereNull('supplier_payments.void'))
            ->when(empty($filters['include_draft']), fn ($query) => $query->where('supplier_payments.approved', true)->where('supplier_payments.status', '!=', 'draft'))
            ->when(! empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('supplier_payments.branch_id', $filters['branch_id']))
            ->groupBy('supplier_payment_lines.purchase_bill_id')
            ->pluck('paid_total', 'purchase_bill_id')
            ->map(fn ($value) => $this->toFloat($value))
            ->all();
    }

    private function debitNotesBySupplier(array $contactIds, array $filters, string $asOf): array
    {
        $query = DebitNote::query()->select('contact_id', DB::raw('SUM(total) as total'))
            ->whereIn('contact_id', $contactIds)->whereDate('debit_note_date', '<=', $asOf)->groupBy('contact_id');
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        return $query->pluck('total', 'contact_id')->map(fn ($value) => $this->toFloat($value))->all();
    }

    private function supplierPaymentBase(array $filters, ?string $supplierId)
    {
        $query = SupplierPayment::query()->where('contact_id', $supplierId);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        return $query;
    }

    private function debitNoteBase(array $filters, ?string $supplierId)
    {
        $query = DebitNote::query()->where('contact_id', $supplierId);
        $this->applyBranchFilter($query, $filters);
        $this->applyStatusApprovalFilters($query, $filters);

        return $query;
    }
}
