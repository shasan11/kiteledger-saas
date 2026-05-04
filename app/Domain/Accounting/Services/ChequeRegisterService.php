<?php

namespace App\Domain\Accounting\Services;

use App\Models\ChequeRegister;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ChequeRegisterService
{
    public function __construct(
        protected PostingService $postingService
    ) {}

    public function snapshotEffect(ChequeRegister $chequeRegister): array
    {
        if (!$this->postingService->isFinanciallyPosted($chequeRegister, ['cleared'])) {
            return [];
        }

        $this->validate($chequeRegister);

        $effect = [];

        $amount = $this->postingService->convertAmount(
            amount: $chequeRegister->amount,
            exchangeRate: $chequeRegister->exchange_rate ?: 1
        );

        if ($chequeRegister->direction === 'received') {
            $this->postingService->addDebit($effect, $chequeRegister->account_id, $amount);
            $this->postingService->addCredit($effect, $chequeRegister->related_account_id, $amount);
        } else {
            $this->postingService->addDebit($effect, $chequeRegister->related_account_id, $amount);
            $this->postingService->addCredit($effect, $chequeRegister->account_id, $amount);
        }

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(ChequeRegister $chequeRegister, array $oldEffect = []): void
    {
        DB::transaction(function () use ($chequeRegister, $oldEffect) {
            $chequeRegister = ChequeRegister::query()
                ->lockForUpdate()
                ->findOrFail($chequeRegister->id);

            $this->validate($chequeRegister);
            $this->recalculateTotal($chequeRegister);

            $newEffect = $this->snapshotEffect($chequeRegister);

            $this->postingService->applyEffectDiff($oldEffect, $newEffect);
        });
    }

    public function validate(ChequeRegister $chequeRegister): void
    {
        if (!in_array($chequeRegister->direction, ['issued', 'received'], true)) {
            throw ValidationException::withMessages([
                'direction' => 'Cheque direction must be issued or received.',
            ]);
        }

        if (!$chequeRegister->account_id) {
            throw ValidationException::withMessages([
                'account_id' => 'Cheque account is required.',
            ]);
        }

        if (!$chequeRegister->related_account_id) {
            throw ValidationException::withMessages([
                'related_account_id' => 'Related account is required.',
            ]);
        }

        if ($chequeRegister->account_id === $chequeRegister->related_account_id) {
            throw ValidationException::withMessages([
                'related_account_id' => 'Cheque account and related account cannot be same.',
            ]);
        }

        if ((float) $chequeRegister->amount <= 0) {
            throw ValidationException::withMessages([
                'amount' => 'Cheque amount must be greater than zero.',
            ]);
        }
    }

    public function recalculateTotal(ChequeRegister $chequeRegister): void
    {
        $chequeRegister->forceFill([
            'total' => $this->postingService->convertAmount(
                amount: $chequeRegister->amount,
                exchangeRate: $chequeRegister->exchange_rate ?: 1
            ),
        ])->saveQuietly();
    }
}