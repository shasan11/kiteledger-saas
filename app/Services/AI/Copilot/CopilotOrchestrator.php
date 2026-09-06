<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiToolCall;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiResponseCacheService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use App\Services\AI\Copilot\Metrics\CopilotMetricCatalog;
use App\Services\AI\Copilot\Metrics\MetricQuery;
use App\Services\AI\Copilot\Tools\CopilotToolExecutor;
use App\Services\AI\Copilot\Tools\CopilotToolScope;
use App\Support\Money\CurrencyFormatter;
use Throwable;

/**
 * The single entry point for Copilot V2 request handling.
 *
 * Everything the controller used to decide inline — classification, source
 * policy, evidence rules, persistence and usage logging — happens here, in one
 * observable sequence, with a trace explaining each decision.
 */
final class CopilotOrchestrator
{
    public function __construct(
        private readonly CopilotRouter $router,
        private readonly KiteLedgerCopilotService $copilot,
        private readonly AiSettingsService $settings,
        private readonly AiPermissionService $permissions,
        private readonly AiUsageLogger $usage,
        private readonly CopilotToolExecutor $toolExecutor,
        private readonly CopilotResponseComposer $composer,
        private readonly CopilotMetricCatalog $catalog,
        private readonly CopilotToolScope $toolScope,
        private readonly CurrencyFormatter $currency,
        private readonly AiResponseCacheService $cache,
    ) {}

    /**
     * @param  CopilotStreamEmitter|null  $emitter  receives stage and token-delta
     *                                              progress; null for the plain
     *                                              JSON path, which produces an
     *                                              identical outcome
     */
    public function handle(CopilotRequest $request, ?CopilotStreamEmitter $emitter = null): CopilotOutcome
    {
        $trace = new CopilotTrace($request->requestId);
        $trace->attribute('context_type', $request->contextType)
            ->attribute('branch_scope', $request->context->branchId ? 'selected' : 'all_authorized')
            ->attribute('fiscal_year_scope', $request->context->fiscalYearId ? 'selected' : 'all_authorized');

        $conversation = $request->conversation;

        if (! $conversation instanceof AiConversation) {
            throw new CopilotException(
                'The conversation could not be resolved.',
                CopilotException::AI_SCOPE_CHANGED,
                $trace->requestId,
            );
        }

        // A response on a later turn may depend on prose from earlier messages,
        // not only the structured filters. Restrict reusable answers to the
        // first turn of a conversation so an ambiguous follow-up such as
        // "tell me more" can never inherit another conversation's meaning.
        $isFirstTurn = ! AiMessage::query()
            ->where('ai_conversation_id', $conversation->id)
            ->exists();

        $this->recordUserMessage($conversation, $request);

        $emitter?->stage('routing', 'Understanding your question');

        try {
            $decision = $this->router->route($request, $trace);
        } catch (CopilotException $e) {
            return new CopilotOutcome(
                response: new CopilotResponse(
                    type: CopilotResponseType::Error,
                    message: $e->getMessage(),
                    sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
                ),
                trace: $trace,
                conversation: $conversation,
                exception: $e,
            );
        }

        // Structured state resolves follow-ups ("compare it with last month")
        // by filling gaps the current turn left open. Disabled by flag, and
        // discarded automatically when the trusted scope changes.
        $stateEnabled = (bool) config('ai.copilot.conversation_state_enabled', true);
        $state = $stateEnabled
            ? CopilotConversationState::load($conversation, $request->context)
            : CopilotConversationState::empty();

        if ($stateEnabled && ! $state->isEmpty()) {
            $decision = $state->applyTo($decision);
            $trace->step('conversation_state', [
                'applied' => true,
                'summary' => $state->promptSummary(),
            ]);
        }

        $trace->routing($decision);
        $this->logToolCall($conversation, $request, 'router.decision', $decision->toTraceArray());

        $cacheKey = $this->cacheKeyFor($request, $decision, $isFirstTurn);
        $response = $cacheKey ? $this->cachedResponse($cacheKey, $trace) : null;

        if ($response) {
            $emitter?->stage('cache', 'Using a recent answer');
            $this->usage->log([
                'user_id' => $request->user->id,
                'branch_id' => $request->context->branchId,
                'module' => $request->contextType,
                'feature' => 'copilot',
                'request_id' => $request->requestId,
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'status' => 'success',
                'intent' => $decision->intent->value,
                'duration_ms' => $trace->durationMs(),
                'request_hash' => $cacheKey,
                'cache_hit' => true,
            ]);
        } else {
            $response = $this->respondTo($request, $conversation, $decision, $trace, $emitter);

            if ($cacheKey && $response->actions === [] && $response->type !== CopilotResponseType::PendingAction) {
                try {
                    $this->cache->put($cacheKey, $response->toCacheArray());
                    $trace->step('cache', ['hit' => false, 'stored' => true]);
                } catch (Throwable) {
                    // Caching is an optimization. A cache outage must never
                    // turn a successful Copilot answer into a failed request.
                    $trace->step('cache', ['hit' => false, 'stored' => false]);
                }
            }
        }

        if ($stateEnabled) {
            $state->rememberFrom($decision, $request->context, $response->toolsUsed[0] ?? null)
                ->persist($conversation);
        }

        $this->recordAssistantMessage($conversation, $response, $decision);

        return new CopilotOutcome($response, $trace, $conversation);
    }

