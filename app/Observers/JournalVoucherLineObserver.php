<?php

namespace App\Observers;

use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\JournalVoucherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class JournalVoucherLineObserver
{
    use CapturesAccountingEffect;

    public function saving(JournalVoucherLine $line): void
    {
        $debit = (float) $line->debit;
        $credit = (float) $line->credit;

        if ($debit < 0 || $credit < 0) {
            throw ValidationException::withMessages([
                'line' => 'Debit and credit cannot be negative.',
            ]);
        }

        if ($debit <= 0 && $credit <= 0) {
            throw ValidationException::withMessages([
                'line' => 'Either debit or credit is required.',
            ]);
        }

        if ($debit > 0 && $credit > 0) {
            throw ValidationException::withMessages([
                'line' => 'A line cannot have both debit and credit.',
            ]);
        }
    }

    public function updating(JournalVoucherLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function deleting(JournalVoucherLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function saved(JournalVoucherLine $line): void
    {
        $this->resyncParent($line);
    }

    public function deleted(JournalVoucherLine $line): void
    {
        $this->resyncParent($line);
    }

    protected function captureParentEffect(JournalVoucherLine $line): void
    {
        $voucher = JournalVoucher::query()
            ->with('journalVoucherLines')
            ->find($line->journal_voucher_id);

        if (!$voucher) {
            return;
        }

        $oldEffect = app(JournalVoucherService::class)->snapshotEffect($voucher);

        $this->storeOldEffect(JournalVoucher::class, $voucher->id, $oldEffect);
    }

    protected function resyncParent(JournalVoucherLine $line): void
    {
        DB::transaction(function () use ($line) {
            $voucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->find($line->journal_voucher_id);

            if (!$voucher) {
                return;
            }

            if (!$this->isReadyForFinancialSync($voucher)) {
                return;
            }

            $oldEffect = $this->pullOldEffect(JournalVoucher::class, $voucher->id);

            app(JournalVoucherService::class)->syncFinancials(
                journalVoucher: $voucher,
                oldEffect: $oldEffect
            );
        });
    }

    protected function isReadyForFinancialSync(JournalVoucher $voucher): bool
    {
        $lines = $voucher->journalVoucherLines;

        if ($lines->count() < 2) {
            return false;
        }

        $debit = round((float) $lines->sum(fn ($line) => (float) $line->debit), 2);
        $credit = round((float) $lines->sum(fn ($line) => (float) $line->credit), 2);

        return $debit > 0 && $credit > 0 && $debit === $credit;
    }
}
