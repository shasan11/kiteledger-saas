<?php

declare(strict_types=1);

namespace App\Services\Documents\Review;

use App\Services\Documents\Contracts\FieldValidationState;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use Carbon\Carbon;
use Throwable;

/**
 * Deterministic accounting validation.
 *
 * Every check here is arithmetic or a rule — no model involvement. The AI reads
 * the document; this decides whether what it read is internally consistent and
 * safe to turn into a draft.
 *
 * The governing rule: a value visible on the document is never silently
 * corrected. Where the document and the maths disagree, both are surfaced and
 * the reviewer chooses.
 */
final class DocumentValidationService
{
    /** Currency rounding tolerance. */
    private const TOLERANCE = 0.05;

    public function __construct(
        private readonly DocumentSchemaRegistry $registry,
    ) {}

    /**
     * Re-runs validation over a stored v2 payload.
     *
     * @param array<string, mixed> $structured
     * @return array<string, mixed>
     */
    public function revalidate(array $structured): array
    {
        $fields = $structured['fields'] ?? [];
        $schema = $this->registry->get((string) ($structured['document_type'] ?? 'unknown'));

        $fields = $this->clearDerivedValidationWarnings($fields);
        $fields = $this->validateRequired($fields, $schema);
        $fields = $this->validateDates($fields);
        $fields = $this->validateCurrency($fields);
        $fields = $this->validateTotals($fields, $structured['lines'] ?? []);

        $structured['fields'] = $fields;

        return $structured;
    }

    /**
     * A user correction clears prior computed conflicts on that field, so stale
     * warnings from the original extraction are dropped before re-checking.
     */
    private function clearDerivedValidationWarnings(array $fields): array
    {
        foreach ($fields as $key => $field) {
            if (($field['edited_by_user'] ?? false) && ($field['state'] ?? '') === 'conflict') {
                $fields[$key]['state'] = FieldValidationState::UserConfirmed->value;
                $fields[$key]['needs_review'] = false;
            }
        }

        return $fields;
    }

    private function validateRequired(array $fields, $schema): array
    {
        foreach ($schema->requiredFields as $key) {
            if (! isset($fields[$key])) {
                continue;
            }

            $value = $fields[$key]['value'] ?? null;

            if ($value === null || $value === '') {
                $fields[$key] = $this->mark($fields[$key], FieldValidationState::Missing);
            }
        }

        return $fields;
    }

    private function validateDates(array $fields): array
    {
        $documentDate = $this->parseDate($fields['document_date']['value'] ?? null);
        $dueDate = $this->parseDate($fields['due_date']['value'] ?? null);

        if (isset($fields['document_date']) && ($fields['document_date']['value'] ?? null) !== null && ! $documentDate) {
            $fields['document_date'] = $this->mark(
                $fields['document_date'],
                FieldValidationState::Conflict,
                'This date could not be understood.',
            );
        }

        // A due date before the document date is almost always a misread, so it
        // is flagged rather than accepted.
        if ($documentDate && $dueDate && $dueDate->lt($documentDate)) {
            $fields['due_date'] = $this->mark(
                $fields['due_date'],
                FieldValidationState::Conflict,
                'The due date is earlier than the document date.',
            );
        }

        // A date far in the future usually means a misread year.
        if ($documentDate && $documentDate->gt(Carbon::now()->addYear())) {
            $fields['document_date'] = $this->mark(
                $fields['document_date'],
                FieldValidationState::LowConfidence,
                'This date is more than a year in the future.',
            );
        }

        return $fields;
    }

    private function validateCurrency(array $fields): array
    {
        if (! isset($fields['currency_code'])) {
            return $fields;
        }

        $code = $fields['currency_code']['value'] ?? null;

        if ($code !== null && ! preg_match('/^[A-Z]{3}$/', (string) $code)) {
            $fields['currency_code'] = $this->mark(
                $fields['currency_code'],
                FieldValidationState::Conflict,
                'This does not look like a valid currency code.',
            );
        }

        return $fields;
    }

    /**
     * Totals consistency: subtotal against line items, and grand total against
     * subtotal + tax - discount + shipping.
     */
    private function validateTotals(array $fields, array $lines): array
    {
        $num = static fn (string $key) => is_numeric($fields[$key]['value'] ?? null)
            ? (float) $fields[$key]['value']
            : null;

        $lineSum = round(array_sum(array_map(
            static fn ($l) => is_numeric($l['amount'] ?? null) ? (float) $l['amount'] : 0.0,
            $lines,
        )), 2);

        $subtotal = $num('totals.subtotal');

        if ($subtotal !== null && $lines !== [] && abs($subtotal - $lineSum) > self::TOLERANCE) {
            $fields['totals.subtotal'] = $this->mark(
                $fields['totals.subtotal'],
                FieldValidationState::Conflict,
                'The subtotal does not match the sum of the line items.',
                (string) $lineSum,
            );
        }

        $grand = $num('totals.grand_total');

        if ($grand !== null) {
            $computed = round(
                ($subtotal ?? $lineSum)
                + ($num('totals.tax_total') ?? 0)
                - ($num('totals.discount_total') ?? 0)
                + ($num('totals.shipping') ?? 0),
                2,
            );

            if (abs($grand - $computed) > self::TOLERANCE) {
                $fields['totals.grand_total'] = $this->mark(
                    $fields['totals.grand_total'],
                    FieldValidationState::Conflict,
                    'The total does not match the calculated total.',
                    (string) $computed,
                );
            } else {
                $fields['totals.grand_total'] = $this->clearConflict($fields['totals.grand_total']);
            }
        }

        // Paid more than the total is a red flag worth a human look.
        $paid = $num('totals.paid_amount');

        if ($grand !== null && $paid !== null && $paid - $grand > self::TOLERANCE) {
            $fields['totals.paid_amount'] = $this->mark(
                $fields['totals.paid_amount'],
                FieldValidationState::Conflict,
                'The amount paid is greater than the total.',
            );
        }

        return $fields;
    }

    private function mark(array $field, FieldValidationState $state, ?string $warning = null, ?string $conflictValue = null): array
    {
        $field['state'] = $state->value;
        $field['state_label'] = $state->label();
        $field['tone'] = $state->tone();
        $field['needs_review'] = $state->needsReview();

        if ($warning !== null) {
            $field['warnings'] = array_values(array_unique(array_merge($field['warnings'] ?? [], [$warning])));
        }

        if ($conflictValue !== null) {
            $field['conflict_value'] = $conflictValue;
        }

        return $field;
    }

    private function clearConflict(array $field): array
    {
        if (($field['state'] ?? '') !== 'conflict') {
            return $field;
        }

        $state = ($field['edited_by_user'] ?? false)
            ? FieldValidationState::UserConfirmed
            : FieldValidationState::Ok;

        $field['state'] = $state->value;
        $field['state_label'] = $state->label();
        $field['tone'] = $state->tone();
        $field['needs_review'] = false;
        unset($field['conflict_value']);

        return $field;
    }

    private function parseDate(mixed $value): ?Carbon
    {
        if (! is_string($value) || trim($value) === '') {
            return null;
        }

        try {
            return Carbon::parse($value);
        } catch (Throwable) {
            return null;
        }
    }
}
