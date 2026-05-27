<?php

namespace App\Http\Controllers\Api;

use App\Domain\Accounting\Services\BankReconciliationService;
use App\Domain\Accounting\Services\ForexAdjustmentService;
use App\Http\Controllers\Controller;
use App\Models\BankAccount;
use App\Models\BankReconciliation;
use Illuminate\Http\Request;

class BankReconciliationController extends Controller
{
    public function __construct(
        protected BankReconciliationService $service,
        protected ForexAdjustmentService $forexService
    ) {}

    public function summary(Request $request, BankAccount $bankAccount)
    {
        $data = $this->service->summary(
            $bankAccount,
            $request->query('date_from'),
            $request->query('date_to')
        );

        return response()->json($data);
    }

    public function autoMatch(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'date_tolerance_days' => ['nullable', 'integer', 'min:0', 'max:30'],
        ]);

        $result = $this->service->autoMatch(
            $bankAccount,
            $request->user()?->getAuthIdentifier(),
            (int) ($data['date_tolerance_days'] ?? 5)
        );

        return response()->json($result);
    }

    public function manualMatch(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
            'journal_voucher_line_id' => ['required', 'uuid', 'exists:journal_voucher_lines,id'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $result = $this->service->manualMatch(
            $bankAccount,
            $data['statement_line_id'],
            $data['journal_voucher_line_id'],
            $request->user()?->getAuthIdentifier(),
            $data['remarks'] ?? null
        );

        return response()->json([
            'message' => 'Statement line matched.',
            'data' => $result,
        ]);
    }

    public function unmatch(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
        ]);

        $line = $this->service->unmatch(
            $bankAccount,
            $data['statement_line_id'],
            $request->user()?->getAuthIdentifier()
        );

        return response()->json([
            'message' => 'Statement line unmatched.',
            'statement_line' => $line,
        ]);
    }

    public function markPending(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
            'remarks' => ['nullable', 'string', 'max:500'],
        ]);

        $line = $this->service->markPending(
            $bankAccount,
            $data['statement_line_id'],
            $data['remarks'] ?? null
        );

        return response()->json([
            'message' => 'Statement line marked as pending/uncleared.',
            'statement_line' => $line,
        ]);
    }

    public function restore(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_line_id' => ['required', 'uuid', 'exists:bank_statement_lines,id'],
        ]);

        $line = $this->service->restore($bankAccount, $data['statement_line_id']);

        return response()->json([
            'message' => 'Statement line restored.',
            'statement_line' => $line,
        ]);
    }

    public function finalize(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'statement_date' => ['nullable', 'date'],
            'period_from' => ['nullable', 'date'],
            'period_to' => ['nullable', 'date', 'after_or_equal:period_from'],
            'remarks' => ['nullable', 'string', 'max:1000'],
            'force' => ['nullable', 'boolean'],
        ]);

        $rec = $this->service->finalize(
            $bankAccount,
            $data,
            $request->user()?->getAuthIdentifier()
        );

        return response()->json([
            'message' => 'Reconciliation finalized.',
            'reconciliation' => $rec,
        ], 201);
    }

    public function reopen(Request $request, BankAccount $bankAccount, BankReconciliation $reconciliation)
    {
        abort_unless((string) $reconciliation->bank_account_id === (string) $bankAccount->id, 404);

        $rec = $this->service->reopen($reconciliation);

        return response()->json([
            'message' => 'Reconciliation reopened.',
            'reconciliation' => $rec,
        ]);
    }

    public function history(Request $request, BankAccount $bankAccount)
    {
        $items = BankReconciliation::query()
            ->where('bank_account_id', $bankAccount->id)
            ->orderByDesc('statement_date')
            ->limit(50)
            ->get();

        return response()->json(['data' => $items]);
    }

    public function report(Request $request, BankAccount $bankAccount)
    {
        $data = $this->service->reconciliationReport(
            $bankAccount,
            $request->query('date_from'),
            $request->query('date_to')
        );

        return response()->json($data);
    }

    public function forexPreview(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'foreign_balance' => ['required', 'numeric'],
            'current_base_value' => ['required', 'numeric'],
            'new_rate' => ['required', 'numeric', 'gt:0'],
        ]);

        return response()->json($this->forexService->preview(
            $bankAccount,
            (float) $data['foreign_balance'],
            (float) $data['current_base_value'],
            (float) $data['new_rate']
        ));
    }

    public function forexPost(Request $request, BankAccount $bankAccount)
    {
        $data = $request->validate([
            'adjustment_date' => ['nullable', 'date'],
            'foreign_balance' => ['required', 'numeric'],
            'current_base_value' => ['required', 'numeric'],
            'new_rate' => ['required', 'numeric', 'gt:0'],
            'gain_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'loss_account_id' => ['nullable', 'uuid', 'exists:accounts,id'],
            'reference' => ['nullable', 'string', 'max:120'],
            'narration' => ['nullable', 'string', 'max:500'],
        ]);

        $jv = $this->forexService->post(
            $bankAccount,
            $data,
            $request->user()?->getAuthIdentifier()
        );

        return response()->json([
            'message' => 'Forex adjustment journal voucher posted.',
            'journal_voucher' => $jv,
        ], 201);
    }
}
