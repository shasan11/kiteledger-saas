<?php

namespace App\Services\AI;

use App\Models\AiPendingAction;
use App\Models\Invoice;
use App\Models\InvoiceLine;
use App\Models\JournalVoucher;
use App\Models\JournalVoucherLine;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Executes an approved AiPendingAction. Only invoked AFTER human approval AND
 * AiPermissionGuard re-check. Creates records in *draft* state — never approves,
 * posts, or marks paid.
 */
class AiActionExecutor
{
    public function __construct(
        protected AiPermissionGuard $guard,
        protected AiAuditLogger     $audit,
    ) {}

    public function execute(AiPendingAction $action): array
    {
        // Re-assert permission at execution time
        $this->guard->assertCanPerform($action->action_type);

        return match ($action->action_type) {
            'create_invoice_draft'         => $this->executeInvoice($action),
            'create_journal_voucher_draft' => $this->executeJournalVoucher($action),
            default                        => throw ValidationException::withMessages([
                'action' => 'Unsupported AI action type: ' . $action->action_type,
            ]),
        };
    }

    private function executeInvoice(AiPendingAction $action): array
    {
        $p = $action->payload;
        $this->require($p, ['contact_id', 'lines']);

        return DB::transaction(function () use ($action, $p) {
            $invoice = Invoice::create([
                'branch_id'    => $action->branch_id,
                'contact_id'   => $p['contact_id'],
                'invoice_date' => $p['invoice_date'] ?? now()->toDateString(),
                'due_date'     => $p['due_date']     ?? null,
                'reference'    => 'AI-' . substr($action->id, 0, 8),
                'notes'        => 'Drafted by Kite AI. Awaiting review.',
                'status'       => 'draft',
                'active'       => true,
                'approved'     => false,
                'total'        => (float) ($p['total'] ?? 0),
                'paid_total'   => 0,
                'balance_due'  => (float) ($p['total'] ?? 0),
                'user_add_id'  => Auth::id(),
            ]);

            foreach ($p['lines'] as $line) {
                if (empty($line['product_id'])) {
                    continue; // skip unresolved products — user will edit
                }
                InvoiceLine::create([
                    'invoice_id' => $invoice->id,
                    'product_id' => $line['product_id'],
                    'quantity'   => $line['quantity'] ?? 1,
                    'rate'       => $line['rate']     ?? 0,
                    'amount'     => $line['amount']   ?? 0,
                ]);
            }

            return [
                'id'          => $invoice->id,
                'invoice_no'  => $invoice->invoice_no,
                'total'       => $invoice->total,
                'status'      => $invoice->status,
                'open_url'    => '/invoices/' . $invoice->id,
            ];
        });
    }

    private function executeJournalVoucher(AiPendingAction $action): array
    {
        $p = $action->payload;
        $this->require($p, ['debits', 'credits']);

        if (empty($p['balanced'])) {
            throw ValidationException::withMessages(['payload' => 'Journal voucher is not balanced.']);
        }

        return DB::transaction(function () use ($action, $p) {
            $jv = JournalVoucher::create([
                'branch_id'    => $action->branch_id,
                'voucher_date' => $p['voucher_date'] ?? now()->toDateString(),
                'narration'    => $p['narration']    ?? '',
                'reference'    => 'AI-' . substr($action->id, 0, 8),
                'status'       => 'draft',
                'active'       => true,
                'approved'     => false,
                'total'        => (float) ($p['total_debit'] ?? 0),
                'source_module' => 'kite_ai',
                'is_auto_generated' => false,
                'user_add_id'  => Auth::id(),
            ]);

            foreach ($p['debits'] as $d) {
                if (empty($d['account_id'])) continue;
                JournalVoucherLine::create([
                    'journal_voucher_id' => $jv->id,
                    'chart_of_account_id'=> $d['account_id'],
                    'debit'              => (float) $d['amount'],
                    'credit'             => 0,
                ]);
            }
            foreach ($p['credits'] as $c) {
                if (empty($c['account_id'])) continue;
                JournalVoucherLine::create([
                    'journal_voucher_id' => $jv->id,
                    'chart_of_account_id'=> $c['account_id'],
                    'debit'              => 0,
                    'credit'             => (float) $c['amount'],
                ]);
            }

            return [
                'id'           => $jv->id,
                'voucher_no'   => $jv->voucher_no,
                'total'        => $jv->total,
                'status'       => $jv->status,
                'open_url'     => '/journal-vouchers/' . $jv->id,
            ];
        });
    }

    private function require(array $payload, array $keys): void
    {
        foreach ($keys as $k) {
            if (!array_key_exists($k, $payload) || $payload[$k] === null || $payload[$k] === '') {
                throw ValidationException::withMessages([
                    'payload' => "Missing required field for AI action: {$k}",
                ]);
            }
        }
    }
}
