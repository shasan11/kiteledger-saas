<?php

declare(strict_types=1);

namespace App\Services\Documents;

use App\Services\Documents\Contracts\DocumentExtractionResult;
use App\Services\Documents\Contracts\ExtractedField;
use App\Services\Documents\Contracts\FieldEvidence;
use App\Services\Documents\Contracts\FieldValidationState;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use Carbon\Carbon;
use Throwable;

/**
 * Builds the v2 field-level result from raw model output.
 *
 * The important behavioural change from v1: a value KiteLedger calculates is
 * recorded as origin=derived and kept separate from the document's own figure.
 * v1 wrote `grand_total => $extracted ?? computed`, so a review screen could not
 * tell the user which they were approving.
 *
 * Runs alongside the v1 normalizer rather than replacing it, so existing
 * extraction records and the current review UI keep working.
 */
final class DocumentExtractionNormalizerV2
{
    /** Below this, a field is flagged for review rather than accepted quietly. */
    private const LOW_CONFIDENCE_THRESHOLD = 0.70;

    /** Currency rounding tolerance for total comparisons. */
    private const TOTAL_TOLERANCE = 0.05;

    public function __construct(
        private readonly DocumentSchemaRegistry $registry,
    ) {}

    public function normalize(array $extracted): DocumentExtractionResult
    {
        $type = $this->documentType($extracted);
        $schema = $this->registry->get($type);

        $fields = [];

        $fields['document_type'] = ExtractedField::extracted(
            'document_type',
            $type,
            $this->confidenceOf($extracted, 'document_type'),
        );

        foreach (['document_number', 'party.name', 'party.tax_number', 'party.email', 'party.phone'] as $key) {
            $fields[$key] = $this->stringField($extracted, $key);
        }

        $fields['document_date'] = $this->dateField($extracted, 'document_date');
        $fields['due_date'] = $this->dateField($extracted, 'due_date');
        $fields['currency_code'] = $this->currencyField($extracted);

        $lines = $this->lines($extracted);
        $fields = array_merge($fields, $this->totals($extracted, $lines));

        $fields = $this->applyRequiredRules($fields, $schema);
        $fields = $this->applyConfidenceRules($fields);

        return new DocumentExtractionResult(
            documentType: $type,
            schema: $schema,
            fields: $fields,
            lines: $lines,
            warnings: $this->warnings($extracted, $schema, $lines),
            overallConfidence: $this->floatOrNull($extracted['confidence'] ?? null),
        );
    }

