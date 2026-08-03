<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Stable public error codes with actionable messages.
 *
 * Messages are written for an accountant, not an engineer: "AI provider
 * returned HTTP 422" tells the user nothing they can act on, whereas naming the
 * likely cause and the next step does. Provider names, models, status codes and
 * stack detail never reach this text.
 */
enum DocumentErrorCode: string
{
    case FileMissing = 'DOCUMENT_FILE_MISSING';
    case TypeUnsupported = 'DOCUMENT_TYPE_UNSUPPORTED';
    case PasswordProtected = 'DOCUMENT_PASSWORD_PROTECTED';
    case TooLarge = 'DOCUMENT_TOO_LARGE';
    case Empty = 'DOCUMENT_EMPTY';
    case ScanInProgress = 'DOCUMENT_SCAN_IN_PROGRESS';
    case AiNotConfigured = 'DOCUMENT_AI_NOT_CONFIGURED';
    case AiTimeout = 'DOCUMENT_AI_TIMEOUT';
    case AiRateLimit = 'DOCUMENT_AI_RATE_LIMIT';
    case AiUnavailable = 'DOCUMENT_AI_UNAVAILABLE';
    case ExtractionInvalid = 'DOCUMENT_EXTRACTION_INVALID';
    case PartialExtraction = 'DOCUMENT_PARTIAL_EXTRACTION';
    case ReviewRequired = 'DOCUMENT_REVIEW_REQUIRED';
    case DuplicateDetected = 'DOCUMENT_DUPLICATE_DETECTED';
    case ConversionFailed = 'DOCUMENT_CONVERSION_FAILED';
    case BranchForbidden = 'DOCUMENT_BRANCH_FORBIDDEN';
    case FiscalPeriodLocked = 'DOCUMENT_FISCAL_PERIOD_LOCKED';
    case Unknown = 'DOCUMENT_PROCESSING_FAILED';

    public function message(): string
    {
        return match ($this) {
            self::FileMissing => 'The original file could not be found. Please upload it again.',
            self::TypeUnsupported => 'This file type cannot be read. Upload a PDF, Word document, or an image.',
            self::PasswordProtected => 'This PDF is password protected. Remove the password and upload it again.',
            self::TooLarge => 'This file is larger than the current upload limit. Try a smaller or compressed file.',
            self::Empty => 'This file appears to be empty. Please check it and upload again.',
            self::ScanInProgress => 'This document is already being processed. Please wait for it to finish.',
            self::AiNotConfigured => 'Document scanning has not been set up yet. Please contact your administrator.',
            self::AiTimeout => 'This document took too long to read. Try a smaller file or fewer pages.',
            self::AiRateLimit => 'Document scanning is busy right now. Please try again in a few minutes.',
            self::AiUnavailable => 'Document scanning is temporarily unavailable. Please try again shortly.',
            self::ExtractionInvalid => 'KiteLedger could not read this document clearly. Try a higher-quality scan or a native PDF.',
            self::PartialExtraction => 'Only part of this document could be read. Review the details carefully before creating a draft.',
            self::ReviewRequired => 'Some details need your review before a draft can be created.',
            self::DuplicateDetected => 'This document looks like one already in KiteLedger. Review it before continuing.',
            self::ConversionFailed => 'The draft could not be created. Review the details and try again.',
            self::BranchForbidden => 'This document belongs to a branch you do not have access to.',
            self::FiscalPeriodLocked => 'The accounting period for this date is closed, so a draft cannot be created.',
            self::Unknown => 'Something went wrong while processing this document. You can retry the scan.',
        };
    }

    /**
     * Recovery actions the UI should offer, in priority order.
     *
     * @return string[]
     */
    public function actions(): array
    {
        return match ($this) {
            self::FileMissing, self::Empty => ['replace_file'],
            self::TypeUnsupported, self::PasswordProtected, self::TooLarge => ['replace_file', 'enter_manually'],
            self::AiTimeout, self::AiRateLimit, self::AiUnavailable => ['retry', 'enter_manually'],
            self::ExtractionInvalid, self::PartialExtraction => ['retry', 'replace_file', 'enter_manually'],
            self::AiNotConfigured => ['contact_administrator'],
            self::FiscalPeriodLocked, self::BranchForbidden => ['contact_administrator'],
            self::ScanInProgress => ['view_progress'],
            default => ['retry', 'enter_manually'],
        };
    }

    /** Whether retrying could plausibly succeed without the user changing anything. */
    public function isTransient(): bool
    {
        return match ($this) {
            self::AiTimeout, self::AiRateLimit, self::AiUnavailable => true,
            default => false,
        };
    }

    /**
     * Maps an internal provider/system error to a public code.
     *
     * Matching is on cause, not on raw text being shown anywhere: the input is
     * inspected here and then discarded.
     */
    public static function fromThrowableMessage(?string $raw, string $providerCode = ''): self
    {
        $text = strtolower(trim($raw ?? '').' '.strtolower($providerCode));

        $has = static fn (string $needle): bool => str_contains($text, $needle);
        $hasStatus = static fn (string $code): bool => (bool) preg_match('/\b'.$code.'\b/', $text);

        return match (true) {
            $has('password') || $has('encrypted') => self::PasswordProtected,
            $has('file is missing') || $has('could not be read') || $has('document_file_missing') => self::FileMissing,
            $has('ai_api_key_missing') || $has('ai_disabled') || $has('not configured') => self::AiNotConfigured,
            $has('ai_vision_unsupported') || $has('invalid file type') || $has('unsupported') => self::TypeUnsupported,
            $has('timed out') || $has('timeout') => self::AiTimeout,
            $hasStatus('429') || $has('rate limit') || $has('quota') => self::AiRateLimit,
            $hasStatus('503') || $has('overloaded') || $has('temporarily unavailable') => self::AiUnavailable,
            $has('not valid json') || $has('schema') || $has('malformed') => self::ExtractionInvalid,
            default => self::Unknown,
        };
    }

    public function toArray(): array
    {
        return [
            'code' => $this->value,
            'message' => $this->message(),
            'actions' => $this->actions(),
            'transient' => $this->isTransient(),
        ];
    }
}
