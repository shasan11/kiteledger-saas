<?php

namespace App\Domain\Accounting\Services;

use App\Models\Account;
use App\Models\ChartOfAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChartOfAccountService
{
    public function __construct(
        protected CodeGeneratorService $codeGenerator
    ) {}

    public function assignCodeIfMissing(ChartOfAccount $chartOfAccount): void
    {
        if (!empty($chartOfAccount->code)) {
            return;
        }

        if (empty($chartOfAccount->type)) {
            $chartOfAccount->type = 'asset';
        }

        [$start, $end] = $this->rangeForType($chartOfAccount->type);

        $chartOfAccount->code = DB::transaction(function () use ($chartOfAccount, $start, $end) {
            return $this->codeGenerator->nextNumericCodeFromRange(
                modelClass: ChartOfAccount::class,
                column: 'code',
                start: $start,
                end: $end,
                branchId: $chartOfAccount->branch_id
            );
        });

        if (empty($chartOfAccount->account_id)) {
            $account = Account::query()->create([
                'name' => $chartOfAccount->name,
                'code' => $chartOfAccount->code,
                'nature' => 'coa',
                'currency_id' => $chartOfAccount->currency_id,
                'active' => (bool) ($chartOfAccount->active ?? true),
                'is_system_generated' => true,
                'user_add_id' => $chartOfAccount->user_add_id,
            ]);

            $chartOfAccount->account_id = $account->id;
        }
    }

    public function syncLinkedAccount(ChartOfAccount $chartOfAccount): void
    {
        DB::transaction(function () use ($chartOfAccount) {
            $chartOfAccount = ChartOfAccount::query()
                ->lockForUpdate()
                ->findOrFail($chartOfAccount->id);

            $payload = [
                'name' => $chartOfAccount->name,
                'code' => $chartOfAccount->code,
                'nature' => 'coa',
                'currency_id' => $chartOfAccount->currency_id,
                'active' => (bool) $chartOfAccount->active,
                'is_system_generated' => true,
                'user_add_id' => $chartOfAccount->user_add_id,
            ];

            if ($chartOfAccount->account_id) {
                $account = Account::query()
                    ->whereKey($chartOfAccount->account_id)
                    ->lockForUpdate()
                    ->first();

                if ($account) {
                    $account->forceFill($payload)->saveQuietly();
                } else {
                    $account = Account::query()->create($payload);
                }
            } else {
                $account = Account::query()->create($payload);
            }

            if ($chartOfAccount->account_id !== $account->id) {
                $chartOfAccount->forceFill([
                    'account_id' => $account->id,
                ])->saveQuietly();
            }
        });
    }

    public function deactivateLinkedAccount(ChartOfAccount $chartOfAccount): void
    {
        if (!$chartOfAccount->account_id) {
            return;
        }

        Account::query()
            ->whereKey($chartOfAccount->account_id)
            ->update(['active' => false]);
    }

    protected function rangeForType(?string $type): array
    {
        return match ($type) {
            'asset' => [1000, 1999],
            'liability' => [2000, 2999],
            'equity' => [3000, 3999],
            'income' => [4000, 4999],
            'expense' => [6000, 7999],
            default => throw ValidationException::withMessages([
                'type' => 'Invalid chart of account type.',
            ]),
        };
    }
}
