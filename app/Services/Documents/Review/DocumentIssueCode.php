<?php

declare(strict_types=1);

namespace App\Services\Documents\Review;

/**
 * Named review issues.
 *
 * Codes rather than free text so the review UI can group, count and filter
 * them, and so a support conversation can name the exact check that fired
 * instead of quoting a sentence that may have been reworded since.
 */
enum DocumentIssueCode: string
{
    case TotalMismatch = 'TOTAL_MISMATCH';
    case TaxMismatch = 'TAX_MISMATCH';
    case LineAmountMismatch = 'LINE_AMOUNT_MISMATCH';
    case BalanceMismatch = 'BALANCE_MISMATCH';
    case JournalUnbalanced = 'JOURNAL_UNBALANCED';
    case DuplicateDocumentNumber = 'DUPLICATE_DOCUMENT_NUMBER';
    case InvalidDate = 'INVALID_DATE';
    case InvalidCurrency = 'INVALID_CURRENCY';
    case EntityNotConfident = 'ENTITY_NOT_CONFIDENT';
    case RequiredFieldMissing = 'REQUIRED_FIELD_MISSING';
    case IncompleteExtraction = 'INCOMPLETE_EXTRACTION';

    /** Plain wording for the reviewer. No codes, no arithmetic jargon. */
    public function message(): string
    {
        return match ($this) {
            self::TotalMismatch => 'The total on the document does not match the calculated total.',
            self::TaxMismatch => 'The tax total does not match the tax on the line items.',
            self::LineAmountMismatch => 'A line amount does not match its quantity, rate and tax.',
            self::BalanceMismatch => 'The amount paid and the balance due do not add up to the total.',
            self::JournalUnbalanced => 'The journal entry debits and credits are not equal.',
            self::DuplicateDocumentNumber => 'A document with this number already exists.',
            self::InvalidDate => 'A date on this document could not be understood.',
            self::InvalidCurrency => 'The currency code on this document is not valid.',
            self::EntityNotConfident => 'The supplier or customer could not be matched with confidence.',
            self::RequiredFieldMissing => 'A field this document type needs is missing.',
            self::IncompleteExtraction => 'Part of this document could not be read.',
        };
    }

    /**
     * Whether the issue must be resolved before a draft can be created.
     *
     * Arithmetic that does not reconcile blocks; a soft signal such as an
     * unmatched party does not, because the reviewer can pick the record.
     */
    public function blocksConversion(): bool
    {
        return match ($this) {
            self::TotalMismatch,
            self::JournalUnbalanced,
            self::DuplicateDocumentNumber,
            self::RequiredFieldMissing => true,
            default => false,
        };
    }

    public function severity(): string
    {
        return $this->blocksConversion() ? 'error' : 'warning';
    }
}
