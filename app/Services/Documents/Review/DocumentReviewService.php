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
        'totals.subtotal',
        'totals.discount_total',
        'totals.tax_total',
        'totals.shipping',
        'totals.grand_total',
        'totals.paid_amount',
        'totals.balance_due',
    ];

    public function __construct(
        private readonly DocumentValidationService $validator,
    ) {}

    /**
     * @param array<string, mixed> $edits dotted field key => new value
     * @return array{applied: int, ignored: string[], issue_count: int}
     */
    public function applyCorrections(DocumentUpload $document, array $edits): array
    {
        $extraction = $document->extraction;

        if (! $extraction instanceof DocumentExtraction || ! is_array($extraction->structured_json)) {
            return ['applied' => 0, 'ignored' => array_keys($edits), 'issue_count' => 0];
        }

        $structured = $extraction->structured_json;
        $fields = $structured['fields'] ?? [];

        $applied = 0;
        $ignored = [];

        foreach ($edits as $key => $value) {
            if (! in_array($key, self::EDITABLE_FIELDS, true) || ! isset($fields[$key])) {
                $ignored[] = (string) $key;
                continue;
            }

            $fields[$key] = $this->applyOne($fields[$key], $value);
            $applied++;
        }

        $structured['fields'] = $fields;

        // Corrections can resolve or create problems, so validation re-runs
        // against the corrected values rather than the original extraction.
        $structured = $this->validator->revalidate($structured);
        $structured['review_issue_count'] = $this->countIssues($structured['fields']);
        $structured['has_blocking_issues'] = $this->hasBlocking($structured['fields']);

        DB::transaction(function () use ($extraction, $structured, $document): void {
            $extraction->update([
                'structured_json' => $structured,
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
            'ignored' => $ignored,
            'issue_count' => $structured['review_issue_count'],
        ];
    }

    /**
     * @param array<string, mixed> $field
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
