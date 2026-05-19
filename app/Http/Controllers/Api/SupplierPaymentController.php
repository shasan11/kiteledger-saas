<?php

namespace App\Http\Controllers\Api;

use App\Models\Account;
use App\Models\AppSetting;
use App\Models\SupplierPayment;
use App\Models\SupplierPaymentLine;
use App\Models\PurchaseBill;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class SupplierPaymentController extends BaseCrudApiController
{
    protected string $modelClass = SupplierPayment::class;
    protected ?string $permissionPrefix = null;
    protected bool $usePolicyAuthorization = false;
    protected bool $branchScoped = true;
    protected bool $autoFillBranchOnCreate = true;
    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'contact',
        'account',
        'currency',
        'bankChargesAccount',
        'tdsChargesAccount',
        'supplierPaymentLines',
        'supplierPaymentLines.purchaseBill',
    ];

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
            'relation' => 'supplierPaymentLines',
            'model' => SupplierPaymentLine::class,
            'foreign_key' => 'supplier_payment_id',
            'delete_key' => 'deleted_item_ids',
            'required' => true,
            'min' => 1,
            'replace_on_update' => false,
            'relations' => ['purchaseBill'],
            'relation_details' => ['purchaseBill' => 'purchase_bill_id'],
            'rules' => [
                'purchase_bill_id' => ['required', 'uuid', 'exists:purchase_bills,id'],
                'allocated_amount' => ['required', 'numeric', 'gt:0'],
            ],
            'update_rules' => [
                'purchase_bill_id' => ['required', 'uuid', 'exists:purchase_bills,id'],
                'allocated_amount' => ['required', 'numeric', 'gt:0'],
            ],
        ],
    ];

    protected array $storeRules = [
        'branch_id' => ['nullable', 'uuid', 'exists:branches,id'],
        'payment_no' => ['nullable', 'string', 'max:40', 'unique:supplier_payments,payment_no'],
        'payment_date' => ['required', 'date'],
        'contact_id' => ['required', 'uuid', 'exists:contacts,id'],
        'account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'currency_id' => ['nullable', 'uuid', 'exists:currencies,id'],
        'amount' => ['required', 'numeric', 'gt:0'],
        'method' => ['nullable', 'string', 'max:20'],
        'reference' => ['nullable', 'string', 'max:120'],
        'notes' => ['nullable', 'string'],
        'bank_charges_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'bank_charges' => ['nullable', 'numeric', 'min:0'],
        'tds_charges_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
        'tds_type' => ['nullable', 'string', 'max:20'],
        'tds_charges' => ['nullable', 'numeric', 'min:0'],
        'exchange_rate' => ['nullable', 'numeric', 'gt:0'],
        'approved' => ['nullable', 'boolean'],
        'status' => ['nullable', 'in:draft,posted,cancelled'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'payment_no' => ['sometimes', 'nullable', 'string', 'max:40', 'unique:supplier_payments,payment_no,' . $record->id . ',id'],
            'payment_date' => ['sometimes', 'required', 'date'],
            'contact_id' => ['sometimes', 'required', 'uuid', 'exists:contacts,id'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'currency_id' => ['sometimes', 'nullable', 'uuid', 'exists:currencies,id'],
            'amount' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'method' => ['sometimes', 'nullable', 'string', 'max:20'],
            'reference' => ['sometimes', 'nullable', 'string', 'max:120'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'bank_charges_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'bank_charges' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'tds_charges_account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'tds_type' => ['sometimes', 'nullable', 'string', 'max:20'],
            'tds_charges' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'exchange_rate' => ['sometimes', 'nullable', 'numeric', 'gt:0'],
            'approved' => ['sometimes', 'nullable', 'boolean'],
            'status' => ['sometimes', 'nullable', 'in:draft,posted,cancelled'],
        ];
    }

    protected function prepareIncomingPayload(array $data): array
    {
        if (($data['payment_no'] ?? null) === 'DRAFT') {
            $data['payment_no'] = null;
        }

        return parent::prepareIncomingPayload($data);
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);
        $this->checkNegativeCashBalance($parentData);
        $this->validatePaymentAllocations($parentData, $nestedData);

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        $this->checkNegativeCashBalance($parentData, $record);
        $this->validatePaymentAllocations($parentData, $nestedData, $record);

        return $parentData;
    }

    protected function afterSave(Model $record, array $parentData, array $nestedData, bool $isUpdate): Model
    {
        $record->forceFill(['total' => (float) $record->amount])->save();
        PurchaseBill::recalculatePaymentTotalsForContact($record->contact_id);

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

        PurchaseBill::recalculatePaymentTotalsForContact($approved->contact_id);

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

        PurchaseBill::recalculatePaymentTotalsForContact($voided->contact_id);

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
        PurchaseBill::recalculatePaymentTotalsForContact($contactId);

        return $response;
    }

    public function bulkDestroy(Request $request)
    {
        $ids = (array) $request->input('ids', []);
        $contactIds = SupplierPayment::query()
            ->whereIn('id', $ids)
            ->pluck('contact_id')
            ->filter()
            ->unique()
            ->values();

        $response = parent::bulkDestroy($request);

        $contactIds->each(fn ($contactId) => PurchaseBill::recalculatePaymentTotalsForContact($contactId));

        return $response;
    }

    private function checkNegativeCashBalance(array $parentData, ?Model $record = null): void
    {
        $config = AppSetting::query()->where('active', true)->oldest()->first();
        $mode = $config?->negative_cash_balance ?? 'warn';
        if ($mode === 'allow') return;
        if ($this->isValidationOverrideConfirmed('negative_cash_balance')) return;

        $accountId = $parentData['account_id'] ?? $record?->account_id;
        if (!$accountId) return;

        $account = Account::find($accountId);
        if (!$account) return;

        $outgoingAmount = (float) ($parentData['amount'] ?? $record?->amount ?? 0)
            + (float) ($parentData['bank_charges'] ?? $record?->bank_charges ?? 0);

        if ($outgoingAmount <= 0) return;

        $currentBalance = (float) ($account->balance ?? 0);
        $projectedBalance = $currentBalance - $outgoingAmount;

        if ($projectedBalance >= 0) return;

        $warningData = [
            'account_name' => $account->name,
            'current_balance' => $currentBalance,
            'outgoing_amount' => $outgoingAmount,
            'projected_balance' => $projectedBalance,
            'negative_amount' => abs($projectedBalance),
        ];

        if (in_array($mode, ['block', 'reject'], true)) {
            $this->throwValidation([
                'account_id' => [
                    sprintf(
                        'Insufficient balance in account "%s". Available: %.2f, Required: %.2f.',
                        $account->name,
                        $currentBalance,
                        $outgoingAmount
                    ),
                ],
            ]);
        } else {
            $this->throwValidationWarning(['negative_cash_balance' => $warningData]);
        }
    }

    private function validatePaymentAllocations(array $parentData, array $nestedData, ?Model $record = null): void
    {
        $rows = array_key_exists('items', $nestedData)
            ? collect($nestedData['items'] ?? [])
            : ($record
                ? $record->supplierPaymentLines()->get()->map(fn ($line) => [
                    'id' => $line->id,
                    'purchase_bill_id' => $line->purchase_bill_id,
                    'allocated_amount' => $line->allocated_amount,
                ])
                : collect());

        $amount = (float) ($parentData['amount'] ?? $record?->amount ?? 0);
        $contactId = $parentData['contact_id'] ?? $record?->contact_id;
        $seen = [];
        $allocated = 0;

        foreach ($rows as $index => $row) {
            $billId = $row['purchase_bill_id'] ?? null;
            $lineAmount = (float) ($row['allocated_amount'] ?? 0);

            if (!$billId) {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['Purchase bill is required.']]);
            }

            if (isset($seen[$billId])) {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['The same purchase bill cannot be allocated more than once in one payment.']]);
            }
            $seen[$billId] = true;

            if ($lineAmount <= 0) {
                $this->throwValidation(["items.{$index}.allocated_amount" => ['Allocated amount must be greater than zero.']]);
            }

            $bill = PurchaseBill::query()->find($billId);
            if (!$bill) {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['Selected purchase bill was not found.']]);
            }

            $bill->recalculatePaymentTotals();

            if ($contactId && $bill->contact_id !== $contactId) {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['Selected purchase bill does not belong to this supplier.']]);
            }

            if ((bool) $bill->void || $bill->status === 'void') {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['Voided purchase bills cannot receive payments.']]);
            }

            if (!(bool) $bill->approved || !in_array($bill->status, ['posted', 'part_paid', 'paid'], true)) {
                $this->throwValidation(["items.{$index}.purchase_bill_id" => ['Only approved posted purchase bills can receive payments.']]);
            }

            $existingAllocation = ($record && (bool) $record->approved && !(bool) $record->void)
                ? (float) SupplierPaymentLine::query()
                    ->where('supplier_payment_id', $record->getKey())
                    ->where('purchase_bill_id', $billId)
                    ->sum('allocated_amount')
                : 0;

            $availableBalance = (float) $bill->balance_due + $existingAllocation;
            if ($lineAmount > round($availableBalance, 2)) {
                $this->throwValidation(["items.{$index}.allocated_amount" => [
                    sprintf('Allocated amount %.2f exceeds purchase bill balance %.2f.', $lineAmount, $availableBalance),
                ]]);
            }

            $allocated += $lineAmount;
        }

        if ($allocated > $amount) {
            $this->throwValidation([
                'items' => ['Allocated amount total cannot exceed payment amount.'],
            ]);
        }
    }

    private function validateChargeAccounts(array $parentData, ?Model $record = null): void
    {
        $bankCharges = (float) ($parentData['bank_charges'] ?? $record?->bank_charges ?? 0);
        $bankChargesAccountId = $parentData['bank_charges_account_id'] ?? $record?->bank_charges_account_id;
        if ($bankCharges > 0 && !$bankChargesAccountId) {
            $this->throwValidation([
                'bank_charges_account_id' => ['Bank charges account is required when bank charges are greater than zero.'],
            ]);
        }

        $tdsCharges = (float) ($parentData['tds_charges'] ?? $record?->tds_charges ?? 0);
        $tdsChargesAccountId = $parentData['tds_charges_account_id'] ?? $record?->tds_charges_account_id;
        if ($tdsCharges > 0 && !$tdsChargesAccountId) {
            $this->throwValidation([
                'tds_charges_account_id' => ['TDS charges account is required when TDS charges are greater than zero.'],
            ]);
        }
    }

    private function recalculateContactsForIds(array $ids): void
    {
        SupplierPayment::query()
            ->whereIn('id', array_values(array_unique(array_filter($ids))))
            ->pluck('contact_id')
            ->filter()
            ->unique()
            ->each(fn ($contactId) => PurchaseBill::recalculatePaymentTotalsForContact($contactId));
    }
}
