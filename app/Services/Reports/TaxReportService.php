<?php

namespace App\Services\Reports;

use App\Models\DebitNote;
use App\Models\Expense;
use App\Models\Invoice;
use App\Models\PurchaseBill;
use App\Models\SalesReturn;

class TaxReportService extends BaseReportService
{
    public function build(string $reportKey, array $filters, array $meta): array
    {
        return match ($reportKey) {
            'sales-register' => $this->salesRegister($reportKey, $filters, $meta),
            'sales-return-register' => $this->salesReturnRegister($reportKey, $filters, $meta),
            'purchase-register' => $this->purchaseRegister($reportKey, $filters, $meta),
            'purchase-return-register' => $this->purchaseReturnRegister($reportKey, $filters, $meta),
            'vat-summary' => $this->vatSummary($reportKey, $filters, $meta),
            'tds' => $this->tds($reportKey, $filters, $meta),
            'annex-13' => $this->salesRegister($reportKey, $filters, ['title' => 'Annex 13', 'category_label' => $meta['category_label']]),
            'annex-5-materialised-view' => $this->annexFive($reportKey, $filters, $meta),
            default => throw new \InvalidArgumentException('Unsupported tax report.'),
        };
    }

    protected function salesRegister(string $reportKey, array $filters, array $meta): array
    {
        $rows = Invoice::query()->with(['contact', 'invoiceLines'])
            ->whereBetween('invoice_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()->map(function ($invoice) {
                $vat = $invoice->invoiceLines->sum('tax_amount');
                return [
                    'invoice_date' => $invoice->invoice_date?->format('Y-m-d'),
                    'invoice_no' => $invoice->invoice_no,
                    'customer' => $invoice->contact?->name,
                    'pan_vat_no' => $invoice->contact?->tax_registration_no ?: $invoice->contact?->pan,
                    'taxable_amount' => round($this->toFloat($invoice->total) - $this->toFloat($vat), 2),
                    'non_taxable_amount' => 0,
                    'vat_amount' => round($vat, 2),
                    'total' => $this->toFloat($invoice->total),
                    'export_country' => $invoice->export_country,
                ];
            })->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Invoice Date', 'key' => 'invoice_date'],
            ['title' => 'Invoice No', 'key' => 'invoice_no'],
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'PAN/VAT No', 'key' => 'pan_vat_no'],
            ['title' => 'Taxable Amount', 'key' => 'taxable_amount'],
            ['title' => 'Non Taxable Amount', 'key' => 'non_taxable_amount'],
            ['title' => 'VAT Amount', 'key' => 'vat_amount'],
            ['title' => 'Total', 'key' => 'total'],
            ['title' => 'Export Country', 'key' => 'export_country'],
        ], $rows);
    }

    protected function salesReturnRegister(string $reportKey, array $filters, array $meta): array
    {
        $rows = SalesReturn::query()->with(['contact', 'salesReturnLines'])
            ->whereBetween('sales_return_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()->map(fn ($return) => [
                'invoice_date' => $return->sales_return_date?->format('Y-m-d'),
                'invoice_no' => $return->sales_return_no,
                'customer' => $return->contact?->name,
                'pan_vat_no' => $return->contact?->tax_registration_no ?: $return->contact?->pan,
                'taxable_amount' => round($this->toFloat($return->total) - $this->toFloat($return->salesReturnLines->sum('tax_amount')), 2),
                'non_taxable_amount' => 0,
                'vat_amount' => round($return->salesReturnLines->sum('tax_amount'), 2),
                'total' => $this->toFloat($return->total),
                'export_country' => null,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Return Date', 'key' => 'invoice_date'],
            ['title' => 'Return No', 'key' => 'invoice_no'],
            ['title' => 'Customer', 'key' => 'customer'],
            ['title' => 'PAN/VAT No', 'key' => 'pan_vat_no'],
            ['title' => 'Taxable Amount', 'key' => 'taxable_amount'],
            ['title' => 'Non Taxable Amount', 'key' => 'non_taxable_amount'],
            ['title' => 'VAT Amount', 'key' => 'vat_amount'],
            ['title' => 'Total', 'key' => 'total'],
            ['title' => 'Export Country', 'key' => 'export_country'],
        ], $rows);
    }

    protected function purchaseRegister(string $reportKey, array $filters, array $meta): array
    {
        $rows = PurchaseBill::query()->with(['contact', 'purchaseBillLines'])
            ->whereBetween('bill_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()->map(fn ($bill) => [
                'bill_date' => $bill->bill_date?->format('Y-m-d'),
                'bill_no' => $bill->bill_no,
                'supplier' => $bill->contact?->name,
                'pan_vat_no' => $bill->contact?->tax_registration_no ?: $bill->contact?->pan,
                'taxable_amount' => round($this->toFloat($bill->total) - $this->toFloat($bill->purchaseBillLines->sum('tax_amount')), 2),
                'non_taxable_amount' => 0,
                'vat_amount' => round($bill->purchaseBillLines->sum('tax_amount'), 2),
                'total' => $this->toFloat($bill->total),
                'import_country' => $bill->import_country,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Bill Date', 'key' => 'bill_date'],
            ['title' => 'Bill No', 'key' => 'bill_no'],
            ['title' => 'Supplier', 'key' => 'supplier'],
            ['title' => 'PAN/VAT No', 'key' => 'pan_vat_no'],
            ['title' => 'Taxable Amount', 'key' => 'taxable_amount'],
            ['title' => 'Non Taxable Amount', 'key' => 'non_taxable_amount'],
            ['title' => 'VAT Amount', 'key' => 'vat_amount'],
            ['title' => 'Total', 'key' => 'total'],
            ['title' => 'Import Country', 'key' => 'import_country'],
        ], $rows);
    }

    protected function purchaseReturnRegister(string $reportKey, array $filters, array $meta): array
    {
        $rows = DebitNote::query()->with(['contact', 'debitNoteLines'])
            ->whereBetween('debit_note_date', [$filters['date_from'], $filters['date_to']])
            ->when(!empty($filters['branch_id']) && $filters['branch_id'] !== 'all', fn ($query) => $query->where('branch_id', $filters['branch_id']))
            ->get()->map(fn ($note) => [
                'bill_date' => $note->debit_note_date?->format('Y-m-d'),
                'bill_no' => $note->debit_note_no,
                'supplier' => $note->contact?->name,
                'pan_vat_no' => $note->contact?->tax_registration_no ?: $note->contact?->pan,
                'taxable_amount' => round($this->toFloat($note->total) - $this->toFloat($note->debitNoteLines->sum('tax_amount')), 2),
                'non_taxable_amount' => 0,
                'vat_amount' => round($note->debitNoteLines->sum('tax_amount'), 2),
                'total' => $this->toFloat($note->total),
                'import_country' => null,
            ])->all();

        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Return Date', 'key' => 'bill_date'],
            ['title' => 'Return No', 'key' => 'bill_no'],
            ['title' => 'Supplier', 'key' => 'supplier'],
            ['title' => 'PAN/VAT No', 'key' => 'pan_vat_no'],
            ['title' => 'Taxable Amount', 'key' => 'taxable_amount'],
            ['title' => 'Non Taxable Amount', 'key' => 'non_taxable_amount'],
            ['title' => 'VAT Amount', 'key' => 'vat_amount'],
            ['title' => 'Total', 'key' => 'total'],
            ['title' => 'Import Country', 'key' => 'import_country'],
        ], $rows);
    }

    protected function vatSummary(string $reportKey, array $filters, array $meta): array
    {
        $sales = $this->salesRegister('sales-register', $filters, $meta);
        $salesReturn = $this->salesReturnRegister('sales-return-register', $filters, $meta);
        $purchase = $this->purchaseRegister('purchase-register', $filters, $meta);
        $purchaseReturn = $this->purchaseReturnRegister('purchase-return-register', $filters, $meta);
        $outputVat = $this->total($sales['rows'], 'vat_amount');
        $inputVat = $this->total($purchase['rows'], 'vat_amount');
        $salesReturnVat = $this->total($salesReturn['rows'], 'vat_amount');
        $purchaseReturnVat = $this->total($purchaseReturn['rows'], 'vat_amount');
        $rows = [[
            'output_vat' => $outputVat,
            'input_vat' => $inputVat,
            'sales_return_vat' => $salesReturnVat,
            'purchase_return_vat' => $purchaseReturnVat,
            'net_vat' => round(($outputVat - $salesReturnVat) - ($inputVat - $purchaseReturnVat), 2),
        ]];
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Output VAT from Sales', 'key' => 'output_vat'],
            ['title' => 'Input VAT from Purchase', 'key' => 'input_vat'],
            ['title' => 'VAT on Sales Return', 'key' => 'sales_return_vat'],
            ['title' => 'VAT on Purchase Return', 'key' => 'purchase_return_vat'],
            ['title' => 'Net VAT Payable/Receivable', 'key' => 'net_vat'],
        ], $rows);
    }

    protected function tds(string $reportKey, array $filters, array $meta): array
    {
        $rows = [];
        foreach (\App\Models\CustomerPayment::query()->whereBetween('payment_date', [$filters['date_from'], $filters['date_to']])->where('tds_charges', '>', 0)->get() as $payment) {
            $rows[] = ['date' => $payment->payment_date?->format('Y-m-d'), 'document_no' => $payment->payment_no, 'party' => $payment->contact?->name, 'tds_type' => $payment->tds_type, 'tds_account' => $payment->tdsChargesAccount?->name ?? null, 'base_amount' => $this->toFloat($payment->amount), 'tds_amount' => $this->toFloat($payment->tds_charges), 'reference' => $payment->reference];
        }
        foreach (\App\Models\SupplierPayment::query()->whereBetween('payment_date', [$filters['date_from'], $filters['date_to']])->where('tds_charges', '>', 0)->get() as $payment) {
            $rows[] = ['date' => $payment->payment_date?->format('Y-m-d'), 'document_no' => $payment->payment_no, 'party' => $payment->contact?->name, 'tds_type' => $payment->tds_type, 'tds_account' => $payment->tdsChargesAccount?->name ?? null, 'base_amount' => $this->toFloat($payment->amount), 'tds_amount' => $this->toFloat($payment->tds_charges), 'reference' => $payment->reference];
        }
        foreach (Expense::query()->whereBetween('expense_date', [$filters['date_from'], $filters['date_to']])->where('tds_charges', '>', 0)->get() as $expense) {
            $rows[] = ['date' => $expense->expense_date?->format('Y-m-d'), 'document_no' => $expense->expense_no, 'party' => $expense->contact?->name, 'tds_type' => $expense->tds_type, 'tds_account' => $expense->tdsChargesAccount?->name ?? null, 'base_amount' => $this->toFloat($expense->amount), 'tds_amount' => $this->toFloat($expense->tds_charges), 'reference' => $expense->reference];
        }
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Date', 'key' => 'date'],
            ['title' => 'Document No', 'key' => 'document_no'],
            ['title' => 'Party', 'key' => 'party'],
            ['title' => 'TDS Type', 'key' => 'tds_type'],
            ['title' => 'TDS Account', 'key' => 'tds_account'],
            ['title' => 'Base Amount', 'key' => 'base_amount'],
            ['title' => 'TDS Amount', 'key' => 'tds_amount'],
            ['title' => 'Reference', 'key' => 'reference'],
        ], $rows);
    }

    protected function annexFive(string $reportKey, array $filters, array $meta): array
    {
        $rows = [];
        foreach ($this->salesRegister('sales-register', $filters, $meta)['rows'] as $row) {
            $rows[] = ['fiscal_year' => date('Y', strtotime($row['invoice_date'])), 'document_date' => $row['invoice_date'], 'document_no' => $row['invoice_no'], 'party_name' => $row['customer'], 'pan_vat_no' => $row['pan_vat_no'], 'taxable_amount' => $row['taxable_amount'], 'vat_amount' => $row['vat_amount'], 'total_amount' => $row['total'], 'source_module' => 'Sales', 'status' => 'posted'];
        }
        foreach ($this->purchaseRegister('purchase-register', $filters, $meta)['rows'] as $row) {
            $rows[] = ['fiscal_year' => date('Y', strtotime($row['bill_date'])), 'document_date' => $row['bill_date'], 'document_no' => $row['bill_no'], 'party_name' => $row['supplier'], 'pan_vat_no' => $row['pan_vat_no'], 'taxable_amount' => $row['taxable_amount'], 'vat_amount' => $row['vat_amount'], 'total_amount' => $row['total'], 'source_module' => 'Purchase', 'status' => 'posted'];
        }
        return $this->response($meta['title'], $meta['category_label'], $reportKey, $filters, [
            ['title' => 'Fiscal Year', 'key' => 'fiscal_year'],
            ['title' => 'Document Date', 'key' => 'document_date'],
            ['title' => 'Document No', 'key' => 'document_no'],
            ['title' => 'Party Name', 'key' => 'party_name'],
            ['title' => 'PAN/VAT No', 'key' => 'pan_vat_no'],
            ['title' => 'Taxable Amount', 'key' => 'taxable_amount'],
            ['title' => 'VAT Amount', 'key' => 'vat_amount'],
            ['title' => 'Total Amount', 'key' => 'total_amount'],
            ['title' => 'Source Module', 'key' => 'source_module'],
            ['title' => 'Status', 'key' => 'status'],
        ], $rows);
    }
}
