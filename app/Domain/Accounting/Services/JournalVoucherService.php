<?php

namespace App\Domain\Accounting\Services;

use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Services\Accounting\FiscalPeriodGuard;
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

    public function post(JournalVoucher $journalVoucher, ?int $approvedById = null): JournalVoucher
    {
        return DB::transaction(function () use ($journalVoucher, $approvedById) {
            $journalVoucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->lockForUpdate()
                ->findOrFail($journalVoucher->id);

            $oldEffect = $this->snapshotEffect($journalVoucher);

            $this->validateBalanced($journalVoucher);
            $this->normalizeLineAccountIds($journalVoucher);

            $journalVoucher->forceFill([
                'status' => 'posted',
                'active' => true,
                'approved' => true,
                'approved_at' => $journalVoucher->approved_at ?: now(),
                'approved_by_id' => $journalVoucher->approved_by_id ?: $approvedById,
                'void' => false,
                'voided_at' => null,
                'voided_by_id' => null,
                'voided_reason' => null,
            ])->saveQuietly();

            $this->assignVoucherNumberIfMissing($journalVoucher);
            $this->recalculateTotal($journalVoucher);

            $journalVoucher = $journalVoucher->fresh(['journalVoucherLines']);
            $newEffect = $this->snapshotEffect($journalVoucher);

            $this->postingService->applyEffectDiff($oldEffect, $newEffect);

            return $journalVoucher;
        });
    }

    /**
     * Post a mirror-image voucher in the current open period and point the
     * original at it. The original stays posted, because it really did happen in
     * a period that has since been closed; the two net to zero across periods
     * and the audit trail shows both halves.
     */
    protected function reverseInCurrentPeriod(JournalVoucher $original, string $reason, ?int $voidedById = null): JournalVoucher
    {
        $original->loadMissing('journalVoucherLines');

        if ($original->reversed_journal_voucher_id) {
            $existing = JournalVoucher::find($original->reversed_journal_voucher_id);
            if ($existing) {
                return $original->fresh(['journalVoucherLines']);
            }
        }

        $guard = app(FiscalPeriodGuard::class);
        $date = now();
        if (! $guard->isOpen($date)) {
            throw ValidationException::withMessages([
                'voucher_date' => ['This entry belongs to a closed period and today also falls in a closed or locked period, so no reversal can be posted. Reopen a period first.'],
            ]);
        }

        // Built without model events, exactly as ParallelJournalVoucherService
        // builds an automatic voucher. Two reasons: the line observer would
        // resync balances on every line, double-applying the effect this method
        // applies explicitly below; and the voucher observer refuses to touch a
        // system-generated cash-transfer entry, which a reversal legitimately
        // copies its source_type from.
        $reversal = JournalVoucher::withoutEvents(fn () => JournalVoucher::create([
            'branch_id' => $original->branch_id,
            'currency_id' => $original->currency_id,
            'voucher_date' => $date->toDateString(),
            'narration' => 'Reversal of '.$original->voucher_no.': '.$reason,
            'reference' => $original->voucher_no,
            'status' => 'posted', 'active' => true, 'approved' => true, 'approved_at' => now(),
            'void' => false, 'exchange_rate' => $original->exchange_rate ?: 1,
            'total' => $original->total,
            'source_type' => $original->source_type, 'source_id' => $original->source_id,
            'source_no' => $original->source_no, 'source_module' => $original->source_module,
            'is_auto_generated' => true, 'is_system_generated' => true,
            'reversed_journal_voucher_id' => $original->id,
            'reversal_reason' => $reason,
        ]));

        JournalVoucherLine::withoutEvents(function () use ($original, $reversal): void {
            foreach ($original->journalVoucherLines as $line) {
                // Debits and credits swap; nothing is ever negated.
                $reversal->journalVoucherLines()->create([
                    'chart_of_account_id' => $line->chart_of_account_id,
                    'account_id' => $line->account_id,
                    'description' => 'Reversal: '.($line->description ?? ''),
                    'debit' => $line->credit,
                    'credit' => $line->debit,
                    'foreign_debit' => $line->foreign_credit,
                    'foreign_credit' => $line->foreign_debit,
                    'currency_id' => $line->currency_id,
                    'exchange_rate' => $line->exchange_rate ?: 1,
                ]);
            }
        });

        $reversal = $reversal->fresh(['journalVoucherLines']);
        $this->assignVoucherNumberIfMissing($reversal);
        $this->postingService->applyEffectDiff([], $this->snapshotEffect($reversal));

        $original->forceFill([
            'reversed_journal_voucher_id' => $reversal->id,
            'reversal_reason' => $reason,
            'reversed_at' => now(),
            'voided_by_id' => $voidedById,
        ])->saveQuietly();

        return $original->fresh(['journalVoucherLines']);
    }

    public function void(JournalVoucher $journalVoucher, string $reason, ?int $voidedById = null): JournalVoucher
    {
        return DB::transaction(function () use ($journalVoucher, $reason, $voidedById) {
            $journalVoucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->lockForUpdate()
                ->findOrFail($journalVoucher->id);

            if (!$this->postingService->isFinanciallyPosted($journalVoucher, ['posted'])) {
                throw ValidationException::withMessages([
                    'journal_voucher' => 'Only posted journal vouchers can be voided.',
                ]);
            }

            // A voucher sitting in a closed or locked period cannot be edited
            // away: doing so would silently restate figures that have already
            // been reported. Reverse it with a contra entry in the current open
            // period instead, and leave the original standing.
            if (! app(FiscalPeriodGuard::class)->isOpen($journalVoucher->voucher_date)) {
                return $this->reverseInCurrentPeriod($journalVoucher, $reason, $voidedById);
            }

            $oldEffect = $this->snapshotEffect($journalVoucher);

            $journalVoucher->forceFill([
                'status' => 'cancelled',
                'active' => false,
                'void' => true,
                'voided_at' => now(),
                'voided_by_id' => $voidedById,
                'voided_reason' => $reason,
            ])->saveQuietly();

            $newEffect = $this->snapshotEffect($journalVoucher->fresh(['journalVoucherLines']));

            $this->postingService->applyEffectDiff($oldEffect, $newEffect);

            return $journalVoucher->fresh(['journalVoucherLines']);
        });
    }

    public function syncFinancials(JournalVoucher $journalVoucher, array $oldEffect = []): void
    {
        DB::transaction(function () use ($journalVoucher, $oldEffect) {
            $journalVoucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->lockForUpdate()
                ->findOrFail($journalVoucher->id);

            $this->validateBalanced($journalVoucher);
            $this->normalizeLineAccountIds($journalVoucher);
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

            if (empty($line->account_id)) {
                throw ValidationException::withMessages([
                    'lines' => 'Every journal line must have an account.',
                ]);
            }

            $accountId = $this->resolveLineAccountId($line);

            if (!$accountId) {
                throw ValidationException::withMessages([
                    'lines' => 'Every journal line must have an account.',
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
        if (Schema::hasColumn($line->getTable(), 'account_id') && !empty($line->account_id)) {
            return $line->account_id;
        }

        return null;
    }

    protected function normalizeLineAccountIds(JournalVoucher $journalVoucher): void
    {
        $journalVoucher->loadMissing('journalVoucherLines');

        $line = new JournalVoucherLine();

        if (!Schema::hasColumn($line->getTable(), 'account_id')) {
            return;
        }

        foreach ($journalVoucher->journalVoucherLines as $line) {
            $accountId = $this->resolveLineAccountId($line);

            if (!$accountId) {
                throw ValidationException::withMessages([
                    'lines' => 'Every journal line must have an account.',
                ]);
            }

            if ((string) $line->account_id !== (string) $accountId) {
                $line->forceFill(['account_id' => $accountId])->saveQuietly();
            }
        }
    }
}
