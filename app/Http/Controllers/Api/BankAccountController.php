<?php

namespace App\Http\Controllers\Api;

use App\Models\BankAccount;
use App\Models\BankStatementLine;
use App\Models\JournalVoucherLine;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

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
        $openingBalance = (float) ($record->opening_balance ?? 0);
        $ledgerBalance = (float) (optional($record->account)->balance ?? 0);
        $statementBalance = $openingBalance;
        $softwareBalance = $openingBalance + $ledgerBalance;
        $difference = round($statementBalance - $softwareBalance, 2);

        $data['statement_balance'] = $statementBalance;
        $data['software_ledger_balance'] = $softwareBalance;
        $data['current_balance'] = $softwareBalance;
        $data['reconciliation_difference'] = abs($difference);
        $data['reconciliation_status'] = abs($difference) < 0.01 ? 'reconciled' : 'needs_review';
        $data['last_statement_date'] = null;
        $data['last_software_transaction_date'] = null;
        $data['balance_history'] = [];
        $data['deposit_withdrawal_summary'] = [];
        $data['bank_transactions'] = [];

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

        $balance = (float) ($bankAccount->opening_balance ?? 0);

        $rows = $query->map(function (JournalVoucherLine $line) use (&$balance) {
            $debit = (float) $line->debit;
            $credit = (float) $line->credit;
            $balance += $debit - $credit;
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
                'balance' => round($balance, 2),
            ];
        })->values();

        $statementBalance = BankStatementLine::query()
            ->where('bank_account_id', $bankAccount->id)
            ->latest('statement_date')
            ->value('balance');

        return response()->json([
            'bank_account' => $bankAccount->load(['branch', 'currency', 'account']),
            'statement_balance' => $statementBalance !== null ? (float) $statementBalance : (float) ($bankAccount->opening_balance ?? 0),
            'software_balance' => round($balance, 2),
            'last_transaction_date' => $rows->last()['date'] ?? null,
            'rows' => $rows,
        ]);
    }

    public function importStatement(Request $request, BankAccount $bankAccount)
    {
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

        $created = collect($validated['lines'])->map(function (array $line) use ($bankAccount) {
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

        return response()->json([
            'message' => 'Bank statement imported for review.',
            'created' => $created->count(),
        ], 201);
    }
}
