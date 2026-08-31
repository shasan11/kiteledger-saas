<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\Schema;
use InvalidArgumentException;

class LedgerValidationService
{
    public function validateBalanced(array|Collection $lines): void
    {
        // Compare in integer cents. Accumulating floats and allowing a 0.01
        // slack let a genuinely unbalanced voucher through, and made the result
        // depend on float noise rather than on the numbers.
        $debitCents = 0;
        $creditCents = 0;

        if ($lines instanceof Collection) {
            $lines = $lines->toArray();
        }

        foreach ($lines as $line) {
            $debit = (float) (is_array($line) ? ($line['debit'] ?? 0) : ($line->debit ?? 0));
            $credit = (float) (is_array($line) ? ($line['credit'] ?? 0) : ($line->credit ?? 0));

            if ($debit > 0 && $credit > 0) {
                throw new InvalidArgumentException('A journal voucher line cannot have both debit and credit amounts.');
            }

            // A negative debit is a credit wearing a disguise: two of them
            // "balance" while representing nothing, and they corrupt every
            // report that sums the debit and credit columns separately.
            if ($debit < 0 || $credit < 0) {
                throw new InvalidArgumentException('A journal voucher line cannot have a negative debit or credit. Post the entry on the opposite side instead.');
            }

            $debitCents += (int) round($debit * 100);
            $creditCents += (int) round($credit * 100);
        }

        if ($debitCents !== $creditCents) {
            $debitTotal = number_format($debitCents / 100, 2, '.', '');
            $creditTotal = number_format($creditCents / 100, 2, '.', '');

            throw new InvalidArgumentException("Journal voucher is not balanced. Total Debit: {$debitTotal}, Total Credit: {$creditTotal}");
        }

        if ($debitCents === 0) {
            throw new InvalidArgumentException('A journal voucher must move a non-zero amount.');
        }
    }

    public function validateJournalVoucherLines(Collection|array $lines): void
    {
        if ($lines instanceof Collection) {
            $lines = $lines->toArray();
        }

        if (count($lines) < 2) {
            throw new InvalidArgumentException('A journal voucher must have at least 2 lines.');
        }

        $this->validateBalanced($lines);
    }

    public function validateCanApprove(Model $transaction): void
    {
        if (!$this->hasApprovedField($transaction)) {
            throw new InvalidArgumentException('Model does not support approval.');
        }

        if (($transaction->void ?? false) || ($transaction->voided ?? false)) {
            throw new InvalidArgumentException('Voided transactions cannot be approved.');
        }
    }

    public function validateCanVoid(Model $transaction): void
    {
        if (!$this->hasApprovedField($transaction)) {
            throw new InvalidArgumentException('Model does not support void operation.');
        }

        if (!$transaction->approved) {
            throw new InvalidArgumentException('Only approved transactions can be voided.');
        }

        if (($transaction->void ?? false) || ($transaction->voided ?? false)) {
            throw new InvalidArgumentException('Transaction is already voided.');
        }
    }

    public function hasApprovedField(Model $transaction): bool
    {
        return $this->hasColumn($transaction, 'approved');
    }

    public function hasStatusField(Model $transaction): bool
    {
        return $this->hasColumn($transaction, 'status');
    }

    /**
     * Keyed off the real schema rather than $fillable. Mass-assignability says
     * nothing about whether a column exists, so a model that switched to
     * $guarded would silently lose its approval and void validation.
     */
    public function hasColumn(Model $transaction, string $column): bool
    {
        static $cache = [];
        $key = $transaction->getTable().'.'.$column;

        return $cache[$key] ??= Schema::connection($transaction->getConnectionName())->hasColumn($transaction->getTable(), $column);
    }
}