    private function cacheKeyFor(
        CopilotRequest $request,
        CopilotRoutingDecision $decision,
        bool $isFirstTurn,
    ): ?string {
        if (! $this->settings->cacheEnabled()
            || ! $request->allowCache
            || $request->isPrivate()
            || ! $isFirstTurn
            || ! in_array($decision->intent, [
                CopilotIntent::AppHelp,
                CopilotIntent::RecordLookup,
                CopilotIntent::MetricQuery,
                CopilotIntent::ReportNavigation,
                CopilotIntent::BusinessAnalysis,
            ], true)
            || $this->asksForImmediateData($request->message)) {
            return null;
        }

        return $this->cache->key(
            $request->user->id,
            $request->context->branchId,
            $request->message,
            [
                'context_type' => $request->contextType,
                'fiscal_year_id' => $request->context->fiscalYearId,
                'safe_context' => $request->safeContextPayload,
                'intent' => $decision->intent->value,
                'filters' => $decision->filters,
            ],
        );
    }

    private function cachedResponse(string $cacheKey, CopilotTrace $trace): ?CopilotResponse
    {
        try {
            $payload = $this->cache->get($cacheKey);
            $response = $payload ? CopilotResponse::fromCacheArray($payload) : null;
            $trace->step('cache', ['hit' => $response !== null]);

            return $response;
        } catch (Throwable) {
            $trace->step('cache', ['hit' => false, 'available' => false]);

            return null;
        }
    }

    private function asksForImmediateData(string $message): bool
    {
        return preg_match(
            '/\b(current|currently|live|today|latest|now|up[ -]to[ -]date|just posted)\b/iu',
            $message,
        ) === 1;
    }

    private function respondTo(
        CopilotRequest $request,
        AiConversation $conversation,
        CopilotRoutingDecision $decision,
        CopilotTrace $trace,
        ?CopilotStreamEmitter $emitter = null,
    ): CopilotResponse {
        if ($decision->isBlocked()) {
            $trace->step('execution', ['outcome' => 'blocked']);

            return CopilotResponse::blocked((string) $decision->blockedReason);
        }

        if ($decision->needsClarification()) {
            $trace->step('execution', ['outcome' => 'clarification']);

            return CopilotResponse::clarification(
                $decision->reason ?: 'Could you give me one more detail?',
                $decision->missingFields,
            );
        }

        if ($decision->intent === CopilotIntent::Greeting) {
            $trace->step('execution', ['outcome' => 'greeting']);

            return CopilotResponse::chat(
                'Hello. Ask me about your sales, receivables, payables, inventory, a specific document, '
                .'or how to use KiteLedger.'
            );
        }

        if ($decision->intent === CopilotIntent::Unsupported) {
            $trace->step('execution', ['outcome' => 'unsupported']);

            return CopilotResponse::blocked(
                'That is outside what the KiteLedger Copilot can help with.'
            );
        }

        $plan = $this->plan($decision);
        $trace->step('plan', $plan->toTraceArray());

        if ($plan->isDeterministic()) {
            $emitter?->stage('retrieval', 'Checking your KiteLedger data');

            if ($response = $this->runDeterministicPlan($request, $plan, $decision, $trace)) {
                return $response;
            }

            // A metric we cannot compute deterministically must not silently
            // become a model-generated number; fall back to the agent, which
            // can only reach the same authorized tools.
            $trace->fallback('metric_not_resolvable');
        }

        return $this->runAgent($request, $conversation, $decision, $trace, $emitter);
    }

    /**
     * Chooses an execution strategy. A metric question with a resolvable
     * canonical key skips the model entirely for the calculation.
     */
    private function plan(CopilotRoutingDecision $decision): CopilotPlan
    {
        if ($decision->intent === CopilotIntent::MetricQuery && isset($decision->filters['metric'])) {
            try {
                return CopilotPlan::deterministicMetric(MetricQuery::fromArray([
                    'metric' => $decision->filters['metric'],
                    'operation' => $this->operationFor($decision),
                    'date_from' => $decision->filters['date_range']['from'] ?? null,
                    'date_to' => $decision->filters['date_range']['to'] ?? null,
                    'statuses' => $decision->filters['statuses'] ?? [],
                    'group_by' => $decision->filters['group_by'] ?? null,
                    'sort_direction' => $decision->filters['sort_direction'] ?? 'desc',
                    'limit' => $decision->filters['limit'] ?? 0,
                ]));
            } catch (CopilotException) {
                return CopilotPlan::agent();
            }
        }

        return CopilotPlan::agent();
    }

