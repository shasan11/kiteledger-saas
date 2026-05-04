<?php

namespace App\Domain\Accounting\Services;

use App\Models\ChartOfAccount;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

class SystemJournalVoucherService
{
    public function __construct(
        protected CodeGeneratorService $codeGenerator
    ) {}

    public function syncFromEntries(
        string $sourceType,
        Model $source,
        string $date,
        array $entries,
        ?string $branchId = null,
        ?string $currencyId = null,
        string $status = 'draft',
        ?string $narration = null,
        float|int|string|null $exchangeRate = 1
    ): JournalVoucher {
        return DB::transaction(function () use (
            $sourceType,
            $source,
            $date,
            $entries,
            $branchId,
            $currencyId,
            $status,
            $narration,
            $exchangeRate
        ) {
            $voucher = $this->findExistingVoucher($sourceType, $source);

            $reference = $this->reference($sourceType, $source->getKey());

            $voucherPayload = [
                'branch_id' => $branchId,
                'voucher_date' => $date,
                'currency_id' => $currencyId,
                'reference' => $reference,
                'narration' => $narration ?: "System generated from {$sourceType}",
                'status' => $status,
                'active' => true,
                'approved' => false,
                'void' => false,
                'exchange_rate' => $exchangeRate ?: 1,
                'is_system_generated' => true,
            ];

            $voucherPayload = $this->addOptionalSourceColumns(
                payload: $voucherPayload,
                sourceType: $sourceType,
                sourceId: $source->getKey()
            );

            JournalVoucher::withoutEvents(function () use (&$voucher, $voucherPayload) {
                if ($voucher) {
                    $voucher->forceFill($voucherPayload)->saveQuietly();
                } else {
                    $voucher = JournalVoucher::query()->create(array_merge($voucherPayload, [
                        'voucher_no' => $this->codeGenerator->nextDocumentNumber(
                            modelClass: JournalVoucher::class,
                            column: 'voucher_no',
                            prefix: 'JV',
                            branchId: $voucherPayload['branch_id'] ?? null
                        ),
                    ]));
                }
            });

            JournalVoucherLine::withoutEvents(function () use ($voucher, $entries) {
                JournalVoucherLine::query()
                    ->where('journal_voucher_id', $voucher->id)
                    ->delete();

                foreach ($entries as $entry) {
                    $accountId = $entry['account_id'] ?? null;
                    $debit = (float) ($entry['debit'] ?? 0);
                    $credit = (float) ($entry['credit'] ?? 0);

                    if (!$accountId) {
                        throw ValidationException::withMessages([
                            'account_id' => 'System journal entry account_id is required.',
                        ]);
                    }

                    if ($debit <= 0 && $credit <= 0) {
                        continue;
                    }

                    if ($debit > 0 && $credit > 0) {
                        throw ValidationException::withMessages([
                            'journal_line' => 'System JV line cannot have both debit and credit.',
                        ]);
                    }

                    JournalVoucherLine::query()->create(
                        $this->buildLinePayload(
                            voucherId: $voucher->id,
                            accountId: $accountId,
                            debit: $debit,
                            credit: $credit,
                            description: $entry['description'] ?? null
                        )
                    );
                }
            });

            $this->syncBackReferenceToSource($source, $voucher);

            return $voucher->fresh(['journalVoucherLines']);
        });
    }

    protected function findExistingVoucher(string $sourceType, Model $source): ?JournalVoucher
    {
        $sourceTable = $source->getTable();

        if (
            Schema::hasColumn($sourceTable, 'subsequent_journal_voucher_id')
            && !empty($source->subsequent_journal_voucher_id)
        ) {
            return JournalVoucher::query()->find($source->subsequent_journal_voucher_id);
        }

        if (
            Schema::hasColumn($sourceTable, 'journal_voucher_id')
            && !empty($source->journal_voucher_id)
        ) {
            return JournalVoucher::query()->find($source->journal_voucher_id);
        }

        $voucher = new JournalVoucher();
        $voucherTable = $voucher->getTable();

        if (
            Schema::hasColumn($voucherTable, 'source_type')
            && Schema::hasColumn($voucherTable, 'source_id')
        ) {
            return JournalVoucher::query()
                ->where('source_type', $sourceType)
                ->where('source_id', $source->getKey())
                ->first();
        }

        return JournalVoucher::query()
            ->where('reference', $this->reference($sourceType, $source->getKey()))
            ->first();
    }

    protected function buildLinePayload(
        string $voucherId,
        string $accountId,
        float $debit,
        float $credit,
        ?string $description = null
    ): array {
        $line = new JournalVoucherLine();
        $table = $line->getTable();

        $payload = [
            'journal_voucher_id' => $voucherId,
            'description' => $description,
            'debit' => $debit,
            'credit' => $credit,
        ];

        if (Schema::hasColumn($table, 'account_id')) {
            $payload['account_id'] = $accountId;
            return $payload;
        }

        if (Schema::hasColumn($table, 'chart_of_account_id')) {
            $coaId = ChartOfAccount::query()
                ->where('account_id', $accountId)
                ->value('id');

            if (!$coaId) {
                throw ValidationException::withMessages([
                    'chart_of_account_id' => "No ChartOfAccount found for account_id {$accountId}. Add account_id to journal_voucher_lines or create linked COA.",
                ]);
            }

            $payload['chart_of_account_id'] = $coaId;
            return $payload;
        }

        throw ValidationException::withMessages([
            'journal_voucher_lines' => 'journal_voucher_lines must have account_id or chart_of_account_id.',
        ]);
    }

    protected function addOptionalSourceColumns(array $payload, string $sourceType, string $sourceId): array
    {
        $voucher = new JournalVoucher();
        $table = $voucher->getTable();

        if (Schema::hasColumn($table, 'source_type')) {
            $payload['source_type'] = $sourceType;
        }

        if (Schema::hasColumn($table, 'source_id')) {
            $payload['source_id'] = $sourceId;
        }

        $specificColumn = match ($sourceType) {
            'cash_transfer' => 'cash_transfer_id',
            'loan_account' => 'loan_account_id',
            'loan_top_up' => 'loan_top_up_id',
            'loan_charge' => 'loan_charge_id',
            default => null,
        };

        if ($specificColumn && Schema::hasColumn($table, $specificColumn)) {
            $payload[$specificColumn] = $sourceId;
        }

        return $payload;
    }

    protected function syncBackReferenceToSource(Model $source, JournalVoucher $voucher): void
    {
        $table = $source->getTable();

        if (Schema::hasColumn($table, 'subsequent_journal_voucher_id')) {
            $source->forceFill([
                'subsequent_journal_voucher_id' => $voucher->id,
            ])->saveQuietly();

            return;
        }

        if (Schema::hasColumn($table, 'journal_voucher_id')) {
            $source->forceFill([
                'journal_voucher_id' => $voucher->id,
            ])->saveQuietly();
        }
    }

    protected function reference(string $sourceType, string $sourceId): string
    {
        return 'SYS:' . strtoupper($sourceType) . ':' . $sourceId;
    }
}