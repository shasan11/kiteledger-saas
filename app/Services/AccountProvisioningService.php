<?php

namespace App\Services;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\EmployeeProfile;
use App\Models\LoanAccount;

class AccountProvisioningService
{
    public function createForChartOfAccount(ChartOfAccount $chartOfAccount): Account
    {
        if ($chartOfAccount->account_id) {
            return $chartOfAccount->account;
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (! $baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $chartOfAccount->name,
                'code' => $chartOfAccount->code,
            ],
            [
                'nature' => 'coa',
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $chartOfAccount->updateQuietly(['account_id' => $account->id]);

        return $account;
    }

    public function createForContact(Contact $contact): ?Account
    {
        if (! in_array($contact->contact_type, ['customer', 'supplier'])) {
            return null;
        }

        if ($contact->contact_type === 'customer') {
            $receivable = $contact->account_id
                ? $contact->account
                : $this->createContactAccount($contact, 'CUST', 'Receivable');

            $updates = [];
            if (! $contact->account_id && $receivable) {
                $updates['account_id'] = $receivable->id;
            }

            if ((bool) $contact->accept_purchase && ! $contact->payable_account_id) {
                $payable = $this->createContactAccount($contact, 'SUP', 'Payable');
                $updates['payable_account_id'] = $payable->id;
            }

            if ($updates) {
                $contact->updateQuietly($updates);
            }

            return $receivable;
        }

        if ($contact->account_id) {
            return $contact->account;
        }

        $payable = $this->createContactAccount($contact, 'SUP', 'Payable');
        $contact->updateQuietly(['account_id' => $payable->id]);

        return $payable;
    }

    public function syncContactAccount(Contact $contact): void
    {
        $roles = [
            $contact->account_id => $contact->contact_type === 'supplier' ? 'Payable' : 'Receivable',
            $contact->payable_account_id => 'Payable',
        ];

        foreach ($roles as $accountId => $role) {
            if (! $accountId) {
                continue;
            }

            $account = Account::find($accountId);
            if ($account && $account->is_system_generated) {
                $account->updateQuietly(['name' => "{$contact->name} - {$role}"]);
            }
        }
    }

    protected function generateContactAccountCode(string $prefix, ?string $contactCode): string
    {
        if ($contactCode) {
            $code = "{$prefix}-{$contactCode}";
            if (! Account::query()->where('code', $code)->exists()) {
                return $code;
            }
        }

        $max = Account::query()
            ->where('code', 'like', "{$prefix}-%")
            ->pluck('code')
            ->map(fn ($c) => (int) preg_replace('/\D+/', '', substr((string) $c, strlen($prefix) + 1)))
            ->max() ?? 0;

        do {
            $code = "{$prefix}-".str_pad((string) (++$max), 4, '0', STR_PAD_LEFT);
        } while (Account::query()->where('code', $code)->exists());

        return $code;
    }

    protected function createContactAccount(Contact $contact, string $prefix, string $role): Account
    {
        $baseCurrency = Currency::where('is_base', true)->first() ?: Currency::first();
        $code = $this->generateContactAccountCode($prefix, $contact->code);

        return Account::firstOrCreate(
            ['code' => $code],
            [
                'name' => "{$contact->name} - {$role}",
                'nature' => 'actor',
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );
    }

    public function createForBankAccount(BankAccount $bankAccount): Account
    {
        if ($bankAccount->account_id) {
            return $bankAccount->account;
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (! $baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $nature = $bankAccount->type === 'cash' ? 'cash' : 'bank';

        $account = Account::firstOrCreate(
            [
                'name' => $bankAccount->display_name,
                'code' => $bankAccount->code,
            ],
            [
                'nature' => $nature,
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $bankAccount->updateQuietly(['account_id' => $account->id]);

        return $account;
    }

    public function createForLoanAccount(LoanAccount $loanAccount): Account
    {
        if ($loanAccount->related_account_id) {
            return Account::find($loanAccount->related_account_id);
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (! $baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $loanAccount->name,
                'code' => $loanAccount->loan_number ?? 'LOAN-'.substr($loanAccount->id, 0, 8),
            ],
            [
                'nature' => 'coa',
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $loanAccount->updateQuietly(['related_account_id' => $account->id]);

        return $account;
    }

    public function createForEmployeeProfile(EmployeeProfile $employee): ?Account
    {
        if (! $employee->account_id || ! class_exists(EmployeeProfile::class)) {
            return null;
        }

        if ($employee->account_id) {
            return Account::find($employee->account_id);
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (! $baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $employee->name,
                'code' => $employee->employee_id ?? 'EMP-'.substr($employee->id, 0, 8),
            ],
            [
                'nature' => 'employee',
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        if (method_exists($employee, 'updateQuietly')) {
            $employee->updateQuietly(['account_id' => $account->id]);
        }

        return $account;
    }

    public function createGenericAccount(array $data): Account
    {
        $data['active'] = $data['active'] ?? true;
        $data['is_system_generated'] = $data['is_system_generated'] ?? true;

        if (! isset($data['currency_id'])) {
            $baseCurrency = Currency::where('is_base', true)->first();
            $data['currency_id'] = $baseCurrency?->id;
        }

        return Account::firstOrCreate(
            ['name' => $data['name'] ?? null, 'code' => $data['code'] ?? null],
            $data
        );
    }
}