    /**
     * Totals. Each figure is either read from the document or explicitly derived
     * — never silently substituted. Where both exist and disagree beyond
     * rounding tolerance, the field is marked as a conflict for the user to
     * resolve; KiteLedger does not overwrite what the document says.
     *
     * @param array<int, array<string, mixed>> $lines
     * @return array<string, ExtractedField>
     */
    private function totals(array $extracted, array $lines): array
    {
        $totals = is_array($extracted['totals'] ?? null) ? $extracted['totals'] : [];

        $lineSum = round(array_sum(array_column($lines, 'amount')), 2);
        $taxSum = round(array_sum(array_column($lines, 'tax_amount')), 2);

        $fields = [];

        // Subtotal
        $subtotal = $this->amount($totals['subtotal'] ?? null);

        if ($subtotal === null) {
            $fields['totals.subtotal'] = $lines === []
                ? ExtractedField::missing('totals.subtotal')
                : ExtractedField::derived('totals.subtotal', $lineSum, 'Calculated by adding the line amounts.');
        } else {
            $field = ExtractedField::extracted('totals.subtotal', $subtotal, $this->confidenceOf($extracted, 'totals.subtotal'));

            if ($lines !== [] && abs($subtotal - $lineSum) > self::TOTAL_TOLERANCE) {
                $field = $field->withConflict(
                    (string) $lineSum,
                    'The subtotal on the document differs from the sum of the line items.',
                );
            }

            $fields['totals.subtotal'] = $field;
        }

        // Tax
        $tax = $this->amount($totals['tax_total'] ?? null);
        $fields['totals.tax_total'] = $tax === null
            ? ExtractedField::derived('totals.tax_total', $taxSum, 'Calculated by adding the line tax amounts.')
            : ExtractedField::extracted('totals.tax_total', $tax, $this->confidenceOf($extracted, 'totals.tax_total'));

        $discount = $this->amount($totals['discount_total'] ?? null);
        $fields['totals.discount_total'] = $discount === null
            ? ExtractedField::derived('totals.discount_total', 0.0, 'No discount shown on the document.')
            : ExtractedField::extracted('totals.discount_total', $discount);

        $shipping = $this->amount($totals['shipping'] ?? null);
        $fields['totals.shipping'] = $shipping === null
            ? ExtractedField::derived('totals.shipping', 0.0, 'No shipping shown on the document.')
            : ExtractedField::extracted('totals.shipping', $shipping);

        // Grand total — the figure most worth protecting from silent derivation.
        $grand = $this->amount($totals['grand_total'] ?? null);

        $computedGrand = round(
            (float) ($fields['totals.subtotal']->value ?? 0)
            + (float) ($fields['totals.tax_total']->value ?? 0)
            - (float) ($fields['totals.discount_total']->value ?? 0)
            + (float) ($fields['totals.shipping']->value ?? 0),
            2,
        );

        if ($grand === null) {
            $fields['totals.grand_total'] = $lines === [] && $subtotal === null
                ? ExtractedField::missing('totals.grand_total')
                : ExtractedField::derived(
                    'totals.grand_total',
                    $computedGrand,
                    'Calculated from the subtotal, tax, discount and shipping.',
                );
        } else {
            $field = ExtractedField::extracted('totals.grand_total', $grand, $this->confidenceOf($extracted, 'totals.grand_total'));

            // Only cross-check when there is something to check against. A
            // receipt or payment slip often shows a total and nothing else;
            // comparing it to a subtotal of zero would flag every such
            // document as a mismatch.
            $hasBasis = $lines !== [] || $subtotal !== null;

            if ($hasBasis && abs($grand - $computedGrand) > self::TOTAL_TOLERANCE) {
                $field = $field->withConflict(
                    (string) $computedGrand,
                    'The total on the document does not match the calculated total.',
                );
            }

            $fields['totals.grand_total'] = $field;
        }

        $paid = $this->amount($totals['paid_amount'] ?? null);
        $fields['totals.paid_amount'] = $paid === null
            ? ExtractedField::derived('totals.paid_amount', 0.0, 'No payment shown on the document.')
            : ExtractedField::extracted('totals.paid_amount', $paid);

        $balance = $this->amount($totals['balance_due'] ?? null);
        $fields['totals.balance_due'] = $balance === null
            ? ExtractedField::derived(
                'totals.balance_due',
                round((float) ($fields['totals.grand_total']->value ?? 0) - (float) $fields['totals.paid_amount']->value, 2),
                'Calculated as total minus amount paid.',
            )
            : ExtractedField::extracted('totals.balance_due', $balance);

        return $fields;
    }

    /** @return array<int, array<string, mixed>> */
    private function lines(array $extracted): array
    {
        $lines = [];

        foreach (($extracted['lines'] ?? []) as $index => $line) {
            if (! is_array($line)) {
                continue;
            }

            $qty = $this->amount($line['quantity'] ?? null);
            $rate = $this->amount($line['rate'] ?? null);
            $amount = $this->amount($line['amount'] ?? null);

            // A line amount we compute is flagged, not disguised.
            $amountOrigin = 'extracted';

            if ($amount === null) {
                $amount = round(($qty ?? 1) * ($rate ?? 0), 2);
                $amountOrigin = 'derived';
            }

            $lines[] = [
                'index' => $index,
                'description' => $this->trimOrNull($line['description'] ?? null),
                'product_code' => $this->trimOrNull($line['product_code'] ?? null),
                'product_name' => $this->trimOrNull($line['product_name'] ?? $line['description'] ?? null),
                'quantity' => $qty ?? 1,
                'quantity_origin' => $qty === null ? 'defaulted' : 'extracted',
                'unit' => $this->trimOrNull($line['unit'] ?? null),
                'rate' => $rate ?? 0,
                'rate_origin' => $rate === null ? 'defaulted' : 'extracted',
                'discount' => $this->amount($line['discount'] ?? null) ?? 0,
                'tax_rate' => $this->amount($line['tax_rate'] ?? null) ?? 0,
                'tax_amount' => $this->amount($line['tax_amount'] ?? null) ?? 0,
                'amount' => $amount,
                'amount_origin' => $amountOrigin,
                'account_hint' => $this->trimOrNull($line['account_hint'] ?? null),
                'needs_review' => $qty === null || $rate === null,
            ];
        }

        return $lines;
    }

    /**
     * Applies required/optional rules for the detected document type.
     *
     * An absent *optional* field is not a review issue — flagging every blank
     * field is what turns the review screen into noise and hides the two or
     * three things that genuinely need a human.
     */
    private function applyRequiredRules(array $fields, $schema): array
    {
        foreach ($schema->requiredFields as $key) {
            if (! isset($fields[$key])) {
                $fields[$key] = ExtractedField::missing($key);
                continue;
            }

            // A conflict is more specific than "missing" — an unreadable date
            // carries the raw text the user needs to see, so it must not be
            // downgraded here.
            if (! $fields[$key]->isPresent()
                && $fields[$key]->validationState !== FieldValidationState::Conflict) {
                $fields[$key] = $fields[$key]->withValidationState(FieldValidationState::Missing);
            }
        }

        foreach ($fields as $key => $field) {
            if ($field->validationState === FieldValidationState::Missing && ! $schema->requires($key)) {
                $fields[$key] = $field->withValidationState(FieldValidationState::Ok);
            }
        }

        return $fields;
    }

