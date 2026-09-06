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
        $structured['issues'] = $this->issues($fields, $structured);

        return $structured;
    }

    /**
     * Coded issues for the review screen, computed from the validated fields
     * plus the checks that are about the document as a whole rather than any
     * single field.
     *
     * @param  array<string, mixed>  $fields
     * @param  array<string, mixed>  $structured
     * @return array<int, array<string, mixed>>
     */
    private function issues(array $fields, array $structured): array
    {
        $issues = [];

        $add = static function (DocumentIssueCode $code, ?string $field = null, ?string $detail = null) use (&$issues): void {
            $issues[] = array_filter([
                'code' => $code->value,
                'message' => $detail ?? $code->message(),
                'severity' => $code->severity(),
                'blocks_conversion' => $code->blocksConversion(),
                'field' => $field,
            ], static fn ($value) => $value !== null);
        };

        foreach ($fields as $key => $field) {
            $state = $field['state'] ?? '';

            if ($state === FieldValidationState::Missing->value) {
                $add(DocumentIssueCode::RequiredFieldMissing, $key);
            }
        }

        if (($fields['document_date']['state'] ?? '') === 'conflict'
            || ($fields['due_date']['state'] ?? '') === 'conflict') {
            $add(DocumentIssueCode::InvalidDate);
        }

        if (($fields['currency_code']['state'] ?? '') === 'conflict') {
            $add(DocumentIssueCode::InvalidCurrency, 'currency_code');
        }

        if (($fields['totals.grand_total']['state'] ?? '') === 'conflict') {
            $add(DocumentIssueCode::TotalMismatch, 'totals.grand_total');
        }

        foreach ($this->lineIssues($structured['lines'] ?? []) as $issue) {
            $add(DocumentIssueCode::LineAmountMismatch, null, $issue);
        }

        if ($this->taxMismatch($fields, $structured['lines'] ?? [])) {
            $add(DocumentIssueCode::TaxMismatch, 'totals.tax_total');
        }

        if ($this->balanceMismatch($fields)) {
            $add(DocumentIssueCode::BalanceMismatch, 'totals.balance_due');
        }

        if ($this->journalUnbalanced($structured['journal_entry']['lines'] ?? [])) {
            $add(DocumentIssueCode::JournalUnbalanced);
        }

        if (($structured['coverage']['complete'] ?? true) === false) {
            $add(DocumentIssueCode::IncompleteExtraction);
        }

        return $issues;
    }

    /**
     * Per-line arithmetic: amount should equal quantity x rate, less discount,
     * plus any tax charged on the line.
     *
     * Checked only when the line actually carries the inputs — a line with no
     * rate is a description row, not a broken calculation.
     *
     * @param  array<int, array<string, mixed>>  $lines
     * @return string[]
     */
    private function lineIssues(array $lines): array
    {
        $issues = [];

        foreach ($lines as $index => $line) {
            if (! is_array($line)) {
                continue;
            }

            $quantity = $this->numeric($line['quantity'] ?? null);
            $rate = $this->numeric($line['rate'] ?? null);
            $amount = $this->numeric($line['amount'] ?? null);

            // A derived amount was computed from these very inputs, so checking
            // it against them proves nothing.
            if (($line['amount_origin'] ?? '') === 'derived') {
                continue;
            }

            if ($quantity === null || $rate === null || $amount === null) {
                continue;
            }

            $expected = round(
                ($quantity * $rate)
                - ($this->numeric($line['discount'] ?? null) ?? 0.0)
                + ($this->numeric($line['tax_amount'] ?? null) ?? 0.0),
                2,
            );

            // Tolerance scales with the line: a 0.05 absolute allowance is too
            // tight for a six-figure line where per-unit rounding accumulates.
            $tolerance = max(self::TOLERANCE, abs($expected) * 0.005);

            if (abs($amount - $expected) > $tolerance) {
                $label = $line['description'] ?? $line['product_name'] ?? ('line '.($index + 1));
                $issues[] = sprintf(
                    '"%s" shows %s but its quantity, rate and tax give %s.',
                    mb_substr((string) $label, 0, 60),
                    number_format($amount, 2),
                    number_format($expected, 2),
                );
            }
        }

        return array_slice($issues, 0, 5);
    }

    /**
     * @param  array<string, mixed>  $fields
     * @param  array<int, array<string, mixed>>  $lines
     */
    private function taxMismatch(array $fields, array $lines): bool
    {
        // Only meaningful when the document stated a tax total of its own; a
        // derived one was summed from these lines by definition.
        if (($fields['totals.tax_total']['origin'] ?? '') !== 'extracted') {
            return false;
        }

        $stated = $this->numeric($fields['totals.tax_total']['value'] ?? null);

        if ($stated === null || $lines === []) {
            return false;
        }

        $lineTax = 0.0;
        $anyStated = false;

        foreach ($lines as $line) {
            $tax = $this->numeric($line['tax_amount'] ?? null);

            if ($tax !== null) {
                $anyStated = true;
                $lineTax += $tax;
            }
        }

        if (! $anyStated) {
            return false;
        }

        return abs($stated - round($lineTax, 2)) > max(self::TOLERANCE, abs($stated) * 0.01);
    }

    /** @param array<string, mixed> $fields */
    private function balanceMismatch(array $fields): bool
    {
        // Both figures must come from the document; comparing a derived balance
        // against the total it was derived from can never disagree.
        foreach (['totals.balance_due', 'totals.paid_amount'] as $key) {
            if (($fields[$key]['origin'] ?? '') !== 'extracted') {
                return false;
            }
        }

        $grand = $this->numeric($fields['totals.grand_total']['value'] ?? null);
        $paid = $this->numeric($fields['totals.paid_amount']['value'] ?? null);
        $balance = $this->numeric($fields['totals.balance_due']['value'] ?? null);

        if ($grand === null || $paid === null || $balance === null) {
            return false;
        }

        return abs(($paid + $balance) - $grand) > self::TOLERANCE;
    }

    /** @param array<int, array<string, mixed>> $lines */
    private function journalUnbalanced(array $lines): bool
    {
        if ($lines === []) {
            return false;
        }

        $debit = 0.0;
        $credit = 0.0;

        foreach ($lines as $line) {
            if (! is_array($line)) {
                continue;
            }

            $debit += $this->numeric($line['debit'] ?? null) ?? 0.0;
            $credit += $this->numeric($line['credit'] ?? null) ?? 0.0;
        }

        // An entry with nothing on either side is empty, not unbalanced.
        if ($debit === 0.0 && $credit === 0.0) {
            return false;
        }

        return abs(round($debit - $credit, 2)) > self::TOLERANCE;
    }

    private function numeric(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
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
            static fn ($l) => (is_numeric($l['amount'] ?? null) ? (float) $l['amount'] : 0.0)
                - (is_numeric($l['tax_amount'] ?? null) ? (float) $l['tax_amount'] : 0.0),
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