    private function operationFor(CopilotRoutingDecision $decision): string
    {
        if (isset($decision->filters['group_by'])) {
            return 'rank';
        }

        return isset($decision->filters['limit']) ? 'rank' : 'summary';
    }

    /**
     * Executes the metric directly and composes the answer from the verified
     * result. Returns null when the metric could not be resolved or authorized,
     * so the caller can fall back.
     */
    private function runDeterministicPlan(
        CopilotRequest $request,
        CopilotPlan $plan,
        CopilotRoutingDecision $decision,
        CopilotTrace $trace,
    ): ?CopilotResponse {
        $query = $plan->metricQuery;

        if (! $query) {
            return null;
        }

        $startedAt = microtime(true);

        try {
            $result = $this->toolExecutor->executeMetric($request->context, $query);
            $label = $this->catalog->resolve($query->metric, $query->operation)->label;
        } catch (CopilotException $e) {
            $trace->step('tool', [
                'ok' => false,
                'code' => $e->getErrorCode(),
                'tool' => $plan->tool,
            ], $startedAt);

            // An authorization refusal is the answer — never retried through
            // the agent, which would be a way around the permission check.
            if ($e->getErrorCode() === CopilotException::AI_TOOL_NOT_AUTHORIZED) {
                return CopilotResponse::blocked($e->getMessage());
            }

            return null;
        }

        $trace->step('tool', array_merge(['ok' => true], $result->toTraceArray()), $startedAt);

        return $this->composer->fromToolResult($result, $decision, $label);
    }

    /**
     * Runs the tool-enabled Neuron agent.
     *
     * Answer generation still goes through KiteLedgerCopilotAgent and its
     * existing authorized tools; V2's contribution at this milestone is that a
     * single validated decision — not competing keyword matchers — determines
     * whether this runs at all, and under which evidence policy.
     */
    private function runAgent(
        CopilotRequest $request,
        AiConversation $conversation,
        CopilotRoutingDecision $decision,
        CopilotTrace $trace,
        ?CopilotStreamEmitter $emitter = null,
    ): CopilotResponse {
        $startedAt = microtime(true);

        // Only the tools this intent actually needs reach the model. Narrowing
        // is applied after permission filtering and can never widen the set.
        $allowedTools = $this->toolScope->resolve($decision);
        $trace->step('tool_scope', ['tools' => $allowedTools ?? ['*']]);

        $emitter?->stage($decision->requiresLiveData ? 'retrieval' : 'analysis', $this->stageLabelFor($decision));

        // Time to the first visible token: the number a user experiences as
        // "is this working", which total duration hides entirely.
        $firstTokenMs = null;

        try {
            if ($emitter !== null) {
                $firstDelta = true;
                $result = $this->copilot->respondStreamed(
                    $request->context,
                    $conversation,
                    $allowedTools,
                    function (string $text) use ($emitter, &$firstDelta, &$firstTokenMs, $startedAt): void {
                        if ($firstDelta) {
                            // The answer has started; the progress stages are
                            // finished and the client can switch to rendering.
                            $emitter->stage('answering', 'Preparing your answer');
                            $firstTokenMs = (int) round((microtime(true) - $startedAt) * 1000);
                            $firstDelta = false;
                        }

                        $emitter->delta($text);
                    },
                );
            } else {
                $result = $this->copilot->respond($request->context, $conversation, $allowedTools);
            }
        } catch (AiProviderException $e) {
            $trace->step('agent', ['ok' => false], $startedAt);
            $trace->error($e->getErrorCode());

            throw new CopilotException(
                $e->getMessage(),
                $this->mapProviderCode($e->getErrorCode()),
                $trace->requestId,
                $e,
            );
        }

        $trace->step('agent', [
            'ok' => true,
            'tokens' => $result['usage']['total'] ?? 0,
        ], $startedAt);

        $this->usage->log([
            'user_id' => $request->user->id,
            'branch_id' => $request->context->branchId,
            'module' => $request->contextType,
            'feature' => 'copilot',
            'request_id' => $request->requestId,
            'provider' => $result['provider'] ?? null,
            'fallback_provider' => ($result['failover_used'] ?? false) ? ($result['provider_used'] ?? null) : null,
            'model' => $result['model'] ?? null,
            'prompt_tokens' => (int) ($result['usage']['prompt'] ?? 0),
            'completion_tokens' => (int) ($result['usage']['completion'] ?? 0),
            'total_tokens' => (int) ($result['usage']['total'] ?? 0),
            'status' => 'success',
            'intent' => $decision->intent->value,
            'selected_tool' => $allowedTools === null ? null : implode(',', array_slice($allowedTools, 0, 5)),
            'duration_ms' => $trace->durationMs(),
            // Only meaningful on the streamed path; null on the JSON path says
            // "not measured" rather than implying an instant first token.
            'first_token_ms' => $firstTokenMs,
        ]);

        $text = trim((string) ($result['text'] ?? ''));

        if ($text === '') {
            $trace->error(CopilotException::AI_INSUFFICIENT_EVIDENCE);

            throw new CopilotException(
                'I could not produce an answer for that. Please try rephrasing the question.',
                CopilotException::AI_INSUFFICIENT_EVIDENCE,
                $trace->requestId,
            );
        }

        return new CopilotResponse(
            type: $this->responseTypeFor($decision),
            message: $text,
            sourcePolicy: $decision->sourcePolicy,
            filters: $decision->filters,
            currency: $this->currency->base()->code,
            currencyDisplay: $this->currency->base()->toArray(),
            branchScopeLabel: $request->context->branchId ? 'Selected branch' : 'All permitted branches',
            asOf: now(),
            verified: $decision->requiresLiveData,
        );
    }

