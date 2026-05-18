<?php

namespace App\Http\Controllers\Api;

use App\Models\AppSetting;
use App\Models\PurchaseBill;
use App\Models\PurchaseBillLine;
use App\Models\TaxRate;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class PurchaseBillController extends BaseCrudApiController
{
    protected string $modelClass = PurchaseBill::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch', 'contact', 'warehouse', 'currency', 'supplierPaymentLines', 'supplierPaymentLines.supplierPayment'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'warehouse' => 'warehouse_id', 'currency' => 'currency_id'];
    protected array $searchable = ['bill_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'warehouse_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $amountRangeFilters = ['total' => ['min' => 'amount_min', 'max' => 'amount_max']];
    protected array $dateRangeFilters = ['bill_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'bill_no', 'bill_date', 'due_date', 'status', 'total', 'paid_total', 'balance_due', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'purchaseBillLines',
            'model' => PurchaseBillLine::class,
            'foreign_key' => 'purchase_bill_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['product', 'taxRate'],
            'relation_details' => ['product' => 'product_id', 'taxRate' => 'tax_rate_id'],
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
        'bill_no' => ['nullable', 'string', 'max:40', 'unique:purchase_bills,bill_no'],
        'bill_date' => ['required', 'date'],
        'due_date' => ['nullable', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'import_country' => ['nullable', 'string', 'max:80'],
        'import_date' => ['nullable', 'date'],
        'import_document_number' => ['nullable', 'string', 'max:80'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'paid_total' => ['nullable', 'numeric', 'min:0'],
        'balance_due' => ['nullable', 'numeric', 'min:0'],
        'approved' => ['nullable', 'boolean'],
        'status' => ['nullable', 'in:draft,posted,part_paid,paid,void'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'bill_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:purchase_bills,bill_no,' . $record->id . ',id'],
            'bill_date' => ['sometimes', 'required', 'date'],
            'due_date' => ['sometimes', 'nullable', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'import_country' => ['sometimes', 'nullable', 'string', 'max:80'],
            'import_date' => ['sometimes', 'nullable', 'date'],
            'import_document_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'paid_total' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'balance_due' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,part_paid,paid,void'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $total = (float) $record->purchaseBillLines()->sum('line_total');

        $record->forceFill([
            'total' => $total,
        ])->saveQuietly();

        $record->recalculatePaymentTotals();

        $this->enforcePurchaseSettings($record);

        return $record->refresh();
    }

    private function enforcePurchaseSettings(Model $record): void
    {
        // Purchases add stock rather than deplete it, so negative_item_balance
        // enforcement belongs on the sales side. Kept for future purchase rules.
    }

    protected function mutateNestedRowBeforeSave(
        array $row,
        Model $parent,
        array $config,
        bool $isUpdate
    ): array {
        $row['tax_amount'] = $this->calculateTaxAmount($row);
        $row['line_total'] = $this->calculateLineTotal($row);

        return $row;
    }

    protected function calculateLineTotal(array $row): float
    {
        $gross = (float) ($row['qty'] ?? 0) * (float) ($row['unit_price'] ?? 0);
        $discountType = $row['discount_type'] ?? 'percent';
        $discountAmount = $discountType === 'amount'
            ? min((float) ($row['discount_amount'] ?? 0), $gross)
            : round($gross * ((float) ($row['discount_percent'] ?? 0) / 100), 2);

        $taxableAmount = max($gross - $discountAmount, 0);

        return round($taxableAmount + $this->calculateTaxAmount($row, $taxableAmount), 2);
    }

    protected function calculateTaxAmount(array $row, ?float $taxableAmount = null): float
    {
        if (empty($row['tax_rate_id'])) {
            return (float) ($row['tax_amount'] ?? 0);
        }

        $taxRate = TaxRate::query()->find($row['tax_rate_id']);
        if (!$taxRate) {
            return (float) ($row['tax_amount'] ?? 0);
        }

        if ($taxableAmount === null) {
            $gross = (float) ($row['qty'] ?? 0) * (float) ($row['unit_price'] ?? 0);
            $discountType = $row['discount_type'] ?? 'percent';
            $discountAmount = $discountType === 'amount'
                ? min((float) ($row['discount_amount'] ?? 0), $gross)
                : round($gross * ((float) ($row['discount_percent'] ?? 0) / 100), 2);
            $taxableAmount = max($gross - $discountAmount, 0);
        }

        return round($taxableAmount * ((float) $taxRate->rate_percent / 100), 2);
    }
}
