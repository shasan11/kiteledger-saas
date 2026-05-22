<?php

namespace App\Domain\Accounting\Services;

use App\Models\Account;
use App\Models\BankAccount;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankAccountService
{
    public function __construct(
        protected CodeGeneratorService $codeGenerator
    ) {}

    public function assignCodeIfMissing(BankAccount $bankAccount): void
    {
        if (!empty($bankAccount->code)) {
            return;
        }

        $prefix = match ($bankAccount->type) {
            'bank' => 'BA',
            'cash' => 'BC',
            default => throw ValidationException::withMessages([
                'type' => 'Bank account type must be bank or cash.',
            ]),
        };

        $bankAccount->code = DB::transaction(function () use ($bankAccount, $prefix) {
            return $this->codeGenerator->nextPrefixedCode(
                modelClass: BankAccount::class,
                column: 'code',
                prefix: $prefix,
                pad: 5,
                branchId: $bankAccount->branch_id
            );
        });
    }

    public function syncLinkedAccount(BankAccount $bankAccount): void
    {
        $source = $bankAccount;

        DB::transaction(function () use ($source) {
            $bankAccount = BankAccount::query()
                ->lockForUpdate()
                ->findOrFail($source->id);

            $payload = [
                'name' => $bankAccount->display_name,
                'code' => $bankAccount->code,
                'nature' => $bankAccount->type,
                'currency_id' => $bankAccount->currency_id,
                'swift_code' => $bankAccount->swift_code,
                'active' => (bool) $bankAccount->active,
                'is_system_generated' => true,
                'user_add_id' => $bankAccount->user_add_id,
            ];

            if ($bankAccount->account_id) {
                $account = Account::query()
                    ->whereKey($bankAccount->account_id)
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

            if ($bankAccount->account_id !== $account->id) {
                $bankAccount->forceFill([
                    'account_id' => $account->id,
                ])->saveQuietly();
            }

            $source->setAttribute('account_id', $account->id);
        });
    }

    public function deactivateLinkedAccount(BankAccount $bankAccount): void
    {
        if (!$bankAccount->account_id) {
            return;
        }

        Account::query()
            ->whereKey($bankAccount->account_id)
            ->update(['active' => false]);
    }
}
