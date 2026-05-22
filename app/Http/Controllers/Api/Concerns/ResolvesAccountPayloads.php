<?php

namespace App\Http\Controllers\Api\Concerns;

use App\Models\ChartOfAccount;

trait ResolvesAccountPayloads
{
    protected function resolveAccountIdFromPayload(array $row, string $accountKey = 'account_id', string $chartKey = 'chart_of_account_id'): ?string
    {
        if (! empty($row[$accountKey])) {
            return $row[$accountKey];
        }

        // TODO: Remove this legacy chart_of_account_id compatibility after clients have moved to account_id.
        if (! empty($row[$chartKey])) {
            return ChartOfAccount::query()
                ->whereKey($row[$chartKey])
                ->value('account_id');
        }

        return null;
    }

    protected function normalizeAccountPayload(array $row, string $accountKey = 'account_id', string $chartKey = 'chart_of_account_id'): array
    {
        $row[$accountKey] = $this->resolveAccountIdFromPayload($row, $accountKey, $chartKey);
        unset($row[$chartKey]);

        return $row;
    }
}
