<?php

declare(strict_types=1);

namespace App\Services\Documents\Contracts;

use App\Services\Documents\Schema\DocumentSchema;

/**
 * Versioned extraction result.
 *
 * schema_version is stored with the payload so older records stay readable
 * after the contract changes again — v1 rows remain valid and are upgraded on
 * read rather than migrated destructively.
 */
final readonly class DocumentExtractionResult
{
    public const SCHEMA_VERSION = '2.0';

    /**
     * @param array<string, ExtractedField> $fields keyed by dotted path
     * @param array<int, array<string, mixed>> $lines
     * @param string[] $warnings
     */
    public function __construct(
        public string $documentType,
        public DocumentSchema $schema,
        public array $fields,
        public array $lines = [],
        public array $warnings = [],
        public ?float $overallConfidence = null,
    ) {}

    public function field(string $key): ?ExtractedField
    {
        return $this->fields[$key] ?? null;
    }

    public function value(string $key): mixed
    {
        return $this->fields[$key]->value ?? null;
    }

    /** @return ExtractedField[] fields the user should look at, worst first */
    public function fieldsNeedingReview(): array
    {
        $needing = array_filter($this->fields, static fn (ExtractedField $f) => $f->needsReview());

        uasort($needing, static function (ExtractedField $a, ExtractedField $b) {
            // Blocking problems sort above advisory ones.
            return ($b->validationState->isBlocking() <=> $a->validationState->isBlocking());
        });

        return array_values($needing);
    }

    public function reviewIssueCount(): int
    {
        return count($this->fieldsNeedingReview());
    }

    public function hasBlockingIssues(): bool
    {
        foreach ($this->fields as $field) {
            if ($field->validationState->isBlocking()) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param bool $includeDebug include raw confidence values (debug users only)
     */
    public function toArray(bool $includeDebug = false): array
    {
        return [
            'schema_version' => self::SCHEMA_VERSION,
            'document_type' => $this->documentType,
            'document_type_label' => $this->schema->label,
            'conversion_target' => $this->schema->conversionTarget,
            'is_convertible' => $this->schema->isConvertible(),
            'fields' => array_map(
                static fn (ExtractedField $f) => $f->toArray($includeDebug),
                $this->fields,
            ),
            'lines' => $this->lines,
            'warnings' => $this->warnings,
            'review_issue_count' => $this->reviewIssueCount(),
            'has_blocking_issues' => $this->hasBlockingIssues(),
            'overall_confidence' => $includeDebug ? $this->overallConfidence : null,
        ];
    }
}
