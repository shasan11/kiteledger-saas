<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TransactionVoidService
{
    public function __construct(
        protected LedgerValidationService $validationService,
        protected ParallelJournalVoucherService $jvService,
    ) {
    }

    public function void(Model $transaction, string $reason, ?int $voidedById = null): Model
    {
        return DB::transaction(function () use ($transaction, $reason, $voidedById) {
            $fresh = $transaction->newQuery()
                ->whereKey($transaction->getKey())
                ->lockForUpdate()
                ->firstOrFail();

            if ((bool) ($fresh->void ?? false) || (bool) ($fresh->voided ?? false)) {
                $this->jvService->reverseForSource($fresh, $reason);

                if ($fresh instanceof \App\Models\CustomerPayment) {
                    \App\Models\Invoice::recalculatePaymentTotalsForContact($fresh->contact_id);
                }

                if ($fresh instanceof \App\Models\SupplierPayment) {
                    \App\Models\PurchaseBill::recalculatePaymentTotalsForContact($fresh->contact_id);
                }

                return $fresh->refresh();
            }

            $this->validationService->validateCanVoid($fresh);

            if ($fresh instanceof \App\Models\InventoryAdjustment && (bool) $fresh->stock_posted) {
                throw ValidationException::withMessages([
                    'status' => ['Posted inventory adjustments cannot be cancelled or voided.'],
                ]);
            }

            if ($fresh instanceof \App\Models\ProductionOrder) {
                return app(\App\Services\Manufacturing\ProductionPostingService::class)
                    ->void($fresh, $reason, $voidedById);
            }

            if ($fresh instanceof \App\Models\ProductionJournal && (bool) $fresh->stock_posted) {
                return app(\App\Services\Inventory\ProductionPostingService::class)
                    ->reverse($fresh, $reason, $voidedById);
            }

            if (in_array('void', $fresh->getFillable(), true)) {
                $fresh->void = true;
            } elseif (in_array('voided', $fresh->getFillable(), true)) {
                $fresh->voided = true;
            }

            $fresh->voided_at = now();
            $fresh->voided_reason = $reason;

            if ($voidedById) {
                $fresh->voided_by_id = $voidedById;
            }

            if (in_array('active', $fresh->getFillable(), true)) {
                $fresh->active = false;
            }

            if ($this->validationService->hasStatusField($fresh)) {
                $fresh->status = $this->voidStatusFor($fresh);
            }

            $fresh->saveQuietly();

            $this->jvService->reverseForSource($fresh, $reason);

            if ($fresh instanceof \App\Models\CustomerPayment) {
                \App\Models\Invoice::recalculatePaymentTotalsForContact($fresh->contact_id);
            }

            if ($fresh instanceof \App\Models\SupplierPayment) {
                \App\Models\PurchaseBill::recalculatePaymentTotalsForContact($fresh->contact_id);
            }

            return $fresh->refresh();
        });
    }

    public function cancel(Model $transaction, string $reason, ?int $voidedById = null): Model
    {
        return $this->void($transaction, $reason, $voidedById);
    }

    protected function voidStatusFor(Model $transaction): string
    {
        return in_array(class_basename($transaction), ['Invoice', 'PurchaseBill'], true)
            ? 'void'
            : 'cancelled';
    }
}
