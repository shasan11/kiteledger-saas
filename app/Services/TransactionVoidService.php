<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

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
            $fresh = $transaction->lockForUpdate()->fresh();

            $this->validationService->validateCanVoid($fresh);

            $fresh->void = true;
            $fresh->voided_at = now();
            $fresh->voided_reason = $reason;

            if ($voidedById) {
                $fresh->voided_by_id = $voidedById;
            }

            if ($this->validationService->hasStatusField($fresh)) {
                $fresh->status = 'cancelled';
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
}
