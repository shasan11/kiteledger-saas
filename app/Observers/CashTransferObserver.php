<?php

namespace App\Observers;

use App\Models\CashTransfer;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\CashTransferService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashTransferObserver
{
    use CapturesAccountingEffect;

    public function saving(CashTransfer $cashTransfer): void
    {
        if (
            $cashTransfer->from_account_id &&
            $cashTransfer->relationLoaded('cashTransferLines')
        ) {
            foreach ($cashTransfer->cashTransferLines as $line) {
                if ($line->to_account_id === $cashTransfer->from_account_id) {
                    throw ValidationException::withMessages([
                        'to_account_id' => 'To account cannot be same as from account.',
                    ]);
                }
            }
        }
    }

    public function updating(CashTransfer $cashTransfer): void
    {
        $fresh = CashTransfer::query()
            ->with('cashTransferLines')
            ->find($cashTransfer->getKey());

        if ($fresh) {
            $oldEffect = app(CashTransferService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($cashTransfer, null, $oldEffect);
        }
    }

    public function saved(CashTransfer $cashTransfer): void
    {
        DB::transaction(function () use ($cashTransfer) {
            $cashTransfer = $cashTransfer->fresh(['cashTransferLines']);

            if (!$cashTransfer || $cashTransfer->cashTransferLines->isEmpty()) {
                return;
            }

            $oldEffect = $this->pullOldEffect($cashTransfer);

            app(CashTransferService::class)->syncFinancials(
                cashTransfer: $cashTransfer,
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(CashTransfer $cashTransfer): void
    {
        if ($cashTransfer->status === 'posted' && !$cashTransfer->void) {
            throw ValidationException::withMessages([
                'cash_transfer' => 'Posted cash transfer cannot be deleted. Void or cancel it instead.',
            ]);
        }
    }
}
