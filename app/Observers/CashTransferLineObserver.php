<?php

namespace App\Observers;

use App\Models\CashTransfer;
use App\Models\CashTransferLine;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\CashTransferService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashTransferLineObserver
{
    use CapturesAccountingEffect;

    public function saving(CashTransferLine $line): void
    {
        $transfer = CashTransfer::query()->find($line->cash_transfer_id);

        if ($transfer && $transfer->from_account_id === $line->to_account_id) {
            throw ValidationException::withMessages([
                'to_account_id' => 'To account cannot be same as from account.',
            ]);
        }

        if ((float) $line->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Transfer line amount must be greater than zero.',
            ]);
        }
    }

    public function updating(CashTransferLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function deleting(CashTransferLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function saved(CashTransferLine $line): void
    {
        $this->resyncParent($line);
    }

    public function deleted(CashTransferLine $line): void
    {
        $this->resyncParent($line);
    }

    protected function captureParentEffect(CashTransferLine $line): void
    {
        $transfer = CashTransfer::query()
            ->with('cashTransferLines')
            ->find($line->cash_transfer_id);

        if (!$transfer) {
            return;
        }

        $oldEffect = app(CashTransferService::class)->snapshotEffect($transfer);

        $this->storeOldEffect(CashTransfer::class, $transfer->id, $oldEffect);
    }

    protected function resyncParent(CashTransferLine $line): void
    {
        DB::transaction(function () use ($line) {
            $transfer = CashTransfer::query()
                ->with('cashTransferLines')
                ->find($line->cash_transfer_id);

            if (!$transfer) {
                return;
            }

            $oldEffect = $this->pullOldEffect(CashTransfer::class, $transfer->id);

            app(CashTransferService::class)->syncFinancials(
                cashTransfer: $transfer,
                oldEffect: $oldEffect
            );
        });
    }
}