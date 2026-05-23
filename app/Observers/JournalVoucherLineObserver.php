<?php

namespace App\Observers;

use App\Models\ChartOfAccount;
use App\Models\Account;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use App\Observers\Concerns\CapturesAccountingEffect;
use App\Domain\Accounting\Services\JournalVoucherService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class JournalVoucherLineObserver
{
    use CapturesAccountingEffect;

    public function saving(JournalVoucherLine $line): void
    {
        $debit = (float) $line->debit;
        $credit = (float) $line->credit;

        if ($debit < 0 || $credit < 0) {
            throw ValidationException::withMessages([
                'line' => 'Debit and credit cannot be negative.',
            ]);
        }

        if ($debit <= 0 && $credit <= 0) {
            throw ValidationException::withMessages([
                'line' => 'Either debit or credit is required.',
            ]);
        }

        if ($debit > 0 && $credit > 0) {
            throw ValidationException::withMessages([
                'line' => 'A line cannot have both debit and credit.',
            ]);
        }

        $this->resolveAccountColumns($line);

        if (!$line->account_id) {
            throw ValidationException::withMessages([
                'account_id' => 'Every journal voucher line must have an account.',
            ]);
        }
    }

    protected function resolveAccountColumns(JournalVoucherLine $line): void
    {
        $table = $line->getTable();
        $hasAccountId = Schema::hasColumn($table, 'account_id');
        $hasChartOfAccountId = Schema::hasColumn($table, 'chart_of_account_id');

        if (! $hasAccountId) {
            throw ValidationException::withMessages([
                'account_id' => 'journal_voucher_lines must have account_id.',
            ]);
        }

        if (! $line->account_id && $hasChartOfAccountId && $line->chart_of_account_id) {
            $chartOfAccount = ChartOfAccount::query()->find($line->chart_of_account_id);

            if (! $chartOfAccount || ! $chartOfAccount->account_id) {
                throw ValidationException::withMessages([
                    'account_id' => 'Selected chart of account is not linked to an account.',
                ]);
            }

            $line->account_id = $chartOfAccount->account_id;
        }

        // TODO: Drop this legacy bridge after chart_of_account_id is removed from journal_voucher_lines.
        if ($line->account_id && $hasChartOfAccountId && ! $line->chart_of_account_id) {
            $line->chart_of_account_id = $this->legacyChartOfAccountIdForAccount($line->account_id);
        }
    }

    protected function legacyChartOfAccountIdForAccount(string $accountId): string
    {
        $chartOfAccountId = ChartOfAccount::query()
            ->where('account_id', $accountId)
            ->value('id');

        if ($chartOfAccountId) {
            return $chartOfAccountId;
        }

        $account = Account::query()->find($accountId);

        if (! $account) {
            throw ValidationException::withMessages([
                'account_id' => 'Selected account does not exist.',
            ]);
        }

        return ChartOfAccount::withoutEvents(function () use ($account) {
            $chart = new ChartOfAccount;
            $chart->forceFill([
                'id' => (string) Str::orderedUuid(),
                'account_id' => $account->id,
                'type' => 'asset',
                'code' => null,
                'name' => $account->name,
                'description' => 'Legacy journal line compatibility link for account-based posting.',
                'active' => (bool) $account->active,
                'is_system_generated' => true,
                'user_add_id' => $account->user_add_id,
            ])->saveQuietly();

            return $chart->id;
        });
    }

    public function updating(JournalVoucherLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function deleting(JournalVoucherLine $line): void
    {
        $this->captureParentEffect($line);
    }

    public function saved(JournalVoucherLine $line): void
    {
        $this->resyncParent($line);
    }

    public function deleted(JournalVoucherLine $line): void
    {
        $this->resyncParent($line);
    }

    protected function captureParentEffect(JournalVoucherLine $line): void
    {
        $voucher = JournalVoucher::query()
            ->with('journalVoucherLines')
            ->find($line->journal_voucher_id);

        if (!$voucher) {
            return;
        }

        $oldEffect = app(JournalVoucherService::class)->snapshotEffect($voucher);

        $this->storeOldEffect(JournalVoucher::class, $voucher->id, $oldEffect);
    }

    protected function resyncParent(JournalVoucherLine $line): void
    {
        DB::transaction(function () use ($line) {
            $voucher = JournalVoucher::query()
                ->with('journalVoucherLines')
                ->find($line->journal_voucher_id);

            if (!$voucher) {
                return;
            }

            if (!$this->isReadyForFinancialSync($voucher)) {
                return;
            }

            $oldEffect = $this->pullOldEffect(JournalVoucher::class, $voucher->id);

            app(JournalVoucherService::class)->syncFinancials(
                journalVoucher: $voucher,
                oldEffect: $oldEffect
            );
        });
    }

    protected function isReadyForFinancialSync(JournalVoucher $voucher): bool
    {
        $lines = $voucher->journalVoucherLines;

        if ($lines->count() < 2) {
            return false;
        }

        $debit = round((float) $lines->sum(fn ($line) => (float) $line->debit), 2);
        $credit = round((float) $lines->sum(fn ($line) => (float) $line->credit), 2);

        return $debit > 0 && $credit > 0 && $debit === $credit;
    }
}
