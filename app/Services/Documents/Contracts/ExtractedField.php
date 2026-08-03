<?php

declare(strict_types=1);

namespace App\Services\Documents\Contracts;

/**
 * One reviewable field.
 *
 * Holds the original extraction alongside the current value, so a user edit
 * never destroys what the document actually said — the pair is what makes the
 * correction-feedback loop and "you changed this" indicators possible.
 */
final readonly class ExtractedField
{
    /**
     * @param FieldEvidence[] $evidence
     * @param string[] $warnings
     */
    public function __construct(
        public string $key,
        public mixed $value,
        public mixed $originalValue = null,
        public ?float $confidence = null,
        public FieldOrigin $origin = FieldOrigin::Unknown,
        public array $evidence = [],
        public array $warnings = [],
        public FieldValidationState $validationState = FieldValidationState::Ok,
        public bool $editedByUser = false,
        public ?string $conflictValue = null,
    ) {}

    /** A value read from the document, with whatever evidence came with it. */
    public static function extracted(
        string $key,
        mixed $value,
        ?float $confidence = null,
        array $evidence = [],
    ): self {
        return new self(
            key: $key,
            value: $value,
            originalValue: $value,
            confidence: $confidence,
            origin: $value === null || $value === '' ? FieldOrigin::Unknown : FieldOrigin::Extracted,
            evidence: $evidence,
            validationState: $value === null || $value === ''
                ? FieldValidationState::Missing
                : FieldValidationState::Ok,
        );
    }

    /**
     * A value KiteLedger calculated because the document did not show it.
     * Carries no evidence by definition — there is nothing on the page to point at.
     */
    public static function derived(string $key, mixed $value, string $explanation): self
    {
        return new self(
            key: $key,
            value: $value,
            originalValue: null,
            confidence: null,
            origin: FieldOrigin::Derived,
            warnings: [$explanation],
            validationState: FieldValidationState::Ok,
        );
    }

    public static function missing(string $key): self
    {
        return new self(
            key: $key,
            value: null,
            origin: FieldOrigin::Unknown,
            validationState: FieldValidationState::Missing,
        );
    }

    /** Marks a disagreement between the document and the deterministic calculation. */
    public function withConflict(string $calculatedValue, string $explanation): self
    {
        return new self(
            key: $this->key,
            value: $this->value,
            originalValue: $this->originalValue,
            confidence: $this->confidence,
            origin: $this->origin,
            evidence: $this->evidence,
            warnings: array_merge($this->warnings, [$explanation]),
            validationState: FieldValidationState::Conflict,
            editedByUser: $this->editedByUser,
            conflictValue: $calculatedValue,
        );
    }

    public function withValidationState(FieldValidationState $state): self
    {
        return new self(
            key: $this->key,
            value: $this->value,
            originalValue: $this->originalValue,
            confidence: $this->confidence,
            origin: $this->origin,
            evidence: $this->evidence,
            warnings: $this->warnings,
            validationState: $state,
            editedByUser: $this->editedByUser,
            conflictValue: $this->conflictValue,
        );
    }

    /**
     * Applies a user correction. The original extraction is preserved so the
     * document's own value remains inspectable and comparable.
     */
    public function withUserValue(mixed $value): self
    {
        return new self(
            key: $this->key,
            value: $value,
            originalValue: $this->originalValue,
            confidence: null,
            origin: FieldOrigin::User,
            evidence: $this->evidence,
            warnings: [],
            validationState: FieldValidationState::UserConfirmed,
            editedByUser: true,
            conflictValue: null,
        );
    }

    public function isPresent(): bool
    {
        return $this->value !== null && $this->value !== '';
    }

    public function needsReview(): bool
    {
        return $this->validationState->needsReview();
    }

    /** Whether the user changed the value away from what was extracted. */
    public function wasCorrected(): bool
    {
        return $this->editedByUser
            && $this->originalValue !== null
            && $this->originalValue !== $this->value;
    }

    /**
     * Shape sent to the client. Confidence is deliberately reported as a state
     * rather than a raw percentage; the number stays available for debug users.
     */
    public function toArray(bool $includeDebug = false): array
    {
        $payload = [
            'key' => $this->key,
            'value' => $this->value,
            'origin' => $this->origin->value,
            'origin_label' => $this->origin->label(),
            'state' => $this->validationState->value,
            'state_label' => $this->validationState->label(),
            'tone' => $this->validationState->tone(),
            'needs_review' => $this->needsReview(),
            'edited_by_user' => $this->editedByUser,
            'warnings' => $this->warnings,
            'evidence' => array_map(static fn (FieldEvidence $e) => $e->toArray(), $this->evidence),
            'has_source_location' => $this->evidence !== []
                && $this->evidence[0]->hasLocation(),
        ];

        if ($this->conflictValue !== null) {
            $payload['conflict_value'] = $this->conflictValue;
        }

        if ($this->editedByUser && $this->originalValue !== null) {
            $payload['original_value'] = $this->originalValue;
        }

        if ($includeDebug) {
            $payload['confidence'] = $this->confidence;
        }

        return $payload;
    }
}