    /**
     * Progress wording a business user can read. Deliberately describes the
     * work in KiteLedger terms — never retrieval, embeddings or model calls.
     */
    private function stageLabelFor(CopilotRoutingDecision $decision): string
    {
        return match ($decision->intent) {
            CopilotIntent::MetricQuery => 'Checking your business figures',
            CopilotIntent::RecordLookup => 'Looking up the record',
            CopilotIntent::ReportNavigation => 'Finding the right report',
            CopilotIntent::AppHelp => 'Looking through KiteLedger help',
            CopilotIntent::BusinessAnalysis => 'Analyzing the results',
            CopilotIntent::ActionProposal => 'Preparing a draft for your approval',
            default => 'Working on your request',
        };
    }

    private function responseTypeFor(CopilotRoutingDecision $decision): CopilotResponseType
    {
        return match ($decision->intent) {
            CopilotIntent::RecordLookup => CopilotResponseType::RecordLookup,
            CopilotIntent::ReportNavigation => CopilotResponseType::Report,
            CopilotIntent::MetricQuery => CopilotResponseType::VerifiedToolAnswer,
            CopilotIntent::BusinessAnalysis => CopilotResponseType::Mixed,
            CopilotIntent::AppHelp => CopilotResponseType::Rag,
            CopilotIntent::ActionProposal => CopilotResponseType::PendingAction,
            default => CopilotResponseType::Chat,
        };
    }

    private function mapProviderCode(string $code): string
    {
        return match ($code) {
            'AI_TIMEOUT' => CopilotException::AI_TIMEOUT,
            'AI_RATE_LIMIT' => CopilotException::AI_RATE_LIMIT,
            'AI_PROVIDER_AUTH_FAILED' => CopilotException::AI_PROVIDER_AUTH_FAILED,
            'AI_PROVIDER_NOT_CONFIGURED' => CopilotException::AI_PROVIDER_NOT_CONFIGURED,
            default => CopilotException::AI_TOOL_EXECUTION_FAILED,
        };
    }

    private function recordUserMessage(AiConversation $conversation, CopilotRequest $request): void
    {
        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $request->message,
            'context' => ['type' => $request->contextType, 'v2' => true],
        ]);
    }

    private function recordAssistantMessage(
        AiConversation $conversation,
        CopilotResponse $response,
        CopilotRoutingDecision $decision,
    ): void {
        // Structured display data is persisted alongside the text so reopening
        // a conversation restores what the user originally saw.
        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $response->message,
            'context' => [
                'type' => $response->type->value,
                'intent' => $decision->intent->value,
                'evidence' => $response->sourcePolicy->value,
                'verified' => $response->verified,
                'filters' => $response->filters,
                'cards' => $response->cards,
                'tables' => $response->tables,
                'warnings' => $response->warnings,
                'followups' => $response->followups,
                'v2' => true,
            ],
        ]);
    }

    private function logToolCall(AiConversation $conversation, CopilotRequest $request, string $tool, array $output): void
    {
        try {
            AiToolCall::create([
                'ai_conversation_id' => $conversation->id,
                'user_id' => $request->user->id,
                'tool_name' => $tool,
                'input' => ['message_length' => mb_strlen($request->message)],
                'output' => $output,
                'status' => 'completed',
            ]);
        } catch (Throwable) {
            // Traceability must never break the answer.
        }
    }

    public function canViewTrace(CopilotRequest $request): bool
    {
        return $this->permissions->canViewDebug($request->user);
    }
}
