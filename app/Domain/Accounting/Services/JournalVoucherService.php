<?php

namespace App\Domain\Accounting\Services;

use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
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
