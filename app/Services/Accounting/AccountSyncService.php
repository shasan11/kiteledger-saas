<?php

namespace App\Services\Accounting;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use Illuminate\Validation\ValidationException;

class AccountSyncService
{
    public function __construct(
        protected AccountCodeSequenceService $accountCodeSequenceService,
    ) {
    }

    public function prepareChartOfAccountBeforeSave(ChartOfAccount $chartOfAccount): void
    {
        $this->assertChartOfAccountBranchConsistency($chartOfAccount);

        if (blank($chartOfAccount->code)) {
            $chartOfAccount->code = $this->accountCodeSequenceService->nextCode('coa', $chartOfAccount->branch_id);
        }
    }

    public function syncChartOfAccount(ChartOfAccount $chartOfAccount): void
    {
        $this->assertChartOfAccountBranchConsistency($chartOfAccount);

        $account = $this->resolveLinkedAccount($chartOfAccount, 'coa');

        $account->fill([
            'branch_id' => $chartOfAccount->branch_id,
            'name' => $chartOfAccount->name,
            'code' => $chartOfAccount->code,
            'nature' => 'coa',
            'parent_id' => null,
            'currency_id' => $chartOfAccount->currency_id,
            'description' => $chartOfAccount->description,
            'active' => (bool) $chartOfAccount->active,
            'is_system_generated' => (bool) $chartOfAccount->is_system_generated,
            'user_add_id' => $chartOfAccount->user_add_id,
        ]);
        $account->save();

        if ((string) $chartOfAccount->account_id !== (string) $account->getKey()) {
            $chartOfAccount->forceFill(['account_id' => $account->getKey()])->saveQuietly();
        }
    }

    public function prepareBankAccountBeforeSave(BankAccount $bankAccount): void
    {
        if (blank($bankAccount->code)) {
            $bankAccount->code = $this->accountCodeSequenceService->nextCode($bankAccount->type ?: 'bank', $bankAccount->branch_id);
        }
    }

    public function syncBankAccount(BankAccount $bankAccount): void
    {
        $account = $this->resolveLinkedAccount($bankAccount, $bankAccount->type ?: 'bank');

        $account->fill([
            'branch_id' => $bankAccount->branch_id,
            'name' => $bankAccount->display_name,
            'code' => $bankAccount->code,
            'nature' => $bankAccount->type,
            'parent_id' => null,
            'currency_id' => $bankAccount->currency_id,
            'description' => $bankAccount->description,
            'bank_name' => $bankAccount->bank_name,
            'account_name' => $bankAccount->account_name,
            'account_number' => $bankAccount->account_number,
            'account_type' => $bankAccount->account_type,
            'swift_code' => $bankAccount->swift_code,
            'opening_balance' => $bankAccount->opening_balance ?? 0,
            'active' => (bool) $bankAccount->active,
            'is_system_generated' => (bool) $bankAccount->is_system_generated,
            'user_add_id' => $bankAccount->user_add_id,
        ]);
        $account->save();

        if ((string) $bankAccount->account_id !== (string) $account->getKey()) {
            $bankAccount->forceFill(['account_id' => $account->getKey()])->saveQuietly();
        }
    }

    public function deactivateLinkedAccount(string $accountId): void
    {
        Account::query()->whereKey($accountId)->update(['active' => false]);
    }

    protected function assertChartOfAccountBranchConsistency(ChartOfAccount $chartOfAccount): void
    {
        if (! $chartOfAccount->account_id) {
            return;
        }

        $account = Account::query()->find($chartOfAccount->account_id);

        if ($account === null) {
            throw ValidationException::withMessages(['account_id' => 'Linked account does not exist.']);
        }

        if ($account->branch_id !== $chartOfAccount->branch_id) {
            throw ValidationException::withMessages(['account_id' => 'Linked account must belong to the same branch.']);
        }
    }

    protected function resolveLinkedAccount(ChartOfAccount|BankAccount $owner, string $defaultNature): Account
    {
        if ($owner->account_id) {
            $existing = Account::query()->find($owner->account_id);

            if ($existing) {
                $this->assertBranchMatch($owner->branch_id, $existing->branch_id);

                return $existing;
            }
        }

        $existingByOwner = Account::query()
            ->where('owner_type', $owner::class)
            ->where('owner_id', $owner->getKey())
            ->first();

        if ($existingByOwner) {
            $this->assertBranchMatch($owner->branch_id, $existingByOwner->branch_id);

            return $existingByOwner;
        }

        $this->assertUniqueCodePerBranch($owner->branch_id, $owner->code);

        return new Account([
            'nature' => $defaultNature,
            'owner_type' => $owner::class,
            'owner_id' => $owner->getKey(),
        ]);
    }

    protected function assertBranchMatch(?string $ownerBranchId, ?string $accountBranchId): void
    {
        if ($ownerBranchId !== $accountBranchId) {
            throw ValidationException::withMessages(['branch_id' => 'Branch mismatch between owner and account.']);
        }
    }

    protected function assertUniqueCodePerBranch(?string $branchId, ?string $code): void
    {
        if (blank($code)) {
            return;
        }

        $exists = Account::query()
            ->where('branch_id', $branchId)
            ->where('code', $code)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages(['code' => 'Code must be unique within the branch.']);
        }
    }
}
