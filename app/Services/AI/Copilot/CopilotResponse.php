<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use Illuminate\Support\Carbon;
use Throwable;

/**
 * Typed Copilot answer that renders the existing HTTP envelope.
 *
 * The legacy `mode`, `answer`, `sources`, `cards`, `tables`, `warnings`,
 * `followups` and `actions` keys are preserved exactly so the current React
 * assistant keeps working; V2 adds `evidence`, `as_of`, `filters`, `tools_used`
 * and `verified` additively.
 */
final readonly class CopilotResponse
{
    /**
     * @param  array<string, mixed>  $answer
     * @param  array<int, mixed>  $actions
     * @param  array<int, mixed>  $sources
     * @param  array<int, mixed>  $cards
     * @param  array<int, mixed>  $tables
     * @param  array<int, string>  $warnings
     * @param  array<int, string>  $followups
     * @param  array<int, string>  $toolsUsed
     * @param  array<string, mixed>  $filters
     */
    public function __construct(
        public CopilotResponseType $type,
        public string $message,
        public AnswerSourcePolicy $sourcePolicy,
        public array $answer = [],
        public array $actions = [],
        public array $sources = [],
        public array $cards = [],
        public array $tables = [],
        public array $warnings = [],
        public array $followups = [],
        public array $toolsUsed = [],
        public array $filters = [],
        public ?string $currency = null,
        /**
         * How that currency is written: code, symbol and decimal places. Sent
         * so the client renders amounts the tenant's way instead of assuming a
         * symbol of its own.
         *
         * @var array{code: string, symbol: string, decimal_places: int}|null
         */
        public ?array $currencyDisplay = null,
        public ?string $branchScopeLabel = null,
        public ?Carbon $asOf = null,
        public bool $verified = false,
        public bool $cached = false,
    ) {}

    public static function chat(string $message, AnswerSourcePolicy $policy = AnswerSourcePolicy::GeneralModelAllowed): self
    {
        return new self(type: CopilotResponseType::Chat, message: $message, sourcePolicy: $policy);
    }

    /**
     * @param  array<int, string>  $missingFields
     * @param  array<int, string>  $options
     */
    public static function clarification(string $message, array $missingFields, array $options = []): self
    {
        return new self(
            type: CopilotResponseType::Clarification,
            message: $message,
            sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
            answer: [
                'headline' => 'I need one more detail',
                'body' => $message,
                'bullets' => [],
                'limitations' => [],
                'confidence' => 'low',
                'confidence_label' => 'Needs clarification',
                'missing_fields' => array_values($missingFields),
            ],
            followups: array_values($options),
        );
    }

    public static function blocked(string $message): self
    {
        return new self(
            type: CopilotResponseType::BlockedAction,
            message: $message,
            sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
        );
    }

    /**
     * Cache only the reusable answer, never request IDs, encrypted conversation
     * tokens, traces, or other turn-specific envelope data.
     *
     * @return array<string, mixed>
     */
    public function toCacheArray(): array
    {
        return [
            'schema' => 1,
            'type' => $this->type->value,
            'message' => $this->message,
            'source_policy' => $this->sourcePolicy->value,
            'answer' => $this->answer,
            'actions' => $this->actions,
            'sources' => $this->sources,
            'cards' => $this->cards,
            'tables' => $this->tables,
            'warnings' => $this->warnings,
            'followups' => $this->followups,
            'tools_used' => $this->toolsUsed,
            'filters' => $this->filters,
            'currency' => $this->currency,
            'currency_display' => $this->currencyDisplay,
            'branch_scope_label' => $this->branchScopeLabel,
            'as_of' => $this->asOf?->toIso8601String(),
            'verified' => $this->verified,
        ];
    }

    /** Rehydrate a validated cache payload and explicitly mark it as cached. */
    public static function fromCacheArray(array $payload): ?self
    {
        $type = CopilotResponseType::tryFrom((string) ($payload['type'] ?? ''));
        $policy = AnswerSourcePolicy::tryFrom((string) ($payload['source_policy'] ?? ''));
        $message = $payload['message'] ?? null;

        if (($payload['schema'] ?? null) !== 1 || ! $type || ! $policy || ! is_string($message)) {
            return null;
        }

        try {
            $rawAsOf = $payload['as_of'] ?? null;
            $asOf = is_string($rawAsOf) && trim($rawAsOf) !== ''
                ? Carbon::parse($rawAsOf)
                : null;
        } catch (Throwable) {
            return null;
        }

        return new self(
            type: $type,
            message: $message,
            sourcePolicy: $policy,
            answer: is_array($payload['answer'] ?? null) ? $payload['answer'] : [],
            actions: is_array($payload['actions'] ?? null) ? $payload['actions'] : [],
            sources: is_array($payload['sources'] ?? null) ? $payload['sources'] : [],
            cards: is_array($payload['cards'] ?? null) ? $payload['cards'] : [],
            tables: is_array($payload['tables'] ?? null) ? $payload['tables'] : [],
            warnings: is_array($payload['warnings'] ?? null) ? $payload['warnings'] : [],
            followups: is_array($payload['followups'] ?? null) ? $payload['followups'] : [],
            toolsUsed: is_array($payload['tools_used'] ?? null) ? $payload['tools_used'] : [],
            filters: is_array($payload['filters'] ?? null) ? $payload['filters'] : [],
            currency: is_string($payload['currency'] ?? null) ? $payload['currency'] : null,
            currencyDisplay: is_array($payload['currency_display'] ?? null) ? $payload['currency_display'] : null,
            branchScopeLabel: is_string($payload['branch_scope_label'] ?? null) ? $payload['branch_scope_label'] : null,
            asOf: $asOf,
            verified: (bool) ($payload['verified'] ?? false),
            cached: true,
        );
    }

    /**
     * Envelope consumed by resources/js/Pages/App/AI/Assistant.jsx.
     *
     * @param  array<string, mixed>|null  $debug  sanitized trace, debug users only
     */
    public function toArray(string $conversationToken, string $requestId, ?array $debug = null): array
    {
        $answer = $this->answer !== [] ? $this->answer : [
            'headline' => $this->headline(),
            'body' => $this->message,
            'bullets' => [],
            'limitations' => [],
            'confidence' => $this->verified ? 'high' : 'medium',
            'confidence_label' => $this->verified ? 'Verified from your data' : 'Medium confidence',
        ];

        return [
            'ok' => $this->type !== CopilotResponseType::Error,
            'mode' => $this->type->legacyMode(),
            'conversation_id' => $conversationToken,
            'message' => ['role' => 'assistant', 'content' => $this->message],
            'answer' => $answer,
            'actions' => $this->actions,
            'sources' => $this->sources,
            'display' => array_filter([
                'answer' => $answer,
                'cards' => $this->cards,
                'tables' => $this->tables,
                'warnings' => $this->warnings,
                'followups' => $this->followups,
            ], static fn ($value) => $value !== [] && $value !== null),
            'answer_type' => $this->type->value,
            'cards' => $this->cards,
            'tables' => $this->tables,
            'warnings' => $this->warnings,
            'source_note' => $this->sourcePolicy->evidenceLabel(),
            'currency' => $this->currencyDisplay,
            'followups' => $this->followups,
            'cached' => $this->cached,
            'request_id' => $requestId,

            // V2 additions — additive, so existing clients ignore them safely.
            'evidence' => [
                'policy' => $this->sourcePolicy->value,
                'label' => $this->sourcePolicy->evidenceLabel(),
                'verified' => $this->verified,
                'tools_used' => $this->toolsUsed,
                'as_of' => $this->asOf?->toIso8601String(),
                'currency' => $this->currency,
                'branch_scope' => $this->branchScopeLabel,
                'filters' => $this->filters,
            ],

            'debug' => $debug,
        ];
    }

    private function headline(): string
    {
        $line = trim((string) strtok($this->message, "\n"));

        return mb_strlen($line) > 140 ? mb_substr($line, 0, 137).'...' : ($line ?: 'KiteLedger Copilot');
    }
}
