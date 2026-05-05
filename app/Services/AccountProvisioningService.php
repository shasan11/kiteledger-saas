<?php

namespace App\Services;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\EmployeeProfile;
use App\Models\LoanAccount;
use Illuminate\Database\Eloquent\Model;

class AccountProvisioningService
{
    public function createForChartOfAccount(ChartOfAccount $chartOfAccount): Account
    {
        if ($chartOfAccount->account_id) {
            return $chartOfAccount->account;
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (!$baseCurrency) {
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

    public function createForContact(Contact $contact): Account
    {
        if ($contact->account_id) {
            return $contact->account;
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (!$baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $contact->name,
                'code' => $contact->code ?? 'CONT-' . substr($contact->id, 0, 8),
            ],
            [
                'nature' => 'actor',
                'currency_id' => $baseCurrency?->id,
                'active' => true,
                'is_system_generated' => true,
            ]
        );

        $contact->updateQuietly(['account_id' => $account->id]);

        return $account;
    }

    public function createForBankAccount(BankAccount $bankAccount): Account
    {
        if ($bankAccount->account_id) {
            return $bankAccount->account;
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (!$baseCurrency) {
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
        if (!$baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $loanAccount->name,
                'code' => $loanAccount->loan_number ?? 'LOAN-' . substr($loanAccount->id, 0, 8),
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
        if (!$employee->account_id || !class_exists(EmployeeProfile::class)) {
            return null;
        }

        if ($employee->account_id) {
            return Account::find($employee->account_id);
        }

        $baseCurrency = Currency::where('is_base', true)->first();
        if (!$baseCurrency) {
            $baseCurrency = Currency::first();
        }

        $account = Account::firstOrCreate(
            [
                'name' => $employee->name,
                'code' => $employee->employee_id ?? 'EMP-' . substr($employee->id, 0, 8),
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

        if (!isset($data['currency_id'])) {
            $baseCurrency = Currency::where('is_base', true)->first();
            $data['currency_id'] = $baseCurrency?->id;
        }

        return Account::firstOrCreate(
            ['name' => $data['name'] ?? null, 'code' => $data['code'] ?? null],
            $data
        );
    }
}
