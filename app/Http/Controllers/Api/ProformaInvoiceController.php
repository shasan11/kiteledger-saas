<?php

namespace App\Http\Controllers\Api;

use App\Models\ProformaInvoice;
use App\Models\ProformaInvoiceLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ProformaInvoiceController extends BaseCrudApiController
{
    protected string $modelClass = ProformaInvoice::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch', 'contact', 'currency'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'currency' => 'currency_id'];
    protected array $searchable = ['proforma_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $dateRangeFilters = ['proforma_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'proforma_no', 'proforma_date', 'status', 'total', 'created_at', 'updated_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'proformaInvoiceLines',
            'model' => ProformaInvoiceLine::class,
            'foreign_key' => 'proforma_invoice_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['product', 'taxRate'],
            'relation_details' => ['product' => 'product_id', 'taxRate' => 'tax_rate_id'],
            'rules' => [
                'product_id' => ['nullable', 'uuid', 'exists:products,id', 'required_without:custom_product_name'],
                'custom_product_name' => ['nullable', 'string', 'max:180', 'required_without:product_id'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'gt:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
            'update_rules' => [
                'product_id' => ['nullable', 'uuid', 'exists:products,id', 'required_without:custom_product_name'],
                'custom_product_name' => ['nullable', 'string', 'max:180', 'required_without:product_id'],
                'description' => ['nullable', 'string', 'max:200'],
                'qty' => ['required', 'numeric', 'gt:0'],
                'unit_price' => ['required', 'numeric', 'min:0'],
                'discount_percent' => ['nullable', 'numeric', 'min:0', 'max:100'],
                'tax_rate_id' => ['nullable', 'uuid', 'exists:tax_rates,id'],
                'tax_amount' => ['nullable', 'numeric', 'min:0'],
                'line_total' => ['nullable', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'proforma_no' => ['nullable', 'string', 'max:40', 'unique:proforma_invoices,proforma_no'],
        'reference' => ['nullable', 'string', 'max:120'],
        'proforma_date' => ['required', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'notes' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,issued,cancelled'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'proforma_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:proforma_invoices,proforma_no,' . $record->id . ',id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'proforma_date' => ['sometimes', 'required', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,issued,cancelled'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $lines = $record->proformaInvoiceLines()->with('taxRate')->get();

        if ($lines->count() < 1) {
            $this->throwValidation([
                'items' => ['At least one proforma invoice item is required.'],
            ]);
        }

        $total = 0;

        foreach ($lines as $line) {
            $qty = (float) $line->qty;
            $unitPrice = (float) $line->unit_price;
            $discountPercent = (float) ($line->discount_percent ?? 0);
            $baseAmount = $qty * $unitPrice;
            $discountAmount = $baseAmount * ($discountPercent / 100);
            $taxableAmount = max($baseAmount - $discountAmount, 0);
            $taxAmount = $line->taxRate
                ? $taxableAmount * ((float) ($line->taxRate->rate_percent ?? 0) / 100)
                : (float) ($line->tax_amount ?? 0);
            $lineTotal = $taxableAmount + $taxAmount;

            $line->forceFill([
                'tax_amount' => round($taxAmount, 2),
                'line_total' => round($lineTotal, 2),
            ])->save();

            $total += $lineTotal;
        }

        $record->forceFill(['total' => round($total, 2)])->save();

        return $record;
    }
}
