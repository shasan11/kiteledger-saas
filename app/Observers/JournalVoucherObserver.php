<?php

namespace App\Observers;

use App\Models\JournalVoucher;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\JournalVoucherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalVoucherObserver
{
    use CapturesAccountingEffect;

    public function saving(JournalVoucher $journalVoucher): void
    {
        if ($this->isSystemGeneratedFromCashTransfer($journalVoucher)) {
            throw ValidationException::withMessages([
                'journal_voucher' => 'System-generated journal voucher cannot be edited directly. Edit the source cash transfer instead.',
            ]);
        }
    }

    public function updating(JournalVoucher $journalVoucher): void
    {
        $fresh = JournalVoucher::query()
            ->with('journalVoucherLines')
            ->find($journalVoucher->getKey());

        if ($fresh) {
            $oldEffect = app(JournalVoucherService::class)->snapshotEffect($fresh);

            $this->storeOldEffect($journalVoucher, null, $oldEffect);
        }
    }

    public function saved(JournalVoucher $journalVoucher): void
    {
        DB::transaction(function () use ($journalVoucher) {
            $journalVoucher = $journalVoucher->fresh(['journalVoucherLines']);

            if (!$journalVoucher || !$this->isReadyForFinancialSync($journalVoucher)) {
                return;
            }

            $oldEffect = $this->pullOldEffect($journalVoucher);

            app(JournalVoucherService::class)->syncFinancials(
                journalVoucher: $journalVoucher,
                oldEffect: $oldEffect
            );
        });
    }

    public function deleting(JournalVoucher $journalVoucher): void
    {
        if ($this->isSystemGeneratedFromCashTransfer($journalVoucher)) {
            throw ValidationException::withMessages([
                'journal_voucher' => 'System-generated journal voucher cannot be deleted directly.',
            ]);
        }

        if ($journalVoucher->status === 'posted' && !$journalVoucher->void) {
            throw ValidationException::withMessages([
                'journal_voucher' => 'Posted journal voucher cannot be deleted. Void or cancel it instead.',
            ]);
        }
    }

    protected function isSystemGeneratedFromCashTransfer(JournalVoucher $journalVoucher): bool
    {
        return (bool) (
            $journalVoucher->is_auto_generated
            && (
                $journalVoucher->source_type === 'cash_transfer'
                || str_contains((string) $journalVoucher->reference, 'Cash Transfer')
            )
        );
    }

    protected function isReadyForFinancialSync(JournalVoucher $journalVoucher): bool
    {
        $lines = $journalVoucher->journalVoucherLines;

        if ($lines->count() < 2) {
            return false;
        }

        $debit = round((float) $lines->sum(fn ($line) => (float) $line->debit), 2);
        $credit = round((float) $lines->sum(fn ($line) => (float) $line->credit), 2);

        return $debit > 0 && $credit > 0 && $debit === $credit;
    }
}
