<?php

namespace App\Enums\Ai;

enum AiIntentType: string
{
    case GENERAL_QUESTION             = 'GENERAL_QUESTION';
    case CREATE_INVOICE_DRAFT         = 'CREATE_INVOICE_DRAFT';
    case CREATE_QUOTATION_DRAFT       = 'CREATE_QUOTATION_DRAFT';
    case CREATE_PURCHASE_BILL_DRAFT   = 'CREATE_PURCHASE_BILL_DRAFT';
    case CREATE_EXPENSE_DRAFT         = 'CREATE_EXPENSE_DRAFT';
    case CREATE_JOURNAL_VOUCHER_DRAFT = 'CREATE_JOURNAL_VOUCHER_DRAFT';
    case EXPLAIN_ACCOUNTING_IMPACT    = 'EXPLAIN_ACCOUNTING_IMPACT';
    case ASK_REPORT                   = 'ASK_REPORT';
    case RISK_REVIEW                  = 'RISK_REVIEW';
    case RECEIVABLE_COLLECTION        = 'RECEIVABLE_COLLECTION';
    case INVENTORY_ADVISOR            = 'INVENTORY_ADVISOR';
    case CRM_ASSISTANT                = 'CRM_ASSISTANT';
    case TEMPLATE_GENERATION          = 'TEMPLATE_GENERATION';
    case GLOBAL_SEARCH                = 'GLOBAL_SEARCH';
    case UNKNOWN                      = 'UNKNOWN';

    public static function fromString(?string $value): self
    {
        if (!$value) {
            return self::UNKNOWN;
        }
        return self::tryFrom(strtoupper($value)) ?? self::UNKNOWN;
    }

    public function isImplemented(): bool
    {
        return in_array($this, [
            self::GENERAL_QUESTION,
            self::CREATE_INVOICE_DRAFT,
            self::CREATE_JOURNAL_VOUCHER_DRAFT,
            self::EXPLAIN_ACCOUNTING_IMPACT,
            self::ASK_REPORT,
            self::RISK_REVIEW,
            self::UNKNOWN,
        ], true);
    }

    public function requiresApproval(): bool
    {
        return in_array($this, [
            self::CREATE_INVOICE_DRAFT,
            self::CREATE_QUOTATION_DRAFT,
            self::CREATE_PURCHASE_BILL_DRAFT,
            self::CREATE_EXPENSE_DRAFT,
            self::CREATE_JOURNAL_VOUCHER_DRAFT,
        ], true);
    }
}
