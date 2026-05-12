<?php

namespace App\Http\Controllers\Api;

use App\Models\Invoice;
use App\Models\InvoiceLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class InvoiceController extends BaseCrudApiController
{
    protected string $modelClass = Invoice::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch', 'contact', 'warehouse', 'currency', 'customerPaymentLines', 'customerPaymentLines.customerPayment'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'warehouse' => 'warehouse_id', 'currency' => 'currency_id'];
    protected array $searchable = ['invoice_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'warehouse_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $dateRangeFilters = ['invoice_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'invoice_no', 'invoice_date', 'due_date', 'status', 'total', 'paid_total', 'balance_due', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'invoiceLines',
            'model' => InvoiceLine::class,
            'foreign_key' => 'invoice_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['product', 'taxRate', 'taxJurisdiction'],
            'relation_details' => ['product' => 'product_id', 'taxRate' => 'tax_rate_id', 'taxJurisdiction' => 'tax_jurisdiction_id'],
            'rules' => [
                'product_id' => ['nullable', 'uuid', 'exists:products,id'],
                'product_name' => ['nullable', 'string', 'max:255'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'gt:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_type' => ['nullable', 'string', 'in:percent,amount'],
                'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'discount_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_breakup' => ['nullable'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
            'update_rules' => [
                'product_id' => ['nullable', 'uuid', 'exists:products,id'],
                'product_name' => ['nullable', 'string', 'max:255'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'gt:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_type' => ['nullable', 'string', 'in:percent,amount'],
                'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'discount_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_jurisdiction_id' => ['nullable', 'uuid', 'exists:tax_jurisdictions,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'tax_breakup' => ['nullable'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'invoice_no' => ['nullable', 'string', 'max:40', 'unique:invoices,invoice_no'],
        'invoice_date' => ['required', 'date'],
        'due_date' => ['nullable', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'paid_total' => ['nullable', 'numeric', 'min:0'],
        'balance_due' => ['nullable', 'numeric', 'min:0'],
        'export_country' => ['nullable', 'string', 'max:80'],
        'export_date' => ['nullable', 'date'],
        'export_document_number' => ['nullable', 'string', 'max:80'],
        'status' => ['nullable', 'in:draft,posted,part_paid,paid,void'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'invoice_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:invoices,invoice_no,' . $record->id . ',id'],
            'invoice_date' => ['sometimes', 'required', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'paid_total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'balance_due' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'export_country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'export_date' => ['sometimes', 'nullable', 'date'],
            'export_document_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,part_paid,paid,void'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $lines = $record->invoiceLines()->with('taxRate')->get();

        if ($lines->count() < 1) {
            $this->throwValidation([
                'items' => ['At least one invoice item is required.'],
            ]);
        }

        $total = 0;
        foreach ($lines as $line) {
            $qty = (float) $line->qty;
            $unitPrice = (float) $line->unit_price;
            $gross = round($qty * $unitPrice, 2);

            $discountType = $line->discount_type ?: 'percent';
            $discountAmount = (float) ($line->discount_amount ?? 0);
            $discountPercent = (float) ($line->discount_percent ?? 0);

            if ($discountType === 'amount') {
                $discountAmount = max(0, min($discountAmount, $gross));
                $discountPercent = $gross > 0 ? round(($discountAmount / $gross) * 100, 4) : 0;
            } else {
                $discountPercent = max(0, min($discountPercent, 100));
                $discountAmount = round($gross * ($discountPercent / 100), 2);
            }

            $taxableAmount = max($gross - $discountAmount, 0);
            $taxAmount = $line->taxRate
                ? round($taxableAmount * ((float) ($line->taxRate->rate_percent ?? 0) / 100), 2)
                : (float) ($line->tax_amount ?? 0);
            $lineTotal = round($taxableAmount + $taxAmount, 2);

            $line->forceFill([
                'discount_type' => $discountType,
                'discount_percent' => $discountPercent,
                'discount_amount' => $discountAmount,
                'tax_amount' => $taxAmount,
                'line_total' => $lineTotal,
            ])->save();

            $total += $lineTotal;
        }

        $paidTotal = (float) ($record->paid_total ?? 0);
        $record->forceFill([
            'total' => round($total, 2),
            'balance_due' => round($total - $paidTotal, 2),
        ])->save();

        return $record->fresh([
            'branch', 'contact', 'warehouse', 'currency',
            'invoiceLines.product', 'invoiceLines.taxRate', 'invoiceLines.taxJurisdiction',
        ]);
    }
}
