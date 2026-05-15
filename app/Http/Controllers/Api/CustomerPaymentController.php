<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerPayment;
use App\Models\CustomerPaymentLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class CustomerPaymentController extends BaseCrudApiController
{
    protected string $modelClass = CustomerPayment::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = ['branch', 'contact', 'account', 'currency', 'bankChargesAccount', 'tdsChargesAccount'];
    protected array $relationDetails = [
        'branch' => 'branch_id',
        'contact' => 'contact_id',
        'account' => 'account_id',
        'currency' => 'currency_id',
        'bankChargesAccount' => 'bank_charges_account_id',
        'tdsChargesAccount' => 'tds_charges_account_id',
    ];
    protected array $searchable = ['payment_no', 'reference', 'notes', 'status'];
    protected array $filterable = ['branch_id', 'contact_id', 'account_id', 'currency_id', 'status'];
    protected array $booleanFilters = ['active', 'approved', 'void'];
    protected array $amountRangeFilters = ['amount' => ['min' => 'amount_min', 'max' => 'amount_max']];
    protected array $dateRangeFilters = ['payment_date' => ['from' => 'date_from', 'to' => 'date_to']];
    protected array $sortable = ['id', 'payment_no', 'payment_date', 'amount', 'total', 'status', 'created_at'];
    protected string $defaultSort = '-created_at';

    protected array $nested = [
        'items' => [
            'relation' => 'customerPaymentLines',
            'model' => CustomerPaymentLine::class,
            'foreign_key' => 'customer_payment_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['invoice'],
            'relation_details' => ['invoice' => 'invoice_id'],
            'rules' => [
                'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
                'allocated_amount' => ['required', 'numeric', 'min:0'],
            ],
            'update_rules' => [
                'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
                'allocated_amount' => ['required', 'numeric', 'min:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'payment_no' => ['nullable', 'string', 'max:40', 'unique:customer_payments,payment_no'],
        'payment_date' => ['required', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'amount' => ['required', 'numeric', 'min:0'],
        'payment_method' => ['nullable', 'string', 'max:20'],
        'bank_charges_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'bank_charges' => ['nullable', 'numeric', 'min:0'],
        'tds_charges_account_id' => ['nullable', 'uuid', 'exists:chart_of_accounts,id'],
        'tds_type' => ['nullable', 'string', 'max:20'],
        'tds_charges' => ['nullable', 'numeric', 'min:0'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'status' => ['nullable', 'in:draft,posted,cancelled'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'payment_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:customer_payments,payment_no,' . $record->id . ',id'],
            'payment_date' => ['sometimes', 'required', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'amount' => ['sometimes', 'required', 'numeric', 'min:0'],
            'payment_method' => ['sometimes', 'nullable', 'string', 'max:20'],
            'bank_charges_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:chart_of_accounts,id'],
            'bank_charges' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tds_charges_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:chart_of_accounts,id'],
            'tds_type' => ['sometimes', 'nullable', 'string', 'max:20'],
            'tds_charges' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $allocated = collect($nestedData['items'] ?? [])->sum(fn ($row) => (float) ($row['allocated_amount'] ?? 0));
        if ($allocated > (float) ($parentData['amount'] ?? 0)) {
            abort(422, 'Allocated amount total cannot exceed payment amount.');
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $amount = (float) ($parentData['amount'] ?? $record->amount ?? 0);
        if (array_key_exists('items', $nestedData)) {
            $allocated = collect($nestedData['items'])->sum(fn ($row) => (float) ($row['allocated_amount'] ?? 0));
            if ($allocated > $amount) {
                abort(422, 'Allocated amount total cannot exceed payment amount.');
            }
        }

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $record->forceFill(['total' => (float) $record->amount])->save();

        return $record;
    }
}
