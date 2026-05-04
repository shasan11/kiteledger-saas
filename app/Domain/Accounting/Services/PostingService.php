<?php

namespace App\Domain\Accounting\Services;

use App\Models\Account;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;

class PostingService
{
    public function blankEffect(): array
    {
        return [];
    }

    public function isFinanciallyPosted(Model $record, array $postedStatuses = ['posted']): bool
    {
        $status = $record->status ?? null;

        return in_array($status, $postedStatuses, true)
            && (bool) ($record->active ?? true) === true
            && (bool) ($record->void ?? false) === false;
    }

    public function addDebit(array &$effect, ?string $accountId, float|int|string|null $amount): void
    {
        $amount = $this->toDecimal($amount);

        if (!$accountId || $amount <= 0) {
            return;
        }

        $effect[$accountId] ??= ['dr' => 0.0, 'cr' => 0.0];
        $effect[$accountId]['dr'] = round($effect[$accountId]['dr'] + $amount, 6);
    }

    public function addCredit(array &$effect, ?string $accountId, float|int|string|null $amount): void
    {
        $amount = $this->toDecimal($amount);

        if (!$accountId || $amount <= 0) {
            return;
        }

        $effect[$accountId] ??= ['dr' => 0.0, 'cr' => 0.0];
        $effect[$accountId]['cr'] = round($effect[$accountId]['cr'] + $amount, 6);
    }

    public function convertAmount(float|int|string|null $amount, float|int|string|null $exchangeRate = 1): float
    {
        return round($this->toDecimal($amount) * $this->toDecimal($exchangeRate ?: 1), 6);
    }

    public function normalizeEffect(array $effect): array
    {
        $normalized = [];

        foreach ($effect as $accountId => $values) {
            $dr = round($this->toDecimal($values['dr'] ?? 0), 6);
            $cr = round($this->toDecimal($values['cr'] ?? 0), 6);

            if ($dr == 0.0 && $cr == 0.0) {
                continue;
            }

            $normalized[$accountId] = [
                'dr' => $dr,
                'cr' => $cr,
            ];
        }

        return $normalized;
    }

    public function applyEffectDiff(array $oldEffect, array $newEffect): void
    {
        $oldEffect = $this->normalizeEffect($oldEffect);
        $newEffect = $this->normalizeEffect($newEffect);

        $accountIds = array_unique(array_merge(
            array_keys($oldEffect),
            array_keys($newEffect),
        ));

        if (empty($accountIds)) {
            return;
        }

        DB::transaction(function () use ($accountIds, $oldEffect, $newEffect) {
            foreach ($accountIds as $accountId) {
                $oldDr = $this->toDecimal($oldEffect[$accountId]['dr'] ?? 0);
                $oldCr = $this->toDecimal($oldEffect[$accountId]['cr'] ?? 0);

                $newDr = $this->toDecimal($newEffect[$accountId]['dr'] ?? 0);
                $newCr = $this->toDecimal($newEffect[$accountId]['cr'] ?? 0);

                $deltaDr = round($newDr - $oldDr, 6);
                $deltaCr = round($newCr - $oldCr, 6);

                if ($deltaDr == 0.0 && $deltaCr == 0.0) {
                    continue;
                }

                $account = Account::query()
                    ->whereKey($accountId)
                    ->lockForUpdate()
                    ->firstOrFail();

                $drAmount = round($this->toDecimal($account->dr_amount) + $deltaDr, 6);
                $crAmount = round($this->toDecimal($account->cr_amount) + $deltaCr, 6);
                $balance = round($drAmount - $crAmount, 6);

                $account->forceFill([
                    'dr_amount' => $drAmount,
                    'cr_amount' => $crAmount,
                    'balance' => $balance,
                ])->saveQuietly();
            }
        });
    }

    public function toDecimal(float|int|string|null $value): float
    {
        if ($value === null || $value === '') {
            return 0.0;
        }

        return round((float) $value, 6);
    }
}