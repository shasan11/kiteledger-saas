<?php

namespace App\Services\Payroll;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\PayrollSetting;
use App\Models\User;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class PayrollAccountSyncService
{
    public function shouldSyncPayrollAccount(User $user): bool
    {
        if (! $user->active) {
            return false;
        }

        if (filled($user->employee_id)) {
            return true;
        }

        if ($user->employment_status_id || $user->department_id || $user->shift_id || $user->leave_policy_id || $user->weekly_holiday_id) {
            return true;
        }

        if ($user->relationLoaded('roles') || method_exists($user, 'roles')) {
            try {
                return $user->roles()->whereIn('name', ['Employee', 'HR Employee', 'Staff'])->exists();
            } catch (\Throwable) {
                return false;
            }
        }

        return false;
    }

    public function syncEmployeePayrollAccount(User $employee): Account
    {
        abort_unless($this->shouldSyncPayrollAccount($employee), 422, 'Payroll account sync is only available for employee users.');

        return DB::transaction(function () use ($employee) {
            $employee = User::query()->lockForUpdate()->findOrFail($employee->id);

            $account = $this->findExistingEmployeeAccount($employee)
                ?: $this->createEmployeeAccount($employee);

            if ($account->nature !== 'employee') {
                $account->forceFill(['nature' => 'employee'])->save();
            }

            if (! $account->active) {
                $account->forceFill(['active' => true])->save();
            }

            $this->ensureChartAccountForPayrollAccount($account, $employee);

            if ($account->fresh()->nature !== 'employee') {
                DB::table('accounts')->where('id', $account->id)->update(['nature' => 'employee', 'updated_at' => now()]);
            }

            if ($employee->payroll_account_id !== $account->id) {
                $employee->forceFill(['payroll_account_id' => $account->id])->save();
            }

            return $account->fresh('chartOfAccounts');
        });
    }

    public function ensureChartAccountForPayrollAccount(Account $account, User $employee): ChartOfAccount
    {
        $existing = ChartOfAccount::query()
            ->where('account_id', $account->id)
            ->first();

        if ($existing) {
            if (! $existing->active) {
                $existing->forceFill(['active' => true])->save();
            }

            return $existing;
        }

        $parent = $this->findOrCreatePayrollPayableParent($employee->branch_id);

        return ChartOfAccount::query()->create([
            'account_id' => $account->id,
            'branch_id' => $employee->branch_id,
            'type' => 'liability',
            'code' => $account->code,
            'name' => $account->name,
            'parent_id' => $parent?->id,
            'description' => 'Auto-created employee payroll payable account.',
            'active' => true,
            'is_system_generated' => true,
            'user_add_id' => auth()->id(),
        ]);
    }

    public function syncEmployeesMissingPayrollAccounts(?string $branchId = null): int
    {
        $count = 0;

        User::query()
            ->where('active', true)
            ->where(function ($query) {
                $query
                    ->whereNotNull('employee_id')
                    ->orWhereNotNull('employment_status_id')
                    ->orWhereNotNull('department_id')
                    ->orWhereNotNull('shift_id')
                    ->orWhereNotNull('leave_policy_id')
                    ->orWhereNotNull('weekly_holiday_id')
                    ->orWhereHas('roles', fn ($roles) => $roles->whereIn('name', ['Employee', 'HR Employee', 'Staff']));
            })
            ->when($branchId, fn ($query) => $query->where('branch_id', $branchId))
            ->where(function ($query) {
                $query
                    ->whereNull('payroll_account_id')
                    ->orWhereDoesntHave('payrollAccount.chartOfAccounts');
            })
            ->orderBy('id')
            ->chunkById(100, function (Collection $employees) use (&$count) {
                foreach ($employees as $employee) {
                    $this->syncEmployeePayrollAccount($employee);
                    $count++;
                }
            });

        return $count;
    }

    protected function findExistingEmployeeAccount(User $employee): ?Account
    {
        if ($employee->payroll_account_id) {
            $account = Account::query()->find($employee->payroll_account_id);

            if ($account) {
                return $account;
            }
        }

        $code = $this->employeeAccountCode($employee);
        $name = $this->employeeAccountName($employee);

        return Account::query()
            ->where('code', $code)
            ->orWhere('name', $name)
            ->first();
    }

    protected function createEmployeeAccount(User $employee): Account
    {
        return Account::query()->create([
            'name' => $this->employeeAccountName($employee),
            'code' => $this->employeeAccountCode($employee),
            'nature' => 'employee',
            'active' => true,
            'is_system_generated' => true,
            'user_add_id' => auth()->id(),
        ]);
    }

    protected function findOrCreatePayrollPayableParent(?string $branchId): ?ChartOfAccount
    {
        $settings = PayrollSetting::query()
            ->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)->orWhereNull('branch_id');
            })
            ->orderByRaw('branch_id is null')
            ->first();

        if ($settings?->salary_payable_account_id) {
            $configured = ChartOfAccount::query()
                ->whereKey($settings->salary_payable_account_id)
                ->first();

            if ($configured) {
                return $configured;
            }
        }

        $existing = ChartOfAccount::query()
            ->whereIn('name', ['Payroll Payable', 'Salary Payable'])
            ->where('type', 'liability')
            ->where(function ($query) use ($branchId) {
                $query->where('branch_id', $branchId)->orWhereNull('branch_id');
            })
            ->orderByRaw('branch_id is null')
            ->first();

        if ($existing) {
            return $existing;
        }

        $account = Account::query()
            ->where('code', 'PAYROLL-PAY')
            ->orWhere('name', 'Payroll Payable')
            ->first();

        if (! $account) {
            $account = Account::query()->create([
                'name' => 'Payroll Payable',
                'code' => 'PAYROLL-PAY',
                'nature' => 'coa',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => auth()->id(),
            ]);
        }

        return ChartOfAccount::query()->firstOrCreate(
            ['account_id' => $account->id],
            [
                'branch_id' => $branchId,
                'type' => 'liability',
                'code' => $account->code,
                'name' => 'Payroll Payable',
                'description' => 'Auto-created payroll payable control account.',
                'active' => true,
                'is_system_generated' => true,
                'user_add_id' => auth()->id(),
            ]
        );
    }

    protected function employeeAccountName(User $employee): string
    {
        return 'Payroll Payable - ' . ($employee->employee_id ?: $employee->id) . ' - ' . $employee->display_name;
    }

    protected function employeeAccountCode(User $employee): string
    {
        $suffix = $employee->employee_id ?: $employee->id;

        return 'PAY-' . Str::upper(Str::slug((string) $suffix, '-'));
    }
}
