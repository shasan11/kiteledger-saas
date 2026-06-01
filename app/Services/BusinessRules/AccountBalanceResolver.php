<?php

namespace App\Services\BusinessRules;

use App\Models\Account;

class AccountBalanceResolver
{
    public function account(?string $accountId): ?Account
    {
        return $accountId ? Account::query()->find($accountId) : null;
    }

    public function balance(?Account $account): float
    {
        return (float) ($account?->balance ?? 0);
    }

    public function isCashOrBank(?Account $account): bool
    {
        return $account && in_array((string) $account->nature, ['cash', 'bank'], true);
    }
}
