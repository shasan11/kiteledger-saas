<?php

namespace App\Domain\Accounting\Services;

use App\Models\BankAccount;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ForexAdjustmentService
{
    public function __construct(
        protected JournalVoucherService $journalVoucherService
    ) {}

    /**
     * Compute a preview of the revaluation given the current foreign currency
     * balance and a new exchange rate. Does not persist anything.
     */
    public function preview(BankAccount $bankAccount, float $foreignBalance, float $currentBaseValue, float $newRate): array
    {
        $revaluedBase = round($foreignBalance * $newRate, 2);
        $gainLoss = round($revaluedBase - $currentBaseValue, 2);
        $oldRate = $foreignBalance != 0.0 ? round($currentBaseValue / $foreignBalance, 6) : 0.0;

        return [
            'bank_account_id' => $bankAccount->id,
            'currency_id' => $bankAccount->currency_id,
            'foreign_balance' => round($foreignBalance, 2),
            'current_base_value' => round($currentBaseValue, 2),
            'existing_rate' => $oldRate,
            'new_rate' => round($newRate, 6),
            'revalued_base_value' => $revaluedBase,
            'gain_loss' => $gainLoss,
            'type' => $gainLoss > 0 ? 'gain' : ($gainLoss < 0 ? 'loss' : 'none'),
        ];
    }

    /**
     * Post a forex revaluation JV against the bank account's underlying account and
     * the chosen gain/loss account.
     */
    public function post(BankAccount $bankAccount, array $data, ?int $userId = null): JournalVoucher
    {
        if (! $bankAccount->account_id) {
            throw ValidationException::withMessages([
                'bank_account' => 'This bank account is not linked to an actual account.',
            ]);
        }

        return DB::transaction(function () use ($bankAccount, $data, $userId) {
            $foreignBalance = (float) $data['foreign_balance'];
            $currentBaseValue = (float) $data['current_base_value'];
            $newRate = (float) $data['new_rate'];

            $preview = $this->preview($bankAccount, $foreignBalance, $currentBaseValue, $newRate);
            $gainLoss = (float) $preview['gain_loss'];

            if (abs($gainLoss) < 0.01) {
                throw ValidationException::withMessages([
                    'new_rate' => 'No forex difference to post — gain/loss is zero.',
                ]);
            }

            $isGain = $gainLoss > 0;
            $amount = round(abs($gainLoss), 2);
            $offsetAccountId = $isGain ? ($data['gain_account_id'] ?? null) : ($data['loss_account_id'] ?? null);

            if (! $offsetAccountId) {
                throw ValidationException::withMessages([
                    $isGain ? 'gain_account_id' : 'loss_account_id'
                        => 'Please select the forex ' . ($isGain ? 'gain' : 'loss') . ' account.',
                ]);
            }

            $date = $data['adjustment_date'] ?? now()->toDateString();

            $jv = JournalVoucher::create([
                'branch_id' => $bankAccount->branch_id,
                'voucher_date' => $date,
                'currency_id' => $bankAccount->currency_id,
                'reference' => $data['reference'] ?? null,
                'narration' => $data['narration']
                    ?? "Forex revaluation of {$bankAccount->display_name} at rate {$newRate}",
                'source_type' => BankAccount::class,
                'source_id' => $bankAccount->id,
                'source_module' => 'forex_adjustment',
                'is_auto_generated' => true,
                'is_system_generated' => true,
                'status' => 'draft',
                'active' => true,
                'approved' => false,
                'void' => false,
                'exchange_rate' => $newRate,
                'total' => $amount,
                'user_add_id' => $userId,
            ]);

            $description = $isGain
                ? "Forex gain on {$bankAccount->display_name}"
                : "Forex loss on {$bankAccount->display_name}";

            JournalVoucherLine::create([
                'journal_voucher_id' => $jv->id,
                'account_id' => $bankAccount->account_id,
                'description' => $description,
                'debit' => $isGain ? $amount : 0,
                'credit' => $isGain ? 0 : $amount,
                'currency_id' => $bankAccount->currency_id,
                'exchange_rate' => $newRate,
            ]);

            JournalVoucherLine::create([
                'journal_voucher_id' => $jv->id,
                'account_id' => $offsetAccountId,
                'description' => $description,
                'debit' => $isGain ? 0 : $amount,
                'credit' => $isGain ? $amount : 0,
                'currency_id' => $bankAccount->currency_id,
                'exchange_rate' => $newRate,
            ]);

            return $this->journalVoucherService->post($jv, $userId);
        });
    }
}
