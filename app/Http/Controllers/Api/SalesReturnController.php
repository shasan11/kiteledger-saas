<?php

namespace App\Http\Controllers\Api;

use App\Models\SalesReturn;
use App\Models\SalesReturnLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SalesReturnController extends BaseCrudApiController
{
    protected string $modelClass = SalesReturn::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;
    protected bool $fiscalYearScoped = true;
    protected ?string $businessDateColumn = 'sales_return_date';

    protected array $relations = ['branch', 'contact', 'warehouse', 'currency', 'refundAccount', 'userAdd', 'approvedBy'];
    protected array $relationDetails = ['branch' => 'branch_id', 'contact' => 'contact_id', 'warehouse' => 'warehouse_id', 'currency' => 'currency_id', 'refundAccount' => 'refund_account_id'];
    protected array $searchable = ['sales_return_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'warehouse_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $amountRangeFilters = ['total' => ['min' => 'amount_min', 'max' => 'amount_max']];
    protected array $dateRangeFilters = ['sales_return_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'sales_return_no', 'sales_return_date', 'status', 'total', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'salesReturnLines',
            'model' => SalesReturnLine::class,
            'foreign_key' => 'sales_return_id',
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

    protected function prepareIncomingPayload(array $input): array
    {
        $input = parent::prepareIncomingPayload($input);

        if (array_key_exists('note_number', $input) && !array_key_exists('sales_return_no', $input)) {
            $input['sales_return_no'] = $input['note_number'];
        }

        if (array_key_exists('date', $input) && !array_key_exists('sales_return_date', $input)) {
            $input['sales_return_date'] = $input['date'];
        }

        $hasRefund = filter_var($input['has_refund'] ?? false, FILTER_VALIDATE_BOOLEAN);
        $input['has_refund'] = $hasRefund;
        if (! $hasRefund) {
            $input['refund_account_id'] = null;
            $input['refund_reference'] = null;
            $input['refund_amount'] = null;
        }

        return $input;
    }

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'sales_return_no' => ['nullable', 'string', 'max:40', 'unique:sales_returns,sales_return_no'],
        'sales_return_date' => ['required', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'warehouse_id' => ['nullable', 'uuid', 'exists:warehouses,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'remarks' => ['nullable', 'string'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'status' => ['nullable', 'in:draft,posted,cancelled'],
        'has_refund' => ['nullable', 'boolean'],
        'refund_account_id' => ['nullable', 'required_if:has_refund,1,true', 'uuid', 'exists:accounts,id'],
        'refund_reference' => ['nullable', 'string', 'max:120'],
        'refund_amount' => ['nullable', 'required_if:has_refund,1,true', 'numeric', 'gt:0'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'sales_return_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:sales_returns,sales_return_no,' . $record->id . ',id'],
            'sales_return_date' => ['sometimes', 'required', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'warehouse_id' => ['sometimes', 'nullable', 'uuid', 'exists:warehouses,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'remarks' => ['sometimes', 'nullable', 'string'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
            'has_refund' => ['sometimes', 'nullable', 'boolean'],
            'refund_account_id' => ['sometimes', 'nullable', 'required_if:has_refund,1,true', 'uuid', 'exists:accounts,id'],
            'refund_reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'refund_amount' => ['sometimes', 'nullable', 'required_if:has_refund,1,true', 'numeric', 'gt:0'],
        ];
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $lines = $record->salesReturnLines()->with('taxRate')->get();

        if ($lines->count() < 1) {
            $this->throwValidation([
                'items' => ['At least one sales return item is required.'],
            ]);
        }

        $total = 0;

        foreach ($lines as $line) {
            $qty = (float) $line->qty;
            $unitPrice = (float) $line->unit_price;
            $taxableAmount = $qty * $unitPrice;
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

        if ((bool) $record->has_refund) {
            $refundAmount = (float) ($record->refund_amount ?? 0);
            if ($refundAmount <= 0) {
                $this->throwValidation(['refund_amount' => ['Refund amount is required when refund is enabled.']]);
            }
            if (round($refundAmount, 2) > round((float) $record->total, 2)) {
                $this->throwValidation(['refund_amount' => ['Refund amount cannot exceed the credit note total.']]);
            }
            if (empty($record->refund_account_id)) {
                $this->throwValidation(['refund_account_id' => ['Refund account is required when refund is enabled.']]);
            }
        }

        return $record;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        $data = parent::mutateSerializedRecord($data, $record);

        $data['note_number'] = $data['sales_return_no'] ?? null;
        $data['date'] = $data['sales_return_date'] ?? null;
        $data['reference_no'] = $data['reference'] ?? null;
        $data['grand_total'] = $data['total'] ?? 0;

        return $data;
    }
}
