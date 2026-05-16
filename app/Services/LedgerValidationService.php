<?php

namespace App\Services;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Collection;
use InvalidArgumentException;

class LedgerValidationService
{
    public function validateBalanced(array|Collection $lines): void
    {
        $totalDebit = 0;
        $totalCredit = 0;

        if ($lines instanceof Collection) {
            $lines = $lines->toArray();
        }

        foreach ($lines as $line) {
            $debit = is_array($line) ? ($line['debit'] ?? 0) : ($line->debit ?? 0);
            $credit = is_array($line) ? ($line['credit'] ?? 0) : ($line->credit ?? 0);

            $debit = (float) $debit;
            $credit = (float) $credit;

            if ($debit > 0 && $credit > 0) {
                throw new InvalidArgumentException('A journal voucher line cannot have both debit and credit amounts.');
            }

            $totalDebit += $debit;
            $totalCredit += $credit;
        }

        if (abs($totalDebit - $totalCredit) > 0.01) {
            throw new InvalidArgumentException("Journal voucher is not balanced. Total Debit: {$totalDebit}, Total Credit: {$totalCredit}");
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
        return in_array('approved', $transaction->getFillable(), true);
    }

    public function hasStatusField(Model $transaction): bool
    {
        return in_array('status', $transaction->getFillable(), true);
    }
}
