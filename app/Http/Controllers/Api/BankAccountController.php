<?php

namespace App\Http\Controllers\Api;

use App\Domain\Accounting\Services\JournalVoucherService;
use App\Models\BankAccount;
use App\Models\BankStatementLine;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class BankAccountController extends BaseCrudApiController
{
    protected string $modelClass = BankAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'currency',
        'account',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'currency' => 'currency_id',
        'account' => 'account_id',
    ];

    protected array $searchable = [
        'display_name',
        'code',
        'description',
        'bank_name',
        'account_name',
        'account_number',
        'account_type',
        'swift_code',
        'branch.name',
        'branch.code',
        'currency.name',
        'currency.code',
        'account.name',
        'account.code',
    ];

    protected array $filterable = [
        'branch_id',
        'type',
        'currency_id',
    ];

    protected array $booleanFilters = [
        'active',
    ];

    protected array $sortable = [
        'id',
        'display_name',
        'code',
        'type',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'created_at';

    protected array $storeRules = [
        'branch_id' => ['exclude'],
        'account_id' => ['exclude'],
        'is_system_generated' => ['exclude'],
        'user_add_id' => ['exclude'],

        'type' => ['required', 'in:bank,cash'],
        'display_name' => ['required', 'string', 'max:150'],
        'currency_id' => ['required', 'uuid', 'exists:currencies,id'],

        'description' => ['nullable', 'string'],
        'bank_name' => ['nullable', 'string', 'max:150'],
        'account_name' => ['nullable', 'string', 'max:150'],
        'account_number' => ['nullable', 'string', 'max:80'],
        'account_type' => ['nullable', 'string', 'max:50'],
        'swift_code' => ['nullable', 'string', 'max:50'],
        'opening_balance' => ['nullable', 'numeric'],

        'active' => ['nullable', 'boolean'],
    ];

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => ['exclude'],
            'account_id' => ['exclude'],
            'is_system_generated' => ['exclude'],
            'user_add_id' => ['exclude'],

            'type' => ['sometimes', 'required', 'in:bank,cash'],
            'display_name' => ['sometimes', 'required', 'string', 'max:150'],
            'currency_id' => ['sometimes', 'required', 'uuid', 'exists:currencies,id'],

            'description' => ['sometimes', 'nullable', 'string'],
            'bank_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_name' => ['sometimes', 'nullable', 'string', 'max:150'],
            'account_number' => ['sometimes', 'nullable', 'string', 'max:80'],
            'account_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'swift_code' => ['sometimes', 'nullable', 'string', 'max:50'],
            'opening_balance' => ['sometimes', 'nullable', 'numeric'],

            'active' => ['sometimes', 'nullable', 'boolean'],
        ];
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        /** @var BankAccount $record */
        $openingBalance = (float) ($record->opening_balance ?? 0);
        $ledgerBalance = (float) (optional($record->account)->balance ?? 0);
        $softwareBalance = $openingBalance + $ledgerBalance;

        $statementLines = BankStatementLine::query()
            ->where('bank_account_id', $record->id)
            ->orderBy('statement_date')
            ->orderBy('created_at')
            ->get();

        $statementRows = $this->formatStatementLines($statementLines, $openingBalance);
        $lastStatement = collect($statementRows)->last();
        $statementBalance = $lastStatement['balance'] ?? $openingBalance;
        $difference = round(((float) $statementBalance) - $softwareBalance, 2);

        $data['statement_balance'] = round((float) $statementBalance, 2);
        $data['software_ledger_balance'] = round($softwareBalance, 2);
        $data['current_balance'] = round($softwareBalance, 2);
        $data['reconciliation_difference'] = abs($difference);
        $data['reconciliation_status'] = abs($difference) < 0.01 ? 'reconciled' : 'needs_review';
        $data['last_statement_date'] = $lastStatement['date'] ?? null;
        $data['last_software_transaction_date'] = null;
        $data['balance_history'] = collect($statementRows)
            ->map(fn (array $row) => [
                'date' => $row['date'],
                'bank_statement_balance' => $row['balance'],
                'software_ledger_balance' => null,
            ])
            ->values()
            ->all();
        $data['deposit_withdrawal_summary'] = $this->depositWithdrawalSummary($statementLines);
        $data['bank_transactions'] = $statementRows;
        $data['statement_line_count'] = $statementLines->count();

        return $data;
    }

    public function ledger(Request $request, BankAccount $bankAccount)
    {
        $accountId = $bankAccount->account_id;
        $query = JournalVoucherLine::query()
            ->with(['journalVoucher.branch'])
            ->when($accountId, fn ($q) => $q->where('account_id', $accountId))
            ->whereHas('journalVoucher', function ($voucherQuery) use ($request) {
                $voucherQuery
                    ->when($request->filled('date_from'), fn ($q) => $q->whereDate('voucher_date', '>=', $request->date('date_from')))
                    ->when($request->filled('date_to'), fn ($q) => $q->whereDate('voucher_date', '<=', $request->date('date_to')))
                    ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->string('branch_id')))
                    ->when($request->filled('fiscal_year_id'), fn ($q) => $q->where('fiscal_year_id', $request->string('fiscal_year_id')));
            })
            ->join('journal_vouchers', 'journal_voucher_lines.journal_voucher_id', '=', 'journal_vouchers.id')
            ->orderBy('journal_vouchers.voucher_date')
            ->orderBy('journal_voucher_lines.created_at')
            ->select('journal_voucher_lines.*')
            ->get();

        $softwareBalance = (float) ($bankAccount->opening_balance ?? 0);

        $rows = $query->map(function (JournalVoucherLine $line) use (&$softwareBalance) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $softwareBalance += $debit - $credit;
            $voucher = $line->journalVoucher;

            return [
                'id' => $line->id,
                'date' => optional($voucher?->voucher_date)->toDateString(),
                'voucher_no' => $voucher?->voucher_no,
                'journal_voucher_id' => $voucher?->id,
                'description' => $line->description ?: $voucher?->narration,
                'branch' => $voucher?->branch?->name,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'balance' => round($softwareBalance, 2),
            ];
        })->values();

        $statementLines = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('statement_date', '>=', $request->date('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('statement_date', '<=', $request->date('date_to')))
            ->orderBy('statement_date')
            ->orderBy('created_at')
            ->get();

        $allStatementLines = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->orderBy('statement_date')
            ->orderBy('created_at')
            ->get();

        $statementRows = $this->formatStatementLines($statementLines, (float) ($bankAccount->opening_balance ?? 0));
        $allStatementRows = $this->formatStatementLines($allStatementLines, (float) ($bankAccount->opening_balance ?? 0));
        $lastStatement = collect($allStatementRows)->last();
        $statementBalance = $lastStatement['balance'] ?? (float) ($bankAccount->opening_balance ?? 0);

        return response()->json([
            'bank_account' => $bankAccount->load(['branch', 'currency', 'account']),
            'statement_balance' => round((float) $statementBalance, 2),
            'software_balance' => round($softwareBalance, 2),
            'reconciliation_difference' => abs(round(((float) $statementBalance) - $softwareBalance, 2)),
            'last_transaction_date' => $rows->last()['date'] ?? null,
            'last_statement_date' => $lastStatement['date'] ?? null,
            'statement_line_count' => $allStatementLines->count(),
            'rows' => $rows,
            'statement_lines' => $statementRows,
            'deposit_withdrawal_summary' => $this->depositWithdrawalSummary($statementLines),
        ]);
    }

    public function importStatement(Request $request, BankAccount $bankAccount)
    {
        $action = $request->string('action')->toString();

        if ($action === 'create_journal_voucher') {
            return $this->createJournalVoucherFromStatementLine($request, $bankAccount);
        }

        if ($action === 'ignore') {
            return $this->ignoreStatementLine($request, $bankAccount);
        }

        $validated = $request->validate([
            'lines' => ['required', 'array', 'min:1'],
            'lines.*.date' => ['required', 'date'],
            'lines.*.description' => ['nullable', 'string'],
            'lines.*.reference' => ['nullable', 'string', 'max:120'],
            'lines.*.debit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.credit' => ['nullable', 'numeric', 'min:0'],
            'lines.*.balance' => ['nullable', 'numeric'],
            'lines.*.counterparty' => ['nullable', 'string', 'max:150'],
            'lines.*.remarks' => ['nullable', 'string'],
        ]);

        foreach ($validated['lines'] as $index => $line) {
            $debit = (float) ($line['debit'] ?? 0);
            $credit = (float) ($line['credit'] ?? 0);

            if ($debit <= 0 && $credit <= 0) {
                throw ValidationException::withMessages([
                    "lines.$index.debit" => 'Either debit/deposit or credit/withdrawal amount is required.',
                ]);
            }

            if ($debit > 0 && $credit > 0) {
                throw ValidationException::withMessages([
                    "lines.$index.debit" => 'Debit/deposit and credit/withdrawal cannot both have values.',
                ]);
            }
        }

        $created = DB::transaction(function () use ($validated, $bankAccount, $request) {
            return collect($validated['lines'])->map(function (array $line) use ($bankAccount, $request) {
                return BankStatementLine::create([
                    'bank_account_id' => $bankAccount->id,
                    'account_id' => $bankAccount->account_id,
                    'statement_date' => $line['date'],
                    'description' => $line['description'] ?? null,
                    'reference' => $line['reference'] ?? null,
                    'debit' => $line['debit'] ?? 0,
                    'credit' => $line['credit'] ?? 0,
                    'balance' => $line['balance'] ?? null,
                    'counterparty' => $line['counterparty'] ?? null,
                    'remarks' => $line['remarks'] ?? null,
                    'status' => 'imported',
                    'imported_by_id' => $request->user()?->getAuthIdentifier(),
                ]);
            });
        });

        return response()->json([
            'message' => 'Bank statement imported for review.',
            'created' => $created->count(),
        ], 201);
    }

    private function createJournalVoucherFromStatementLine(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
            'offset_account_id' => ['required', 'uuid', 'exists:accounts,id'],
            'reference' => ['nullable', 'string', 'max:120'],
            'narration' => ['nullable', 'string', 'max:500'],
        ]);

        if (! $bankAccount->account_id) {
            throw ValidationException::withMessages([
                'bank_account' => 'This bank account is not linked with an actual account, so a journal voucher cannot be posted.',
            ]);
        }

        if ((string) $bankAccount->account_id === (string) $data['offset_account_id']) {
            throw ValidationException::withMessages([
                'offset_account_id' => 'Counter account cannot be the same as the bank account.',
            ]);
        }

        $posted = DB::transaction(function () use ($data, $bankAccount, $request) {
            /** @var BankStatementLine $statementLine */
            $statementLine = BankStatementLine::query()
                ->lockForUpdate()
                ->where('bank_account_id', $bankAccount->id)
                ->findOrFail($data['statement_line_id']);

            if ($statementLine->posted_journal_voucher_id) {
                throw ValidationException::withMessages([
                    'statement_line_id' => 'This statement line is already matched with a journal voucher.',
                ]);
            }

            if ($statementLine->status === 'ignored') {
                throw ValidationException::withMessages([
                    'statement_line_id' => 'Ignored statement lines cannot be posted. Re-import or restore the line first.',
                ]);
            }

            $debit = (float) ($statementLine->debit ?? 0);
            $credit = (float) ($statementLine->credit ?? 0);
            $amount = round(max($debit, $credit), 2);

            if ($amount <= 0 || ($debit > 0 && $credit > 0)) {
                throw ValidationException::withMessages([
                    'statement_line_id' => 'Statement line must have either one deposit or one withdrawal amount.',
                ]);
            }

            $isDeposit = $debit > 0;
            $description = $statementLine->description ?: 'Bank statement transaction';
            $reference = $data['reference'] ?? $statementLine->reference;
            $narration = $data['narration'] ?? trim("Bank statement posting: {$description}");

            $journalVoucher = JournalVoucher::create([
                'branch_id' => $bankAccount->branch_id,
                'voucher_date' => $statementLine->statement_date,
                'currency_id' => $bankAccount->currency_id,
                'reference' => $reference,
                'narration' => $narration,
                'remarks' => $statementLine->remarks,
                'source_type' => BankStatementLine::class,
                'source_id' => $statementLine->id,
                'source_no' => $statementLine->reference,
                'source_module' => 'bank_statement',
                'is_auto_generated' => true,
                'is_system_generated' => true,
                'status' => 'draft',
                'active' => true,
                'approved' => false,
                'void' => false,
                'exchange_rate' => 1,
                'total' => $amount,
                'user_add_id' => $request->user()?->getAuthIdentifier(),
            ]);

            $bankLine = [
                'journal_voucher_id' => $journalVoucher->id,
                'account_id' => $bankAccount->account_id,
                'description' => $description,
                'debit' => $isDeposit ? $amount : 0,
                'credit' => $isDeposit ? 0 : $amount,
                'currency_id' => $bankAccount->currency_id,
                'exchange_rate' => 1,
            ];

            $offsetLine = [
                'journal_voucher_id' => $journalVoucher->id,
                'account_id' => $data['offset_account_id'],
                'description' => $description,
                'debit' => $isDeposit ? 0 : $amount,
                'credit' => $isDeposit ? $amount : 0,
                'currency_id' => $bankAccount->currency_id,
                'exchange_rate' => 1,
            ];

            JournalVoucherLine::create($bankLine);
            JournalVoucherLine::create($offsetLine);

            $postedVoucher = app(JournalVoucherService::class)->post(
                $journalVoucher,
                $request->user()?->getAuthIdentifier()
            );

            $statementLine->forceFill([
                'status' => 'matched',
                'posted_journal_voucher_id' => $postedVoucher->id,
            ])->save();

            return $postedVoucher->fresh(['journalVoucherLines', 'items']);
        });

        return response()->json([
            'message' => 'Journal voucher created and posted from bank statement line.',
            'journal_voucher' => $posted,
        ], 201);
    }

    private function ignoreStatementLine(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
        ]);

        $statementLine = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->findOrFail($data['statement_line_id']);

        if ($statementLine->posted_journal_voucher_id) {
            throw ValidationException::withMessages([
                'statement_line_id' => 'Matched statement lines cannot be ignored.',
            ]);
        }

        $statementLine->forceFill([
            'status' => 'ignored',
        ])->save();

        return response()->json([
            'message' => 'Bank statement line ignored.',
            'statement_line' => $statementLine->fresh(),
        ]);
    }

    private function formatStatementLines($statementLines, float $openingBalance): array
    {
        $runningBalance = $openingBalance;

        return $statementLines->map(function (BankStatementLine $line) use (&$runningBalance) {
            $debit = (float) ($line->debit ?? 0);
            $credit = (float) ($line->credit ?? 0);
            $runningBalance += $debit - $credit;

            if ($line->balance !== null) {
                $runningBalance = (float) $line->balance;
            }

            $matchingStatus = $line->posted_journal_voucher_id
                ? 'matched'
                : ($line->status === 'ignored' ? 'ignored' : 'unmatched');

            return [
                'id' => $line->id,
                'date' => optional($line->statement_date)->toDateString(),
                'transaction_date' => optional($line->statement_date)->toDateString(),
                'description' => $line->description,
                'reference' => $line->reference,
                'reference_no' => $line->reference,
                'debit' => round($debit, 2),
                'credit' => round($credit, 2),
                'deposit' => round($debit, 2),
                'withdrawal' => round($credit, 2),
                'balance' => round($runningBalance, 2),
                'running_balance' => round($runningBalance, 2),
                'counterparty' => $line->counterparty,
                'remarks' => $line->remarks,
                'status' => $line->status,
                'matching_status' => $matchingStatus,
                'posted_journal_voucher_id' => $line->posted_journal_voucher_id,
                'journal_voucher_id' => $line->posted_journal_voucher_id,
                'matched_transaction' => $line->posted_journal_voucher_id,
                'difference' => 0,
            ];
        })->values()->all();
    }

    private function depositWithdrawalSummary($statementLines): array
    {
        return $statementLines
            ->groupBy(fn (BankStatementLine $line) => optional($line->statement_date)->toDateString())
            ->map(function ($rows, $date) {
                return [
                    'date' => $date,
                    'deposits' => round((float) $rows->sum('debit'), 2),
                    'withdrawals' => round((float) $rows->sum('credit'), 2),
                ];
            })
            ->values()
            ->all();
    }
}
