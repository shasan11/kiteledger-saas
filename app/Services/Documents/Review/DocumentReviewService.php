<?php

declare(strict_types=1);

namespace App\Services\Documents\Review;

use App\Models\DocumentExtraction;
use App\Models\DocumentUpload;
use App\Services\Documents\Contracts\FieldOrigin;
use App\Services\Documents\Contracts\FieldValidationState;
use Illuminate\Support\Facades\DB;

/**
 * Applies reviewer corrections to an extraction.
 *
 * The original extracted value is always preserved: a correction records what
 * the user decided *and* what the document said, which is what makes the
 * correction visible on screen and usable later for measuring extraction
 * quality. Overwriting would destroy both.
 */
final class DocumentReviewService
{
    /** Fields a reviewer may edit. Anything else is ignored rather than trusted. */
    private const EDITABLE_FIELDS = [
        'document_type',
        'document_number',
        'document_date',
        'due_date',
        'currency_code',
        'party.name',
        'party.tax_number',
        'party.email',
        'party.phone',
        'totals.discount_total',
        'totals.tax_total',
    ];

    public function __construct(
        private readonly DocumentValidationService $validator,
    ) {}

    /**
     * @param  array<string, mixed>  $edits  dotted field key => new value
     * @return array{applied: int, ignored: string[], issue_count: int}
     */
    public function applyCorrections(DocumentUpload $document, array $edits, array $lineEdits = []): array
    {
        $extraction = $document->extraction;

        if (! $extraction instanceof DocumentExtraction || ! is_array($extraction->structured_json)) {
            return ['applied' => 0, 'ignored' => array_keys($edits), 'issue_count' => 0];
        }

        $structured = $extraction->structured_json;
        $fields = $structured['fields'] ?? [];

        $applied = 0;
        $linesApplied = 0;
        $ignored = [];
        $adjustmentsChanged = false;
        $taxTotalChanged = false;

        foreach ($edits as $key => $value) {
            if (! in_array($key, self::EDITABLE_FIELDS, true) || ! isset($fields[$key])) {
                $ignored[] = (string) $key;

                continue;
            }

            $fields[$key] = $this->applyOne($fields[$key], $value);
            $applied++;
            $adjustmentsChanged = $adjustmentsChanged
                || in_array($key, ['totals.discount_total', 'totals.tax_total'], true);
            $taxTotalChanged = $taxTotalChanged || $key === 'totals.tax_total';
        }

        $lineArithmeticChanged = false;
        $lineTaxChanged = false;

        if ($lineEdits !== []) {
            $lines = array_values(is_array($structured['lines'] ?? null) ? $structured['lines'] : []);
            $allowed = ['description', 'product_code', 'product_name', 'quantity', 'unit', 'rate', 'discount', 'tax_rate', 'tax_amount', 'account_id'];
            $arithmetic = ['quantity', 'rate', 'discount', 'tax_amount'];

            foreach ($lineEdits as $index => $changes) {
                if (! isset($lines[$index]) || ! is_array($changes)) {
                    $ignored[] = "lines.{$index}";

                    continue;
                }

                $accepted = array_intersect_key($changes, array_flip($allowed));
                $rejected = array_diff(array_keys($changes), $allowed);

                foreach ($rejected as $key) {
                    $ignored[] = "lines.{$index}.{$key}";
                }

                foreach ($accepted as $key => $value) {
                    if (! isset($lines[$index]['original_values'][$key])) {
                        $lines[$index]['original_values'][$key] = $lines[$index][$key] ?? null;
                    }
                    $lines[$index][$key] = is_string($value) ? trim($value) : $value;
                    $linesApplied++;
                    $lineArithmeticChanged = $lineArithmeticChanged || in_array($key, $arithmetic, true);
                    $lineTaxChanged = $lineTaxChanged || $key === 'tax_amount';
                }

                if ($accepted !== []) {
                    $lines[$index]['edited_by_user'] = true;
                    $lines[$index]['needs_review'] = false;
                }

                if (array_intersect(array_keys($accepted), $arithmetic) !== []) {
                    $this->recalculateLineAmount($lines[$index]);
                }
            }

            $structured['lines'] = $lines;
        }

        $fields = $this->recalculateReadOnlyTotals(
            $fields,
            array_values(is_array($structured['lines'] ?? null) ? $structured['lines'] : []),
            $lineArithmeticChanged,
            $adjustmentsChanged,
            $lineTaxChanged,
            $taxTotalChanged,
        );
        $structured['fields'] = $fields;

        // Corrections can resolve or create problems, so validation re-runs
        // against the corrected values rather than the original extraction.
        $structured = $this->validator->revalidate($structured);
        $structured['review_issue_count'] = $this->countIssues($structured['fields'])
            + count(array_filter($structured['lines'] ?? [], static fn ($line) => (bool) ($line['needs_review'] ?? false)));
        $structured['has_blocking_issues'] = $this->hasBlocking($structured['fields'])
            || (bool) array_filter($structured['lines'] ?? [], static fn ($line) => (bool) ($line['needs_review'] ?? false));

        // Proposal creation consumes normalized_json. Keep it in lockstep with
        // the corrected review payload so a user's saved values are the values
        // used to build the draft.
        $normalized = is_array($extraction->normalized_json) ? $extraction->normalized_json : [];
        foreach ($structured['fields'] as $key => $field) {
            data_set($normalized, $key, $field['value'] ?? null);
        }
        $normalized['lines'] = array_values($structured['lines'] ?? []);

        DB::transaction(function () use ($extraction, $structured, $normalized, $document): void {
            $extraction->update([
                'structured_json' => $structured,
                'normalized_json' => $normalized,
                'review_issue_count' => $structured['review_issue_count'],
            ]);

            // Status follows the corrected state, so a document whose last
            // blocker was just resolved stops asking for review.
            $document->update([
                'status' => $structured['has_blocking_issues'] ? 'needs_review' : 'extracted',
            ]);
        });

        return [
            'applied' => $applied,
            'line_values_applied' => $linesApplied,
            'ignored' => $ignored,
            'issue_count' => $structured['review_issue_count'],
        ];
    }