    /** Flags weakly-read values so the user checks them rather than trusting them. */
    private function applyConfidenceRules(array $fields): array
    {
        foreach ($fields as $key => $field) {
            if ($field->validationState !== FieldValidationState::Ok) {
                continue;
            }

            if ($field->confidence !== null && $field->confidence < self::LOW_CONFIDENCE_THRESHOLD) {
                $fields[$key] = $field->withValidationState(FieldValidationState::LowConfidence);
            }
        }

        return $fields;
    }

    /** @return string[] */
    private function warnings(array $extracted, $schema, array $lines): array
    {
        $warnings = array_values(array_filter(
            (array) ($extracted['warnings'] ?? []),
            'is_string',
        ));

        if ($schema->needsLines && $lines === []) {
            $warnings[] = 'No line items were detected on this document.';
        }

        return array_values(array_unique($warnings));
    }

    private function stringField(array $extracted, string $key): ExtractedField
    {
        return ExtractedField::extracted(
            $key,
            $this->trimOrNull($this->dotGet($extracted, $key)),
            $this->confidenceOf($extracted, $key),
            $this->evidenceFor($extracted, $key),
        );
    }

    private function dateField(array $extracted, string $key): ExtractedField
    {
        $raw = $this->dotGet($extracted, $key);
        $normalized = $this->normalizeDate(is_string($raw) ? $raw : null);

        $field = ExtractedField::extracted(
            $key,
            $normalized,
            $this->confidenceOf($extracted, $key),
            $this->evidenceFor($extracted, $key),
        );

        // An unparseable date is a review issue, not a silent null.
        if ($raw !== null && $raw !== '' && $normalized === null) {
            return $field->withConflict((string) $raw, 'The date on the document could not be understood.');
        }

        return $field;
    }

    private function currencyField(array $extracted): ExtractedField
    {
        $raw = $this->dotGet($extracted, 'currency_code');
        $code = is_string($raw) ? strtoupper(trim($raw)) : null;
        $valid = $code !== null && preg_match('/^[A-Z]{3}$/', $code) === 1;

        return ExtractedField::extracted(
            'currency_code',
            $valid ? $code : null,
            $this->confidenceOf($extracted, 'currency_code'),
        );
    }

    private function documentType(array $extracted): string
    {
        $type = strtolower(trim((string) ($extracted['document_type'] ?? '')));
        $type = str_replace([' ', '-'], '_', $type);

        return $this->registry->has($type) ? $type : 'unknown';
    }

    /**
     * Reads per-field confidence when the model supplied it, falling back to
     * null rather than to the document-level score — reusing the overall score
     * for every field would make calibration meaningless.
     */
    private function confidenceOf(array $extracted, string $key): ?float
    {
        $confidences = $extracted['field_confidence'] ?? null;

        if (is_array($confidences) && isset($confidences[$key]) && is_numeric($confidences[$key])) {
            return max(0.0, min(1.0, (float) $confidences[$key]));
        }

        return null;
    }

    /** @return FieldEvidence[] */
    private function evidenceFor(array $extracted, string $key): array
    {
        $all = $extracted['evidence'] ?? null;

        if (! is_array($all) || ! isset($all[$key]) || ! is_array($all[$key])) {
            return [];
        }

        $items = array_is_list($all[$key]) ? $all[$key] : [$all[$key]];

        return array_values(array_filter(array_map(
            static fn ($item) => FieldEvidence::fromArray($item),
            $items,
        )));
    }

    private function dotGet(array $data, string $key): mixed
    {
        foreach (explode('.', $key) as $segment) {
            if (! is_array($data) || ! array_key_exists($segment, $data)) {
                return null;
            }

            $data = $data[$segment];
        }

        return $data;
    }

    private function normalizeDate(?string $value): ?string
    {
        if (! $value) {
            return null;
        }

        try {
            return Carbon::parse($value)->format('Y-m-d');
        } catch (Throwable) {
            return null;
        }
    }

    private function amount(mixed $value): ?float
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_numeric($value)) {
            return (float) $value;
        }

        $clean = preg_replace('/[^0-9.\-]/', '', (string) $value);

        return is_numeric($clean) ? (float) $clean : null;
    }

    private function floatOrNull(mixed $value): ?float
    {
        return is_numeric($value) ? (float) $value : null;
    }

    private function trimOrNull(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }
}
