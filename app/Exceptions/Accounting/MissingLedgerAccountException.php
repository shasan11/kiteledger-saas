<?php

namespace App\Exceptions\Accounting;

use InvalidArgumentException;

/**
 * The chart of accounts has no account for a required posting role.
 *
 * Distinct from other posting failures on purpose: a missing chart account is a
 * configuration gap, not a broken journal. Callers that must not be blocked by
 * incomplete setup (stock movements, for example) can catch this specific case
 * and carry on, while a genuinely unbalanced or invalid voucher still fails.
 */
class MissingLedgerAccountException extends InvalidArgumentException
{
    public function __construct(public readonly string $accountType, string $message = '')
    {
        parent::__construct($message ?: "Required account '{$accountType}' not found. Please seed your chart of accounts.");
    }
}
