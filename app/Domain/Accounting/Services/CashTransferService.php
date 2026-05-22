<?php

namespace App\Domain\Accounting\Services;

use App\Models\CashTransfer;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CashTransferService
{
    public function __construct(
        protected PostingService $postingService,
        protected CodeGeneratorService $codeGenerator,
        protected SystemJournalVoucherService $systemJournalVoucherService
    ) {}

    public function snapshotEffect(CashTransfer $cashTransfer): array
    {
        $cashTransfer->loadMissing('cashTransferLines');

        if (! $this->postingService->isFinanciallyPosted($cashTransfer, ['posted'])) {
            return [];
        }

        $effect = [];

        $totalBaseAmount = 0.0;

        foreach ($cashTransfer->cashTransferLines as $line) {
            $lineExchangeRate = $line->exchange_rate_to_default ?: ($cashTransfer->exchange_rate ?: 1);

            $baseAmount = $this->postingService->convertAmount(
                amount: $line->amount,
                exchangeRate: $lineExchangeRate
            );

            $totalBaseAmount += $baseAmount;

            $this->postingService->addDebit(
                effect: $effect,
                accountId: $line->to_account_id,
                amount: $baseAmount
            );
        }

        $this->postingService->addCredit(
            effect: $effect,
            accountId: $cashTransfer->from_account_id,
            amount: $totalBaseAmount
        );

        return $this->postingService->normalizeEffect($effect);
    }

    public function syncFinancials(CashTransfer $cashTransfer, array $oldEffect = []): void
    {
        DB::transaction(function () use ($cashTransfer) {
            $cashTransfer = CashTransfer::query()
                ->with('cashTransferLines')
                ->lockForUpdate()
                ->findOrFail($cashTransfer->id);

            $this->validate($cashTransfer);
            $this->assignTransferNoIfMissing($cashTransfer);
            $this->recalculateTotal($cashTransfer);
            $this->syncGeneratedJournalVoucher($cashTransfer);
        });
    }

    public function validate(CashTransfer $cashTransfer): void
    {
        $cashTransfer->loadMissing('cashTransferLines');

        if (! $cashTransfer->from_account_id) {
            throw ValidationException::withMessages([
                'from_account_id' => 'From account is required.',
            ]);
        }

        if (! $cashTransfer->currency_id) {
            throw ValidationException::withMessages([
                'currency_id' => 'Currency is required.',
            ]);
        }

        if ((float) ($cashTransfer->exchange_rate ?: 1) <= 0) {
            throw ValidationException::withMessages([
                'exchange_rate' => 'Exchange rate must be greater than zero.',
            ]);
        }

        if ($cashTransfer->cashTransferLines->count() < 1) {
            throw ValidationException::withMessages([
                'lines' => 'Cash transfer must have at least one line.',
            ]);
        }

        foreach ($cashTransfer->cashTransferLines as $line) {
            if (! $line->to_account_id) {
                throw ValidationException::withMessages([
                    'to_account_id' => 'To account is required.',
                ]);
            }

            if ($line->to_account_id === $cashTransfer->from_account_id) {
                throw ValidationException::withMessages([
                    'to_account_id' => 'To account cannot be same as from account.',
                ]);
            }

            if ((float) $line->amount <= 0) {
                throw ValidationException::withMessages([
                    'amount' => 'Cash transfer line amount must be greater than zero.',
                ]);
            }
        }
    }

    public function assignTransferNoIfMissing(CashTransfer $cashTransfer): void
    {
        if (! empty($cashTransfer->transfer_no)) {
            return;
        }

        $cashTransfer->forceFill([
            'transfer_no' => $this->codeGenerator->nextDocumentNumber(
                modelClass: CashTransfer::class,
                column: 'transfer_no',
                prefix: 'CT',
                branchId: $cashTransfer->branch_id
            ),
        ])->saveQuietly();
    }

    public function recalculateTotal(CashTransfer $cashTransfer): void
    {
        $cashTransfer->loadMissing('cashTransferLines');

        $totalAmount = 0.0;
        $baseTotal = 0.0;

        foreach ($cashTransfer->cashTransferLines as $line) {
            $amount = (float) $line->amount;
            $lineExchangeRate = $line->exchange_rate_to_default ?: ($cashTransfer->exchange_rate ?: 1);

            $totalAmount += $amount;
            $baseTotal += $this->postingService->convertAmount($amount, $lineExchangeRate);
        }

        $cashTransfer->forceFill([
            'total_amount' => round($totalAmount, 6),
            'total' => round($baseTotal, 6),
        ])->saveQuietly();
    }

    protected function syncGeneratedJournalVoucher(CashTransfer $cashTransfer): void
    {
        $cashTransfer->loadMissing('cashTransferLines');

        $entries = [];

        $totalBaseAmount = 0.0;

        foreach ($cashTransfer->cashTransferLines as $line) {
            $lineExchangeRate = $line->exchange_rate_to_default ?: ($cashTransfer->exchange_rate ?: 1);

            $baseAmount = $this->postingService->convertAmount($line->amount, $lineExchangeRate);
            $totalBaseAmount += $baseAmount;

            $entries[] = [
                'account_id' => $line->to_account_id,
                'debit' => $baseAmount,
                'credit' => 0,
                'description' => $line->description ?: 'Cash transfer received',
            ];
        }

        $entries[] = [
            'account_id' => $cashTransfer->from_account_id,
            'debit' => 0,
            'credit' => round($totalBaseAmount, 6),
            'description' => 'Cash transfer paid',
        ];

        $this->systemJournalVoucherService->syncFromEntries(
            sourceType: 'cash_transfer',
            source: $cashTransfer,
            date: $cashTransfer->transfer_date,
            entries: $entries,
            branchId: $cashTransfer->branch_id,
            currencyId: $cashTransfer->currency_id,
            status: $cashTransfer->status === 'posted' ? 'posted' : 'draft',
            narration: 'System generated journal voucher from cash transfer '.($cashTransfer->transfer_no ?? $cashTransfer->id),
            exchangeRate: $cashTransfer->exchange_rate ?: 1
        );
    }
}