    /**
     * @param  array<string, mixed>  $field
     * @return array<string, mixed>
     */
    private function applyOne(array $field, mixed $value): array
    {
        $value = is_string($value) ? trim($value) : $value;
        $value = $value === '' ? null : $value;

        // Capture the document's own value the first time it is overwritten.
        if (! ($field['edited_by_user'] ?? false)) {
            $field['original_value'] = $field['value'] ?? null;
        }

        $field['value'] = $value;
        $field['origin'] = FieldOrigin::User->value;
        $field['origin_label'] = FieldOrigin::User->label();
        $field['edited_by_user'] = true;
        $field['warnings'] = [];
        unset($field['conflict_value'], $field['confidence']);

        $state = $value === null
            ? FieldValidationState::Missing
            : FieldValidationState::UserConfirmed;

        $field['state'] = $state->value;
        $field['state_label'] = $state->label();
        $field['tone'] = $state->tone();
        $field['needs_review'] = $state->needsReview();

        return $field;
    }

    /** @param array<string, mixed> $line */
    private function recalculateLineAmount(array &$line): void
    {
        $quantity = $this->numeric($line['quantity'] ?? null);
        $rate = $this->numeric($line['rate'] ?? null);

        if ($quantity === null || $rate === null) {
            return;
        }

        if (! isset($line['original_values']['amount'])) {
            $line['original_values']['amount'] = $line['amount'] ?? null;
        }

        $line['amount'] = round(
            ($quantity * $rate)
            - ($this->numeric($line['discount'] ?? null) ?? 0.0)
            + ($this->numeric($line['tax_amount'] ?? null) ?? 0.0),
            2,
        );
        $line['amount_origin'] = FieldOrigin::Derived->value;
    }

