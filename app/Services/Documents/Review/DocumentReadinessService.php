<?php

declare(strict_types=1);

namespace App\Services\Documents\Review;

use App\Models\DocumentUpload;
use App\Models\User;
use App\Services\Documents\DocumentDuplicateChecker;
use App\Services\Documents\Schema\DocumentSchemaRegistry;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Decides whether a document may become a draft, and explains why not.
 *
 * A greyed-out button with no reason is the failure mode this exists to
 * prevent: every blocker is returned as a sentence the reviewer can act on.
 */
final class DocumentReadinessService
{
    public function __construct(
        private readonly DocumentSchemaRegistry $registry,
        private readonly DocumentDuplicateChecker $duplicates,
    ) {}

    /**
     * @return array{
     *   ready: bool,
     *   blockers: string[],
     *   checks: array<int, array{label: string, passed: bool}>,
     *   conversion_target: ?string
     * }
     */
    public function evaluate(DocumentUpload $document, ?User $user = null): array
    {
        $extraction = $document->extraction;
        $structured = is_array($extraction?->structured_json) ? $extraction->structured_json : null;

        if ($structured === null) {
            return $this->result(false, ['This document has not been scanned yet.'], [], null);
        }

        $schema = $this->registry->get((string) ($structured['document_type'] ?? 'unknown'));
        $fields = $structured['fields'] ?? [];

        $blockers = [];
        $checks = [];

        // 1. The document type must map to something KiteLedger can create.
        if (! $schema->isConvertible()) {
            $blockers[] = sprintf(
                'KiteLedger does not create a transaction from %s documents.',
                strtolower($schema->label),
            );
        }

        $checks[] = ['label' => 'Document type is supported', 'passed' => $schema->isConvertible()];

        // 2. Required fields must be present.
        $missing = [];

        foreach ($schema->requiredFields as $key) {
            $value = $fields[$key]['value'] ?? null;

            if ($value === null || $value === '') {
                $missing[] = $this->humanKey($key);
            }
        }

        foreach ($missing as $label) {
            $blockers[] = "Add the {$label}.";
        }

        $checks[] = [
            'label' => $missing === [] ? 'All required details present' : 'Required details missing',
            'passed' => $missing === [],
        ];

        // 3. No unresolved conflicts.
        $conflicts = array_filter($fields, static fn ($f) => ($f['state'] ?? '') === 'conflict');

        foreach ($conflicts as $key => $field) {
            $blockers[] = 'Resolve the '.strtolower($this->humanKey((string) $key)).' mismatch.';
        }

        $checks[] = ['label' => 'Totals and dates are consistent', 'passed' => $conflicts === []];

        // 4. Line items where the type expects them.
        $lines = $structured['lines'] ?? [];

        if ($schema->needsLines && $lines === []) {
            $blockers[] = 'Add at least one line item.';
        }

        if ($schema->needsLines) {
            $checks[] = [
                'label' => $lines === []
                    ? 'No line items found'
                    : count($lines).' line '.(count($lines) === 1 ? 'item' : 'items').' found',
                'passed' => $lines !== [],
            ];
        }

        // 5. Not already converted — conversion is single-use.
        $alreadyConverted = $document->status === 'converted'
            || $document->proposals()->where('status', 'converted')->exists();

        if ($alreadyConverted) {
            $blockers[] = 'A draft has already been created from this document.';
        }

        // 6. Permission. Checked here so the UI can explain rather than
        // silently hide the action, and re-checked again at conversion time.
        $canConvert = $user === null || $user->can('document_upload.convert');

        if (! $canConvert) {
            $blockers[] = 'You do not have permission to create drafts from documents.';
        }

        // 7. Duplicates. Checked here as well as at conversion so the review
        // screen never says "Ready" for a document conversion will then reject.
        $duplicate = $this->duplicateWarning($document, $schema, $fields, $user);

        if ($duplicate !== null) {
            $blockers[] = $duplicate;
        }

        $checks[] = ['label' => 'No duplicate found', 'passed' => $duplicate === null];

        // 8. Fiscal period. A closed period cannot receive a draft, and finding
        // that out only at conversion wastes the whole review.
        $lock = $this->fiscalLockWarning($fields);

        if ($lock !== null) {
            $blockers[] = $lock;
        }

        return $this->result(
            $blockers === [],
            $blockers,
            $checks,
            $schema->conversionTarget,
        );
    }

    /**
     * Duplicate warning, or null when clear.
     *
     * A user holding the override permission is warned but not blocked — the
     * decision is theirs, and blocking outright would strand legitimate
     * re-issued documents.
     */
    private function duplicateWarning(DocumentUpload $document, $schema, array $fields, ?User $user): ?string
    {
        if (! $schema->isConvertible()) {
            return null;
        }

        $payload = array_filter([
            'bill_no' => $fields['document_number']['value'] ?? null,
            'invoice_no' => $fields['document_number']['value'] ?? null,
            'bill_date' => $fields['document_date']['value'] ?? null,
            'invoice_date' => $fields['document_date']['value'] ?? null,
            'total' => $fields['totals.grand_total']['value'] ?? null,
        ]);

        try {
            $duplicates = $this->duplicates->check(
                (string) $schema->conversionTarget,
                $payload,
                $document->file_hash,
            );
        } catch (Throwable) {
            // A duplicate-check failure must not silently report "no duplicate".
            return 'The duplicate check could not be completed. Review before creating a draft.';
        }

        if (empty($duplicates)) {
            return null;
        }

        if ($user !== null && $user->can('document_upload.duplicate_override')) {
            return null;
        }

        return 'This looks like a document already in KiteLedger. Ask someone with override rights to confirm.';
    }

    /**
     * Blocks when the document date falls in a closed fiscal year.
     *
     * Resolved from the tenant's own fiscal-year records; absent that table the
     * check is skipped rather than guessed.
     */
    private function fiscalLockWarning(array $fields): ?string
    {
        $date = $fields['document_date']['value'] ?? null;

        if (! is_string($date) || $date === '') {
            return null;
        }

        try {
            if (! Schema::hasTable('fiscal_years')) {
                return null;
            }

            // A tenant with no fiscal years configured yet is not "closed" —
            // blocking every document because setup is incomplete would be
            // wrong. Only judge the date once periods actually exist.
            if (DB::table('fiscal_years')->limit(1)->count() === 0) {
                return null;
            }

            $year = DB::table('fiscal_years')
                ->whereDate('start_date', '<=', $date)
                ->whereDate('end_date', '>=', $date)
                ->first();

            if (! $year) {
                return 'The document date does not fall in any defined fiscal year.';
            }

            $closed = (bool) ($year->is_closed ?? $year->closed ?? false);

            return $closed
                ? 'The accounting period for this date is closed.'
                : null;
        } catch (Throwable) {
            return null;
        }
    }

    private function result(bool $ready, array $blockers, array $checks, ?string $target): array
    {
        return [
            'ready' => $ready,
            'blockers' => array_values(array_unique($blockers)),
            'checks' => $checks,
            'conversion_target' => $target,
        ];
    }

    private function humanKey(string $key): string
    {
        return match ($key) {
            'party.name' => 'supplier or customer',
            'document_number' => 'document number',
            'document_date' => 'document date',
            'due_date' => 'due date',
            'currency_code' => 'currency',
            'totals.grand_total' => 'total',
            'totals.subtotal' => 'subtotal',
            'totals.paid_amount' => 'amount paid',
            default => str_replace(['_', '.'], [' ', ' '], $key),
        };
    }
}
