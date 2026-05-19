<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use App\Models\InventoryAdjustment;
use App\Models\ProductionOrder;
use App\Models\ProductionJournal;
use App\Services\Inventory\WarehouseStockService;

class TransactionApprovalService
{
    protected array $accountingModels = [
        'Invoice',
        'CustomerPayment',
        'PurchaseBill',
        'SupplierPayment',
        'Expense',
        'CashTransfer',
        'ChequeRegister',
        'SalesReturn',
        'DebitNote',
        'InventoryAdjustment',
        'ProductionOrder',
        'ProductionJournal',
        'LoanTopUp',
        'LoanCharge',
    ];

    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected LedgerValidationService $validationService,
        protected ParallelJournalVoucherService $jvService,
        protected WarehouseStockService $warehouseStockService,
    ) {
    }

    public function approve(Model $transaction, ?int $approvedById = null): Model
    {
        return DB::transaction(function () use ($transaction, $approvedById) {
            $fresh = $transaction->newQuery()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ($this->validationService->hasApprovedField($fresh) && $fresh->approved) {
                return $fresh->refresh();
            }

            $this->validationService->validateCanApprove($fresh);

            if ($this->validationService->hasApprovedField($fresh)) {
                $fresh->approved = true;
                $fresh->approved_at = now();
                if ($approvedById) {
                    $fresh->approved_by_id = $approvedById;
                }
            }

            $numberField = $this->getNumberField($fresh);
            if ($numberField && (!$fresh->{$numberField} || str_starts_with((string) $fresh->{$numberField}, '#draft'))) {
                $number = $this->numberingService->generateForApprovedModel($fresh);
                if ($number) {
                    $fresh->{$numberField} = $number;
                }
            }

            $this->markPostedIfSupported($fresh);

            $fresh->saveQuietly();

            if ($fresh instanceof \App\Models\Invoice) {
                $fresh->recalculatePaymentTotals();
            }

            if ($fresh instanceof \App\Models\PurchaseBill) {
                $fresh->recalculatePaymentTotals();
            }

            if ($fresh instanceof InventoryAdjustment) {
                $this->warehouseStockService->postInventoryAdjustment($fresh);
            }

            if ($fresh instanceof ProductionOrder) {
                return app(\App\Services\Manufacturing\ProductionPostingService::class)
                    ->approve($fresh, $approvedById)
                    ->refresh();
            }

            if ($fresh instanceof ProductionJournal) {
                return app(\App\Services\Inventory\ProductionPostingService::class)
                    ->post($fresh)
                    ->refresh();
            }

            if ($this->isAccountingImpacting($fresh)) {
                $this->jvService->createForApprovedSource($fresh);
            }

            if ($fresh instanceof \App\Models\CustomerPayment) {
                \App\Models\Invoice::recalculatePaymentTotalsForContact($fresh->contact_id);
            }

            if ($fresh instanceof \App\Models\SupplierPayment) {
                \App\Models\PurchaseBill::recalculatePaymentTotalsForContact($fresh->contact_id);
            }

            return $fresh->refresh();
        });
    }

    public function handleApprovedTransition(Model $transaction): void
    {
        if (!$transaction->approved) {
            return;
        }

        DB::transaction(function () use ($transaction) {
            $numberField = $this->getNumberField($transaction);
            if ($numberField && (!$transaction->{$numberField} || str_starts_with((string) $transaction->{$numberField}, '#draft'))) {
                $number = $this->numberingService->generateForApprovedModel($transaction);
                if ($number) {
                    $transaction->saveQuietly([$numberField => $number]);
                }
            }

            if ($this->isAccountingImpacting($transaction)) {
                $this->jvService->createForApprovedSource($transaction);
            }

            if ($transaction instanceof \App\Models\Invoice) {
                $transaction->recalculatePaymentTotals();
            }

            if ($transaction instanceof \App\Models\PurchaseBill) {
                $transaction->recalculatePaymentTotals();
            }

            if ($transaction instanceof \App\Models\CustomerPayment) {
                \App\Models\Invoice::recalculatePaymentTotalsForContact($transaction->contact_id);
            }

            if ($transaction instanceof \App\Models\SupplierPayment) {
                \App\Models\PurchaseBill::recalculatePaymentTotalsForContact($transaction->contact_id);
            }

            if ($transaction instanceof InventoryAdjustment) {
                $this->warehouseStockService->postInventoryAdjustment($transaction);
            }

            if ($transaction instanceof ProductionOrder) {
                app(\App\Services\Manufacturing\ProductionPostingService::class)->approve($transaction);
            }

            if ($transaction instanceof ProductionJournal) {
                app(\App\Services\Inventory\ProductionPostingService::class)->post($transaction);
            }
        });
    }

    public function isAccountingImpacting(Model $transaction): bool
    {
        $modelClass = class_basename($transaction);
        return in_array($modelClass, $this->accountingModels, true);
    }

    public function hasApprovedField(Model $transaction): bool
    {
        return $this->validationService->hasApprovedField($transaction);
    }

    public function hasStatusField(Model $transaction): bool
    {
        return $this->validationService->hasStatusField($transaction);
    }

    public function markPostedIfSupported(Model $transaction): void
    {
        if ($this->validationService->hasStatusField($transaction) && $transaction->status === 'draft') {
            $transaction->status = $this->approvedStatusFor($transaction);
        }
    }

    protected function approvedStatusFor(Model $transaction): string
    {
        return match (true) {
            $transaction instanceof \App\Models\Quotation => 'sent',
            $transaction instanceof \App\Models\SalesOrder => 'confirmed',
            $transaction instanceof \App\Models\ProformaInvoice => 'issued',
            $transaction instanceof \App\Models\PurchaseOrder => 'confirmed',
            $transaction instanceof \App\Models\ProductionOrder => 'approved',
            default => 'posted',
        };
    }

    protected function getNumberField(Model $transaction): ?string
    {
        $modelClass = class_basename($transaction);
        $mapping = $this->numberingService->getMappingForModel($transaction);

        return $mapping['field'] ?? null;
    }
}
