<?php

namespace App\Domain\Accounting\Services;

use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class JournalVoucherService
{
    public function __construct(
        protected PostingService $postingService,
        protected CodeGeneratorService $codeGenerator
    ) {}

    public function snapshotEffect(JournalVoucher $journalVoucher): array
    {
        $journalVoucher->loadMissing('journalVoucherLines');

        if ($this->shouldSkipPosting($journalVoucher)) {
            return [];
        }

        if (!$this->postingService->isFinanciallyPosted($journalVoucher, ['posted'])) {
            return [];
        }

        $effect = [];

        foreach ($journalVoucher->journalVoucherLines as $line) {
            $accountId = $this->resolveLineAccountId($line);

            $this->postingService->addDebit($effect, $accountId, $line->debit);
            $this->postingService->addCredit($effect, $accountId, $line->credit);
        }

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(JournalVoucher $journalVoucher, array $oldEffect = []): void
    {
        DB::transaction(function () use ($journalVoucher, $oldEffect) {
            $journalVoucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->lockForUpdate()
                ->findOrFail($journalVoucher->id);

            $this->validateBalanced($journalVoucher);
            $this->assignVoucherNumberIfMissing($journalVoucher);
            $this->recalculateTotal($journalVoucher);

            $newEffect = $this->snapshotEffect($journalVoucher);

            $this->postingService->applyEffectDiff($oldEffect, $newEffect);
        });
    }

    public function validateBalanced(JournalVoucher $journalVoucher): void
    {
        $journalVoucher->loadMissing('journalVoucherLines');

        if ($journalVoucher->journalVoucherLines->count() < 2) {
            throw ValidationException::withMessages([
                'lines' => 'Journal voucher must have at least two lines.',
            ]);
        }

        $totalDebit = 0.0;
        $totalCredit = 0.0;

        foreach ($journalVoucher->journalVoucherLines as $line) {
            $debit = (float) ($line->debit ?? 0);
            $credit = (float) ($line->credit ?? 0);

            if ($debit < 0 || $credit < 0) {
                throw ValidationException::withMessages([
                    'lines' => 'Debit and credit cannot be negative.',
                ]);
            }

            if ($debit <= 0 && $credit <= 0) {
                throw ValidationException::withMessages([
                    'lines' => 'Each journal line must have either debit or credit.',
                ]);
            }

            if ($debit > 0 && $credit > 0) {
                throw ValidationException::withMessages([
                    'lines' => 'A journal line cannot have both debit and credit.',
                ]);
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        if (round($totalDebit, 2) !== round($totalCredit, 2)) {
            throw ValidationException::withMessages([
                'lines' => 'Debit total must equal credit total.',
            ]);
        }
    }

    public function assignVoucherNumberIfMissing(JournalVoucher $journalVoucher): void
    {
        if (!empty($journalVoucher->voucher_no)) {
            return;
        }

        $journalVoucher->forceFill([
            'voucher_no' => $this->codeGenerator->nextDocumentNumber(
                modelClass: JournalVoucher::class,
                column: 'voucher_no',
                prefix: 'JV',
                branchId: $journalVoucher->branch_id
            ),
        ])->saveQuietly();
    }

    public function recalculateTotal(JournalVoucher $journalVoucher): void
    {
        $journalVoucher->loadMissing('journalVoucherLines');

        $totalDebit = $journalVoucher->journalVoucherLines->sum(fn ($line) => (float) $line->debit);
        $totalCredit = $journalVoucher->journalVoucherLines->sum(fn ($line) => (float) $line->credit);

        $journalVoucher->forceFill([
            'total' => max($totalDebit, $totalCredit),
        ])->saveQuietly();
    }

    protected function resolveLineAccountId($line): ?string
    {
        if (
            Schema::hasColumn($line->getTable(), 'account_id')
            && !empty($line->account_id)
        ) {
            return $line->account_id;
        }

        if (!empty($line->chart_of_account_id)) {
            return ChartOfAccount::query()
                ->whereKey($line->chart_of_account_id)
                ->value('account_id');
        }

        return null;
    }

    protected function shouldSkipPosting(JournalVoucher $journalVoucher): bool
    {
        if (!(bool) ($journalVoucher->is_system_generated ?? false)) {
            return false;
        }

        return true;
    }
}