<?php

namespace App\Http\Controllers\Api;

use App\Models\CustomerPayment;
use App\Models\CustomerPaymentLine;
use App\Models\Invoice;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
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

    protected array $relations = ['branch', 'contact', 'account', 'currency', 'bankChargesAccount', 'tdsChargesAccount', 'customerPaymentLines', 'customerPaymentLines.invoice'];
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
                'allocated_amount' => ['required', 'numeric', 'gt:0'],
            ],
            'update_rules' => [
                'invoice_id' => ['required', 'uuid', 'exists:invoices,id'],
                'allocated_amount' => ['required', 'numeric', 'gt:0'],
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
        $this->validatePaymentAllocations($parentData, $nestedData);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(array $parentData, array $nestedData, Model $record): array
    {
        $this->validatePaymentAllocations($parentData, $nestedData, $record);

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $record->forceFill(['total' => (float) $record->amount])->save();
        Invoice::recalculatePaymentTotalsForContact($record->contact_id);

        return $record;
    }

    public function transactionApprove(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $approved = app(TransactionApprovalService::class)->approve(
            $record,
            $request->user()?->getAuthIdentifier()
        );

        Invoice::recalculatePaymentTotalsForContact($approved->contact_id);

        return response()->json($this->serializeRecord($approved->refresh()));
    }

    public function transactionVoid(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $data = $this->validateCompat($request->all(), [
            'voided_reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $voided = app(TransactionVoidService::class)->void(
            $record,
            $data['voided_reason'],
            $request->user()?->getAuthIdentifier()
        );

        Invoice::recalculatePaymentTotalsForContact($voided->contact_id);

        return response()->json($this->serializeRecord($voided->refresh()));
    }

    public function bulkApprove(Request $request)
    {
        $response = parent::bulkApprove($request);
        $this->recalculateContactsForIds((array) $request->input('ids', []));

        return $response;
    }

    public function bulkVoid(Request $request)
    {
        $response = parent::bulkVoid($request);
        $this->recalculateContactsForIds((array) $request->input('ids', []));

        return $response;
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);
        $contactId = $record->contact_id;

        $response = parent::destroy($request, $id);
        Invoice::recalculatePaymentTotalsForContact($contactId);

        return $response;
    }

    public function bulkDestroy(Request $request)
    {
        $ids = (array) $request->input('ids', []);
        $contactIds = CustomerPayment::query()
            ->whereIn('id', $ids)
            ->pluck('contact_id')
            ->filter()
            ->unique()
            ->values();

        $response = parent::bulkDestroy($request);

        $contactIds->each(fn ($contactId) => Invoice::recalculatePaymentTotalsForContact($contactId));

        return $response;
    }

    private function validatePaymentAllocations(array $parentData, array $nestedData, ?Model $record = null): void
    {
        $rows = array_key_exists('items', $nestedData)
            ? collect($nestedData['items'] ?? [])
            : ($record
                ? $record->customerPaymentLines()->get()->map(fn ($line) => [
                'id' => $line->id,
                'invoice_id' => $line->invoice_id,
                'allocated_amount' => $line->allocated_amount,
                ])
                : collect());

        $amount = (float) ($parentData['amount'] ?? $record?->amount ?? 0);
        $contactId = $parentData['contact_id'] ?? $record?->contact_id;
        $seen = [];
        $allocated = 0;

        foreach ($rows as $index => $row) {
            $invoiceId = $row['invoice_id'] ?? null;
            $lineAmount = (float) ($row['allocated_amount'] ?? 0);

            if (!$invoiceId) {
                $this->throwValidation(["items.{$index}.invoice_id" => ['Invoice is required.']]);
            }

            if (isset($seen[$invoiceId])) {
                $this->throwValidation(["items.{$index}.invoice_id" => ['The same invoice cannot be allocated more than once in one payment.']]);
            }
            $seen[$invoiceId] = true;

            if ($lineAmount <= 0) {
                $this->throwValidation(["items.{$index}.allocated_amount" => ['Allocated amount must be greater than zero.']]);
            }

            $invoice = Invoice::query()->find($invoiceId);
            if (!$invoice) {
                $this->throwValidation(["items.{$index}.invoice_id" => ['Selected invoice was not found.']]);
            }

            $invoice->recalculatePaymentTotals();

            if ($contactId && $invoice->contact_id !== $contactId) {
                $this->throwValidation(["items.{$index}.invoice_id" => ['Selected invoice does not belong to this customer.']]);
            }

            if ((bool) $invoice->void || $invoice->status === 'void') {
                $this->throwValidation(["items.{$index}.invoice_id" => ['Voided invoices cannot receive payments.']]);
            }

            if (!(bool) $invoice->approved || !in_array($invoice->status, ['posted', 'part_paid', 'paid'], true)) {
                $this->throwValidation(["items.{$index}.invoice_id" => ['Only approved posted invoices can receive payments.']]);
            }

            $existingAllocation = ($record && (bool) $record->approved && !(bool) $record->void)
                ? (float) CustomerPaymentLine::query()
                    ->where('customer_payment_id', $record->getKey())
                    ->where('invoice_id', $invoiceId)
                    ->sum('allocated_amount')
                : 0;

            $availableBalance = (float) $invoice->balance_due + $existingAllocation;
            if ($lineAmount > round($availableBalance, 2)) {
                $this->throwValidation(["items.{$index}.allocated_amount" => [
                    sprintf('Allocated amount %.2f exceeds invoice balance %.2f.', $lineAmount, $availableBalance),
                ]]);
            }

            $allocated += $lineAmount;
        }

        if ($allocated > $amount) {
            $this->throwValidation(['items' => ['Allocated amount total cannot exceed payment amount.']]);
        }
    }

    private function recalculateContactsForIds(array $ids): void
    {
        CustomerPayment::query()
            ->whereIn('id', array_values(array_unique(array_filter($ids))))
            ->pluck('contact_id')
            ->filter()
            ->unique()
            ->each(fn ($contactId) => Invoice::recalculatePaymentTotalsForContact($contactId));
    }
}
