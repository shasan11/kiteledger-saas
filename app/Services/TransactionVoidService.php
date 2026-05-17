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

            $this->validationService->validateCanVoid($fresh);

            if ($fresh instanceof \App\Models\InventoryAdjustment && (bool) $fresh->stock_posted) {
                throw ValidationException::withMessages([
                    'status' => ['Posted inventory adjustments cannot be cancelled or voided.'],
                ]);
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
