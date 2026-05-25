<?php

namespace App\Services\AI;

use App\Enums\Ai\AiIntentType;
use Illuminate\Support\Facades\Auth;

/**
 * Maps Kite AI intents/action types to Spatie permission strings and enforces them.
 * Wraps the lower-level AiActionGuard with policy specific to the Command Center.
 */
class AiPermissionGuard
{
    /** Action-type => required permission. Unmatched action types fail closed. */
    protected array $actionPermissionMap = [
        'create_invoice_draft'         => 'invoices.create',
        'create_quotation_draft'       => 'quotations.create',
        'create_purchase_bill_draft'   => 'purchase-bills.create',
        'create_expense_draft'         => 'expenses.create',
        'create_journal_voucher_draft' => 'journal-vouchers.create',
        'explain_accounting_impact'    => 'invoices.view',
        'ask_report'                   => 'reports.view',
        'risk_review'                  => 'invoices.view',
        'general_question'             => null, // no permission required
    ];

    /** Intent => action_type fallback. */
    protected array $intentActionMap = [
        AiIntentType::CREATE_INVOICE_DRAFT->value         => 'create_invoice_draft',
        AiIntentType::CREATE_QUOTATION_DRAFT->value       => 'create_quotation_draft',
        AiIntentType::CREATE_PURCHASE_BILL_DRAFT->value   => 'create_purchase_bill_draft',
        AiIntentType::CREATE_EXPENSE_DRAFT->value         => 'create_expense_draft',
        AiIntentType::CREATE_JOURNAL_VOUCHER_DRAFT->value => 'create_journal_voucher_draft',
        AiIntentType::EXPLAIN_ACCOUNTING_IMPACT->value    => 'explain_accounting_impact',
        AiIntentType::ASK_REPORT->value                   => 'ask_report',
        AiIntentType::RISK_REVIEW->value                  => 'risk_review',
        AiIntentType::GENERAL_QUESTION->value             => 'general_question',
    ];

    public function userCanProposeIntent(AiIntentType $intent): bool
    {
        $actionType = $this->intentActionMap[$intent->value] ?? null;

        if ($actionType === null) {
            return true; // unknown intent: planning is allowed; execution is blocked elsewhere
        }

        return $this->userCanPerform($actionType);
    }

    public function userCanPerform(string $actionType): bool
    {
        if (!array_key_exists($actionType, $this->actionPermissionMap)) {
            return false; // fail-closed for unknown actions
        }

        $permission = $this->actionPermissionMap[$actionType];

        if ($permission === null) {
            return Auth::check();
        }

        $user = Auth::user();
        if (!$user) {
            return false;
        }

        try {
            return $user->hasPermissionTo($permission);
        } catch (\Throwable) {
            return false;
        }
    }

    public function assertCanPerform(string $actionType): void
    {
        if (!$this->userCanPerform($actionType)) {
            abort(403, 'You do not have permission to perform this AI action.');
        }
    }

    public function denialMessage(): string
    {
        return 'You do not have permission to perform this AI action.';
    }
}
