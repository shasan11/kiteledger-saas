<?php

namespace App\Domain\Accounting\Services;

use App\Models\BankAccount;
use App\Models\BankReconciliation;
use App\Models\BankReconciliationItem;
use App\Models\BankStatementLine;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Support\Carbon;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankReconciliationService
{
    public function __construct(
        protected JournalVoucherService $journalVoucherService
    ) {}

    /**
     * Build the live reconciliation summary used by the workspace.
     */
    public function summary(BankAccount $bankAccount, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $openingBalance = (float) ($bankAccount->opening_balance ?? 0);

        $statementLines = $this->statementLineQuery($bankAccount, $dateFrom, $dateTo)
            ->orderBy('statement_date')
            ->orderBy('created_at')
            ->get();

        $ledgerLines = $this->ledgerLineQuery($bankAccount, $dateFrom, $dateTo)->get();

        $bankBalance = $openingBalance;
        $statementRows = $statementLines->map(function (BankStatementLine $line) use (&$bankBalance) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $bankBalance += $debit - $credit;

            if ($line->balance !== null) {
                $bankBalance = (float) $line->balance;
            }

            return [
                'id' => $line->id,
                'date' => optional($line->statement_date)->toDateString(),
                'description' => $line->description,
                'reference' => $line->reference,
                'counterparty' => $line->counterparty,
                'remarks' => $line->remarks,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'deposit' => round($debit, 2),
                'withdrawal' => round($credit, 2),
                'amount' => round(abs($debit - $credit), 2),
                'direction' => $debit > 0 ? 'deposit' : 'withdrawal',
                'balance' => round($bankBalance, 2),
                'status' => $line->status,
                'matching_status' => $this->matchingStatus($line),
                'match_confidence' => $line->match_confidence,
                'matched_journal_voucher_line_id' => $line->matched_journal_voucher_line_id,
                'posted_journal_voucher_id' => $line->posted_journal_voucher_id,
                'bank_reconciliation_id' => $line->bank_reconciliation_id,
            ];
        });

        $softwareBalance = $openingBalance;
        $ledgerRows = $ledgerLines->map(function (JournalVoucherLine $line) use (&$softwareBalance, $statementLines) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $softwareBalance += $debit - $credit;
            $voucher = $line->journalVoucher;

            $matchedStatement = $statementLines->first(fn ($sl) =>
                (string) $sl->matched_journal_voucher_line_id === (string) $line->id
                || (string) $sl->posted_journal_voucher_id === (string) $voucher?->id
            );

            return [
                'id' => $line->id,
                'journal_voucher_id' => $voucher?->id,
                'voucher_no' => $voucher?->voucher_no,
                'date' => optional($voucher?->voucher_date)->toDateString(),
                'description' => $line->description ?: $voucher?->narration,
                'reference' => $voucher?->reference,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'amount' => round(abs($debit - $credit), 2),
                'direction' => $debit > 0 ? 'deposit' : 'withdrawal',
                'balance' => round($softwareBalance, 2),
                'matching_status' => $matchedStatement ? 'matched' : 'unmatched',
                'matched_statement_line_id' => $matchedStatement['id'] ?? null,
                'voucher_status' => $voucher?->status,
                'source_module' => $voucher?->source_module,
            ];
        });

        $unmatchedBank = $statementRows->where('matching_status', 'unmatched')->sum('amount');
        $unmatchedSoftware = $ledgerRows->where('matching_status', 'unmatched')->sum('amount');
        $matchedAmount = $statementRows->where('matching_status', 'matched')->sum('amount');

        $statementBalance = $statementRows->last()['balance'] ?? $openingBalance;
        $difference = round($statementBalance - $softwareBalance, 2);

        $lastReconciliation = BankReconciliation::query()
            ->where('bank_account_id', $bankAccount->id)
            ->where('status', 'finalized')
            ->orderByDesc('statement_date')
            ->first();

        return [
            'bank_account' => $bankAccount->load(['branch', 'currency', 'account']),
            'opening_balance' => round($openingBalance, 2),
            'bank_balance' => round($statementBalance, 2),
            'software_balance' => round($softwareBalance, 2),
            'reconciliation_difference' => round($difference, 2),
            'matched_amount' => round((float) $matchedAmount, 2),
            'unmatched_bank_amount' => round((float) $unmatchedBank, 2),
            'unmatched_software_amount' => round((float) $unmatchedSoftware, 2),
            'reconciliation_status' => abs($difference) < 0.01 ? 'reconciled' : 'needs_review',
            'last_reconciled_date' => optional($lastReconciliation?->statement_date)->toDateString(),
            'last_reconciliation_id' => $lastReconciliation?->id,
            'statement_lines' => $statementRows->values()->all(),
            'ledger_lines' => $ledgerRows->values()->all(),
        ];
    }

    /**
     * Try to automatically match unmatched bank statement lines with software ledger lines.
     * Only "exact" matches are auto-finalized; everything else is returned as a suggestion.
     */
    public function autoMatch(BankAccount $bankAccount, ?int $userId = null, int $dateToleranceDays = 5): array
    {
        $applied = collect();
        $suggestions = collect();

        $statementLines = $this->statementLineQuery($bankAccount)
            ->whereNull('matched_journal_voucher_line_id')
            ->whereNull('posted_journal_voucher_id')
            ->where('status', '!=', 'ignored')
            ->get();

        $usedLedgerLineIds = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->whereNotNull('matched_journal_voucher_line_id')
            ->pluck('matched_journal_voucher_line_id')
            ->all();

        $ledgerLines = $this->ledgerLineQuery($bankAccount)
            ->when(! empty($usedLedgerLineIds), fn ($q) => $q->whereNotIn('journal_voucher_lines.id', $usedLedgerLineIds))
            ->get();

        $usedLedgerIds = [];

        foreach ($statementLines as $sLine) {
            $sAmount = $sLine->signedAmount();
            $sDate = $sLine->statement_date;

            $best = null;
            $bestScore = 0;

            foreach ($ledgerLines as $lLine) {
                if (in_array((string) $lLine->id, $usedLedgerIds, true)) {
                    continue;
                }

                $lAmount = (float) $lLine->debit - (float) $lLine->credit;

                // Bank deposit (debit) corresponds to ledger debit on bank account
                if (abs(round($sAmount, 2)) !== abs(round($lAmount, 2))) {
                    continue;
                }

                // Direction must agree (deposit↔debit, withdrawal↔credit)
                if (($sAmount > 0) !== ($lAmount > 0)) {
                    continue;
                }

                $voucher = $lLine->journalVoucher;
                if (! $voucher) {
                    continue;
                }

                $dateDiff = $sDate && $voucher->voucher_date
                    ? abs(Carbon::parse($sDate)->diffInDays(Carbon::parse($voucher->voucher_date)))
                    : 999;

                if ($dateDiff > $dateToleranceDays) {
                    continue;
                }

                $score = $this->matchScore($sLine, $lLine, $dateDiff);
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $best = $lLine;
                }
            }

            if (! $best) {
                continue;
            }

            $confidence = $this->confidenceLabel($bestScore);

            if ($confidence === 'exact') {
                $this->applyMatch($sLine, $best, $confidence, 'auto', $userId);
                $usedLedgerIds[] = (string) $best->id;
                $applied->push(['statement_line_id' => $sLine->id, 'journal_voucher_line_id' => $best->id, 'confidence' => $confidence]);
            } else {
                $suggestions->push([
                    'statement_line_id' => $sLine->id,
                    'journal_voucher_line_id' => $best->id,
                    'confidence' => $confidence,
                    'score' => $bestScore,
                ]);
            }
        }

        return [
            'applied' => $applied->values()->all(),
            'suggestions' => $suggestions->values()->all(),
            'applied_count' => $applied->count(),
            'suggested_count' => $suggestions->count(),
        ];
    }

    public function manualMatch(BankAccount $bankAccount, string $statementLineId, string $journalVoucherLineId, ?int $userId = null, ?string $remarks = null): array
    {
        return DB::transaction(function () use ($bankAccount, $statementLineId, $journalVoucherLineId, $userId, $remarks) {
            /** @var BankStatementLine $sLine */
            $sLine = BankStatementLine::query()
                ->lockForUpdate()
                ->where('bank_account_id', $bankAccount->id)
                ->findOrFail($statementLineId);

            if ($sLine->isMatched()) {
                throw ValidationException::withMessages([
                    'statement_line_id' => 'This statement line is already matched.',
                ]);
            }

            if ($sLine->status === 'ignored') {
                throw ValidationException::withMessages([
                    'statement_line_id' => 'Ignored statement lines cannot be matched. Restore the line first.',
                ]);
            }

            /** @var JournalVoucherLine $lLine */
            $lLine = JournalVoucherLine::query()
                ->with('journalVoucher')
                ->where('account_id', $bankAccount->account_id)
                ->findOrFail($journalVoucherLineId);

            $alreadyMatched = BankStatementLine::query()
                ->where('matched_journal_voucher_line_id', $lLine->id)
                ->exists();

            if ($alreadyMatched) {
                throw ValidationException::withMessages([
                    'journal_voucher_line_id' => 'This journal voucher line is already matched with another statement line.',
                ]);
            }

            $diff = round($sLine->absoluteAmount() - (abs((float) $lLine->debit - (float) $lLine->credit)), 2);

            $this->applyMatch($sLine, $lLine, abs($diff) < 0.01 ? 'high' : 'low', 'manual', $userId, $remarks);

            return [
                'statement_line' => $sLine->fresh(),
                'journal_voucher_line' => $lLine->fresh(),
                'difference' => $diff,
            ];
        });
    }

    public function unmatch(BankAccount $bankAccount, string $statementLineId, ?int $userId = null): BankStatementLine
    {
        return DB::transaction(function () use ($bankAccount, $statementLineId, $userId) {
            /** @var BankStatementLine $sLine */
            $sLine = BankStatementLine::query()
                ->lockForUpdate()
                ->where('bank_account_id', $bankAccount->id)
                ->findOrFail($statementLineId);

            if ($sLine->bank_reconciliation_id) {
                $rec = BankReconciliation::find($sLine->bank_reconciliation_id);
                if ($rec && $rec->isLocked()) {
                    throw ValidationException::withMessages([
                        'statement_line_id' => 'Cannot unmatch a line that belongs to a finalized reconciliation. Reopen the reconciliation first.',
                    ]);
                }
            }

            $sLine->forceFill([
                'matched_journal_voucher_line_id' => null,
                'match_confidence' => null,
                'match_type' => null,
                'matched_at' => null,
                'matched_by_id' => null,
                'status' => 'imported',
            ])->save();

            return $sLine->fresh();
        });
    }

    public function markPending(BankAccount $bankAccount, string $statementLineId, ?string $remarks = null): BankStatementLine
    {
        $sLine = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->findOrFail($statementLineId);

        if ($sLine->isMatched()) {
            throw ValidationException::withMessages([
                'statement_line_id' => 'Matched lines cannot be marked pending. Unmatch first.',
            ]);
        }

        $sLine->forceFill([
            'status' => 'pending',
            'remarks' => $remarks ?: $sLine->remarks,
        ])->save();

        return $sLine->fresh();
    }

    public function restore(BankAccount $bankAccount, string $statementLineId): BankStatementLine
    {
        $sLine = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->findOrFail($statementLineId);

        $sLine->forceFill([
            'status' => 'imported',
        ])->save();

        return $sLine->fresh();
    }

    /**
     * Create a draft reconciliation snapshot for a period and then immediately finalize.
     */
    public function finalize(BankAccount $bankAccount, array $data, ?int $userId = null): BankReconciliation
    {
        return DB::transaction(function () use ($bankAccount, $data, $userId) {
            $summary = $this->summary(
                $bankAccount,
                $data['period_from'] ?? null,
                $data['period_to'] ?? null
            );

            $difference = (float) $summary['reconciliation_difference'];

            if (abs($difference) >= 0.01 && empty($data['force'])) {
                throw ValidationException::withMessages([
                    'reconciliation_difference' => 'Reconciliation difference is not zero. Pass force=true with a remark to finalize anyway.',
                ]);
            }

            /** @var BankReconciliation $rec */
            $rec = BankReconciliation::create([
                'bank_account_id' => $bankAccount->id,
                'branch_id' => $bankAccount->branch_id,
                'statement_date' => $data['statement_date'] ?? now()->toDateString(),
                'period_from' => $data['period_from'] ?? null,
                'period_to' => $data['period_to'] ?? null,
                'opening_bank_balance' => $summary['opening_balance'],
                'closing_bank_balance' => $summary['bank_balance'],
                'software_balance' => $summary['software_balance'],
                'matched_amount' => $summary['matched_amount'],
                'unmatched_bank_amount' => $summary['unmatched_bank_amount'],
                'unmatched_software_amount' => $summary['unmatched_software_amount'],
                'reconciliation_difference' => $difference,
                'status' => 'finalized',
                'finalized_at' => now(),
                'finalized_by_id' => $userId,
                'remarks' => $data['remarks'] ?? null,
                'user_add_id' => $userId,
            ]);

            $this->writeReconciliationItems($rec, $summary);

            // Attach statement lines covered by this period to this reconciliation
            BankStatementLine::query()
                ->where('bank_account_id', $bankAccount->id)
                ->when($data['period_from'] ?? null, fn ($q, $d) => $q->whereDate('statement_date', '>=', $d))
                ->when($data['period_to'] ?? null, fn ($q, $d) => $q->whereDate('statement_date', '<=', $d))
                ->whereNull('bank_reconciliation_id')
                ->update(['bank_reconciliation_id' => $rec->id]);

            return $rec->fresh(['items']);
        });
    }

    public function reopen(BankReconciliation $reconciliation): BankReconciliation
    {
        if (! $reconciliation->isLocked()) {
            throw ValidationException::withMessages([
                'reconciliation' => 'Only finalized reconciliations can be reopened.',
            ]);
        }

        $reconciliation->forceFill([
            'status' => 'reopened',
            'finalized_at' => null,
            'finalized_by_id' => null,
        ])->save();

        return $reconciliation->fresh();
    }

    /**
     * Build the formal reconciliation statement (printable).
     */
    public function reconciliationReport(BankAccount $bankAccount, ?string $dateFrom = null, ?string $dateTo = null): array
    {
        $summary = $this->summary($bankAccount, $dateFrom, $dateTo);

        $statementRows = collect($summary['statement_lines']);
        $ledgerRows = collect($summary['ledger_lines']);

        $outstandingDeposits = $ledgerRows
            ->where('matching_status', 'unmatched')
            ->where('direction', 'deposit')
            ->sum('amount');

        $outstandingPayments = $ledgerRows
            ->where('matching_status', 'unmatched')
            ->where('direction', 'withdrawal')
            ->sum('amount');

        $bankCharges = $statementRows
            ->where('matching_status', 'unmatched')
            ->where('direction', 'withdrawal')
            ->sum('amount');

        $bankInterest = $statementRows
            ->where('matching_status', 'unmatched')
            ->where('direction', 'deposit')
            ->sum('amount');

        $adjustedBalance = $summary['bank_balance']
            + $outstandingDeposits
            - $outstandingPayments
            - $bankCharges
            + $bankInterest;

        return array_merge($summary, [
            'period_from' => $dateFrom,
            'period_to' => $dateTo,
            'outstanding_deposits' => round((float) $outstandingDeposits, 2),
            'outstanding_payments' => round((float) $outstandingPayments, 2),
            'bank_charges_not_recorded' => round((float) $bankCharges, 2),
            'bank_interest_not_recorded' => round((float) $bankInterest, 2),
            'adjusted_balance' => round((float) $adjustedBalance, 2),
            'final_difference' => round((float) $adjustedBalance - (float) $summary['software_balance'], 2),
        ]);
    }

    // ------------------------------------------------------------------
    // Internals
    // ------------------------------------------------------------------

    protected function applyMatch(
        BankStatementLine $sLine,
        JournalVoucherLine $lLine,
        string $confidence,
        string $matchType,
        ?int $userId,
        ?string $remarks = null
    ): void {
        $sLine->forceFill([
            'matched_journal_voucher_line_id' => $lLine->id,
            'posted_journal_voucher_id' => $lLine->journal_voucher_id,
            'match_confidence' => $confidence,
            'match_type' => $matchType,
            'matched_at' => now(),
            'matched_by_id' => $userId,
            'status' => 'matched',
            'remarks' => $remarks ?: $sLine->remarks,
        ])->save();
    }

    protected function matchScore(BankStatementLine $sLine, JournalVoucherLine $lLine, float $dateDiffDays): float
    {
        $score = 60.0;

        if ($dateDiffDays == 0) {
            $score += 25;
        } elseif ($dateDiffDays <= 1) {
            $score += 15;
        } elseif ($dateDiffDays <= 3) {
            $score += 8;
        }

        $sRef = trim((string) $sLine->reference);
        $lRef = trim((string) ($lLine->journalVoucher?->reference ?? ''));
        if ($sRef !== '' && $lRef !== '' && strcasecmp($sRef, $lRef) === 0) {
            $score += 15;
        }

        $sDesc = strtolower(trim((string) $sLine->description));
        $lDesc = strtolower(trim((string) ($lLine->description ?? $lLine->journalVoucher?->narration ?? '')));
        if ($sDesc !== '' && $lDesc !== '' && (str_contains($lDesc, $sDesc) || str_contains($sDesc, $lDesc))) {
            $score += 5;
        }

        return $score;
    }

    protected function confidenceLabel(float $score): string
    {
        return match (true) {
            $score >= 95 => 'exact',
            $score >= 80 => 'high',
            $score >= 70 => 'medium',
            default => 'low',
        };
    }

    protected function matchingStatus(BankStatementLine $line): string
    {
        if ($line->status === 'ignored') {
            return 'ignored';
        }
        if ($line->status === 'pending') {
            return 'pending';
        }
        if ($line->matched_journal_voucher_line_id || $line->posted_journal_voucher_id) {
            return 'matched';
        }
        return 'unmatched';
    }

    protected function statementLineQuery(BankAccount $bankAccount, ?string $dateFrom = null, ?string $dateTo = null)
    {
        return BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->when($dateFrom, fn ($q, $d) => $q->whereDate('statement_date', '>=', $d))
            ->when($dateTo, fn ($q, $d) => $q->whereDate('statement_date', '<=', $d));
    }

    protected function ledgerLineQuery(BankAccount $bankAccount, ?string $dateFrom = null, ?string $dateTo = null)
    {
        return JournalVoucherLine::query()
            ->with(['journalVoucher.branch'])
            ->where('account_id', $bankAccount->account_id)
            ->whereHas('journalVoucher', function ($q) use ($dateFrom, $dateTo) {
                $q->where('status', 'posted')
                    ->where('void', false)
                    ->when($dateFrom, fn ($qq, $d) => $qq->whereDate('voucher_date', '>=', $d))
                    ->when($dateTo, fn ($qq, $d) => $qq->whereDate('voucher_date', '<=', $d));
            })
            ->join('journal_vouchers', 'journal_voucher_lines.journal_voucher_id', '=', 'journal_vouchers.id')
            ->orderBy('journal_vouchers.voucher_date')
            ->orderBy('journal_voucher_lines.created_at')
            ->select('journal_voucher_lines.*');
    }

    protected function writeReconciliationItems(BankReconciliation $rec, array $summary): void
    {
        $rows = [];

        foreach ($summary['statement_lines'] as $sl) {
            $rows[] = [
                'bank_reconciliation_id' => $rec->id,
                'bank_statement_line_id' => $sl['id'],
                'journal_voucher_line_id' => $sl['matched_journal_voucher_line_id'] ?? null,
                'type' => $sl['matching_status'] === 'matched'
                    ? 'matched'
                    : ($sl['matching_status'] === 'ignored' ? 'ignored'
                        : ($sl['matching_status'] === 'pending' ? 'pending' : 'unmatched_bank')),
                'amount' => $sl['amount'],
                'difference' => 0,
                'match_confidence' => $sl['match_confidence'] ?? null,
            ];
        }

        foreach ($summary['ledger_lines'] as $ll) {
            if ($ll['matching_status'] === 'matched') {
                continue; // already captured via statement side
            }
            $rows[] = [
                'bank_reconciliation_id' => $rec->id,
                'bank_statement_line_id' => null,
                'journal_voucher_line_id' => $ll['id'],
                'type' => 'unmatched_software',
                'amount' => $ll['amount'],
                'difference' => 0,
                'match_confidence' => null,
            ];
        }

        if (! empty($rows)) {
            foreach (array_chunk($rows, 200) as $chunk) {
                foreach ($chunk as $row) {
                    BankReconciliationItem::create($row);
                }
            }
        }
    }
}