    /**
     * Read-only totals follow the two editable adjustments and line arithmetic.
     * This keeps the stored payload aligned with what the reviewer sees.
     *
     * @param array<string, mixed> $fields
     * @param array<int, array<string, mixed>> $lines
     * @return array<string, mixed>
     */
    private function recalculateReadOnlyTotals(
        array $fields,
        array $lines,
        bool $lineArithmeticChanged,
        bool $adjustmentsChanged,
        bool $lineTaxChanged,
        bool $taxTotalChanged,
    ): array {
        if ($lineArithmeticChanged && isset($fields['totals.subtotal'])) {
            $subtotal = round(array_sum(array_map(
                fn (array $line): float => $this->lineSubtotal($line),
                $lines,
            )), 2);
            $fields['totals.subtotal'] = $this->derivedTotal(
                $fields['totals.subtotal'],
                $subtotal,
                'Calculated by adding the line amounts.',
            );
        }

        if ($lineTaxChanged && ! $taxTotalChanged && isset($fields['totals.tax_total'])) {
            $taxTotal = round(array_sum(array_map(
                fn (array $line): float => $this->numeric($line['tax_amount'] ?? null) ?? 0.0,
                $lines,
            )), 2);
            $fields['totals.tax_total'] = $this->derivedTotal(
                $fields['totals.tax_total'],
                $taxTotal,
                'Calculated by adding the line tax amounts.',
            );
        }

        if (! ($lineArithmeticChanged || $adjustmentsChanged) || ! isset($fields['totals.grand_total'])) {
            return $fields;
        }

        $grandTotal = round(
            ($this->numeric($fields['totals.subtotal']['value'] ?? null) ?? 0.0)
            + ($this->numeric($fields['totals.tax_total']['value'] ?? null) ?? 0.0)
            - ($this->numeric($fields['totals.discount_total']['value'] ?? null) ?? 0.0)
            + ($this->numeric($fields['totals.shipping']['value'] ?? null) ?? 0.0),
            2,
        );
        $fields['totals.grand_total'] = $this->derivedTotal(
            $fields['totals.grand_total'],
            $grandTotal,
            'Calculated from subtotal, tax, discount and shipping.',
        );

        if (isset($fields['totals.balance_due'])) {
            $balance = round(
                $grandTotal - ($this->numeric($fields['totals.paid_amount']['value'] ?? null) ?? 0.0),
                2,
            );
            $fields['totals.balance_due'] = $this->derivedTotal(
                $fields['totals.balance_due'],
                $balance,
                'Calculated as total minus amount paid.',
            );
        }

        return $fields;
    }

    /** @param array<string, mixed> $line */
    private function lineSubtotal(array $line): float
    {
        $quantity = $this->numeric($line['quantity'] ?? null);
        $rate = $this->numeric($line['rate'] ?? null);

        if ($quantity !== null && $rate !== null) {
            return ($quantity * $rate) - ($this->numeric($line['discount'] ?? null) ?? 0.0);
        }

        return ($this->numeric($line['amount'] ?? null) ?? 0.0)
            - ($this->numeric($line['tax_amount'] ?? null) ?? 0.0);
    }

    /** @param array<string, mixed> $field @return array<string, mixed> */
    private function derivedTotal(array $field, float $value, string $explanation): array
    {
        $field['value'] = $value;
        $field['origin'] = FieldOrigin::Derived->value;
        $field['origin_label'] = FieldOrigin::Derived->label();
        $field['state'] = FieldValidationState::Ok->value;
        $field['state_label'] = FieldValidationState::Ok->label();
        $field['tone'] = FieldValidationState::Ok->tone();
        $field['needs_review'] = false;
        $field['edited_by_user'] = false;
        $field['warnings'] = [$explanation];
        unset($field['conflict_value'], $field['confidence']);

        return $field;
    }

    private function numeric(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function countIssues(array $fields): int
    {
        return count(array_filter($fields, static fn ($f) => (bool) ($f['needs_review'] ?? false)));
    }

    private function hasBlocking(array $fields): bool
    {
        foreach ($fields as $field) {
            if (in_array($field['state'] ?? '', ['missing', 'conflict'], true)) {
                return true;
            }
        }

        return false;
    }
}
