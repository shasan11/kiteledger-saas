<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Neuron\Agents\CopilotRouterAgent;
use Illuminate\Support\Carbon;
use NeuronAI\Chat\Messages\UserMessage;
use Throwable;

/**
 * The single authoritative Copilot router.
 *
 * Replaces, on the V2 path, the three competing classifiers that previously ran
 * against the same message (AiToolRouter::classify, AiAgentIntentService and
 * AiQueryUnderstandingService). Those classes remain for the legacy path until
 * V2 is the default; nothing here calls them.
 *
 * Layers run in order and short-circuit:
 *   A  deterministic safety rules        (no model, fail closed)
 *   B  high-confidence exact patterns    (no model, narrow and stable)
 *   C  structured model classification   (Neuron structured output)
 *   D  confidence gate and clarification
 */
final class CopilotRouter
{
    /**
     * Operations the Copilot must never perform, however they are phrased.
     * Matched on the raw message before any model sees it.
     */
    private const PROHIBITED_PATTERNS = [
        '/\b(drop|truncate|alter)\s+table\b/i',
        '/\b(delete|update|insert)\s+(from|into)\b/i',
        '/\bselect\b.{0,40}\bfrom\b/i',
        '/\bunion\s+select\b/i',
        '/\b(exec|system|shell_exec|passthru|eval)\s*\(/i',
        '/\b(rm\s+-rf|chmod\s+777|sudo)\b/i',
        // Credential probes, in either word order ("show the api key" /
        // "the api key, show it").
        '/\b(api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|credential|password)\b.{0,30}\b(show|reveal|print|give|what|tell)\b/i',
        '/\b(show|reveal|print|give|tell|what\s+is)\b.{0,30}\b(api[_\s-]?key|secret[_\s-]?key|access[_\s-]?token|credential|password)\b/i',
        '/\b(show|reveal|print|give|repeat|ignore)\b.{0,30}\b(system prompt|instructions|prompt)\b/i',
        '/\btenant[_\s-]?id\b/i',
        '/\b(impersonate|become)\s+(user|admin)\b/i',
    ];

    /** Write verbs that never become a proposal — they are refused with a safe alternative. */
    private const DANGEROUS_VERBS = [
        'delete', 'destroy', 'drop', 'void', 'approve', 'post ', 'reverse',
        'mark paid', 'mark as paid', 'close fiscal', 'reopen fiscal',
        'change role', 'change permission', 'change subscription',
    ];

    public function __construct(
        private readonly NeuronProviderFactory $providers,
    ) {}

    public function route(CopilotRequest $request, CopilotTrace $trace): CopilotRoutingDecision
    {
        $message = trim($request->message);

        if ($decision = $this->layerASafetyRules($message)) {
            $trace->step('router.layer_a', ['matched' => true]);

            return $decision;
        }

        if ($decision = $this->layerBExactPatterns($message)) {
            $trace->step('router.layer_b', ['matched' => true, 'intent' => $decision->intent->value]);

            return $decision;
        }

        $startedAt = microtime(true);

        try {
            $classification = $this->layerCClassify($request);
        } catch (Throwable $e) {
            // Fail closed: a routing failure must not silently become a
            // free-form model answer about accounting data. The cause is
            // classified so an operational problem (quota, outage, timeout) is
            // not reported to the user as "I did not understand you".
            [$code, $message] = $this->classifyRoutingFailure($e);

            $trace->step('router.layer_c', ['ok' => false, 'code' => $code], $startedAt);
            $trace->error($code, 'classification failed');

            throw new CopilotException($message, $code, $trace->requestId, $e);
        }

        $trace->step('router.layer_c', [
            'ok' => true,
            'intent' => $classification->intent->value,
            'confidence' => round($classification->confidence, 3),
        ], $startedAt);

        return $this->layerDConfidenceGate($classification, $trace);
    }

    /**
     * Distinguishes "the model could not classify this" from "the provider is
     * unavailable". Both fail closed, but they need different user messages and
     * different operational responses.
     *
     * @return array{0: string, 1: string} error code, user-facing message
     */
    private function classifyRoutingFailure(Throwable $e): array
    {
        $text = strtolower($e->getMessage().' '.($e->getPrevious()?->getMessage() ?? ''));

        // Status codes are matched with a word boundary: a bare str_contains on
        // "500" also matches a currency amount like 1500 in an error body.
        $hasStatus = static fn (string $code): bool => (bool) preg_match('/\b'.$code.'\b/', $text);

        return match (true) {
            $hasStatus('429'), str_contains($text, 'quota'), str_contains($text, 'rate limit') => [
                CopilotException::AI_RATE_LIMIT,
                'The AI provider is temporarily rate-limited. Please try again shortly.',
            ],
            str_contains($text, 'timed out'), str_contains($text, 'timeout') => [
                CopilotException::AI_TIMEOUT,
                'That took too long to process. Try a shorter question or try again.',
            ],
            $hasStatus('401'), $hasStatus('403'), str_contains($text, 'unauthorized'), str_contains($text, 'api key') => [
                CopilotException::AI_PROVIDER_AUTH_FAILED,
                'The AI provider rejected the configured credentials. Please contact the platform administrator.',
            ],
            $hasStatus('500'), $hasStatus('502'), $hasStatus('503'), str_contains($text, 'overloaded'), str_contains($text, 'temporarily unavailable') => [
                CopilotException::AI_RETRIEVAL_UNAVAILABLE,
                'The AI service is temporarily unavailable. Please try again shortly.',
            ],
            default => [
                CopilotException::AI_ROUTING_FAILED,
                'I could not understand that request well enough to answer safely. Please rephrase it.',
            ],
        };
    }

    /** Layer A — deterministic, model-free, fail closed. */
    private function layerASafetyRules(string $message): ?CopilotRoutingDecision
    {
        if ($message === '') {
            return CopilotRoutingDecision::clarification(
                ['message'],
                'The request was empty.',
                'safety_rules',
            );
        }

        if (mb_strlen($message) > 4000) {
            return CopilotRoutingDecision::blocked('The request is too long to process safely.');
        }

        foreach (self::PROHIBITED_PATTERNS as $pattern) {
            if (preg_match($pattern, $message)) {
                return CopilotRoutingDecision::blocked(
                    'That request asks for direct system or database access, which the Copilot cannot provide.'
                );
            }
        }

        $lower = mb_strtolower($message);

        foreach (self::DANGEROUS_VERBS as $verb) {
            if (str_contains($lower, $verb)) {
                return CopilotRoutingDecision::blocked(
                    'That is a high-risk accounting operation the Copilot will not perform. '
                    .'I can prepare a safer draft or point you to the correct workflow instead.'
                );
            }
        }

        return null;
    }

    /**
     * Layer B — only patterns that are unambiguous. Deliberately small: broad
     * phrase matching is what made the legacy routers unpredictable.
     */
    private function layerBExactPatterns(string $message): ?CopilotRoutingDecision
    {
        $trimmed = trim($message);

        // Document number such as INV-1004, PB-0007, SO-12.
        if (preg_match('/\b([A-Z]{2,6})-(\d{1,10})\b/', $trimmed, $m)) {
            return new CopilotRoutingDecision(
                intent: CopilotIntent::RecordLookup,
                confidence: 0.99,
                requiresLiveData: true,
                requiresKnowledge: false,
                candidateTools: ['records.find'],
                entities: [$m[0]],
                filters: ['reference' => $m[0]],
                missingFields: [],
                reason: 'Message contains an exact document reference.',
                decidedBy: 'exact_pattern',
                sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
            );
        }

        // Short greeting with no business content.
        if (preg_match('/^(hi|hello|hey|good (morning|afternoon|evening)|thanks|thank you)[!.\s]*$/i', $trimmed)) {
            return new CopilotRoutingDecision(
                intent: CopilotIntent::Greeting,
                confidence: 0.99,
                requiresLiveData: false,
                requiresKnowledge: false,
                candidateTools: [],
                entities: [],
                filters: [],
                missingFields: [],
                reason: 'Greeting with no business request.',
                decidedBy: 'exact_pattern',
                sourcePolicy: AnswerSourcePolicy::GeneralModelAllowed,
            );
        }

        return null;
    }

    /** Layer C — Neuron structured output. */
    private function layerCClassify(CopilotRequest $request): CopilotClassification
    {
        $agent = new CopilotRouterAgent($request->context, $this->providers->chat());

        $classification = $agent->structured(
            new UserMessage($request->message),
            CopilotClassification::class,
        );

        if (! $classification instanceof CopilotClassification) {
            throw new CopilotException(
                'Routing returned an unexpected shape.',
                CopilotException::AI_ROUTING_FAILED,
            );
        }

        return $classification;
    }

    /** Layer D — confidence gate, clarification, and server-side normalization. */
    private function layerDConfidenceGate(CopilotClassification $c, CopilotTrace $trace): CopilotRoutingDecision
    {
        $threshold = (float) config('ai.copilot.router_confidence_threshold', 0.55);
        $confidence = max(0.0, min(1.0, $c->confidence));

        $missing = array_values(array_filter(array_map(
            static fn ($f) => is_string($f) ? trim($f) : '',
            $c->missing_fields,
        )));

        if ($missing !== []) {
            $trace->step('router.layer_d', ['outcome' => 'clarification', 'reason' => 'missing_fields']);

            return CopilotRoutingDecision::clarification(
                $missing,
                $c->reason ?: 'I need one more detail before I can answer.',
                'confidence_gate',
                $confidence,
            );
        }

        // A vague business question is answered with a question, not a guess —
        // a wrong financial figure is worse than asking.
        if ($confidence < $threshold && $c->intent !== CopilotIntent::Greeting) {
            $trace->step('router.layer_d', [
                'outcome' => 'clarification',
                'reason' => 'below_threshold',
                'threshold' => $threshold,
            ]);

            return CopilotRoutingDecision::clarification(
                ['intent'],
                'I am not confident I understood that. Could you rephrase it, or tell me which area it relates to?',
                'confidence_gate',
                $confidence,
            );
        }

        $intent = $c->intent;

        // The intent's declared policy wins over the model's own opinion about
        // whether live data is needed. The model may not downgrade a balance
        // question into something answerable from indexed documents.
        $policy = $intent->sourcePolicy();
        $requiresLive = $intent->requiresLiveData() || $c->requires_live_data;

        $trace->step('router.layer_d', ['outcome' => 'accepted', 'intent' => $intent->value]);

        return new CopilotRoutingDecision(
            intent: $intent,
            confidence: $confidence,
            requiresLiveData: $requiresLive,
            requiresKnowledge: $c->requires_knowledge && $policy->allowsKnowledgeRetrieval(),
            candidateTools: $this->candidateToolsFor($intent, $c),
            entities: array_values(array_filter($c->entities, 'is_string')),
            filters: $this->normalizeFilters($c),
            missingFields: [],
            reason: $c->reason ?: null,
            decidedBy: 'model_classification',
            sourcePolicy: $policy,
        );
    }

    /**
     * Candidate tools are a suggestion for the executor. Actual availability is
     * still filtered by permission, and every tool re-authorizes on execution.
     *
     * @return string[]
     */
    private function candidateToolsFor(CopilotIntent $intent, CopilotClassification $c): array
    {
        return match ($intent) {
            CopilotIntent::RecordLookup => ['records.find', 'records.search'],
            CopilotIntent::ReportNavigation => ['reports.find'],
            CopilotIntent::AppHelp => ['knowledge.search'],
            CopilotIntent::ActionProposal => ['actions.propose'],
            CopilotIntent::MetricQuery => ['financial_metrics.query'],
            CopilotIntent::BusinessAnalysis => ['financial_metrics.query', 'knowledge.search'],
            default => [],
        };
    }

    /**
     * Normalizes model-supplied filters into server-controlled values. Anything
     * unrecognized is dropped rather than passed through.
     *
     * @return array<string, mixed>
     */
    private function normalizeFilters(CopilotClassification $c): array
    {
        $filters = [];

        if ($c->metric !== '') {
            $filters['metric'] = mb_substr($c->metric, 0, 60);
        }

        if ($c->module !== '' && $c->module !== 'general') {
            $filters['module'] = mb_substr($c->module, 0, 40);
        }

        if ($c->statuses !== []) {
            $filters['statuses'] = array_values(array_slice(
                array_filter($c->statuses, 'is_string'),
                0,
                10,
            ));
        }

        if ($range = $this->resolvePeriod($c->period_preset, $c->date_from, $c->date_to)) {
            $filters['date_range'] = $range;
        }

        if ($c->comparison_preset !== '' && $comparison = $this->resolvePeriod($c->comparison_preset, '', '')) {
            $filters['comparison_range'] = $comparison;
        }

        if ($c->group_by !== '') {
            $filters['group_by'] = mb_substr($c->group_by, 0, 40);
        }

        $filters['sort_direction'] = strtolower($c->sort_direction) === 'asc' ? 'asc' : 'desc';

        if ($c->limit > 0) {
            $filters['limit'] = min($c->limit, 200);
        }

        return $filters;
    }

    /**
     * Relative periods are resolved on the server against the request clock.
     * The model supplies a preset name only, never a computed boundary.
     *
     * @return array{from: string, to: string, preset: string}|null
     */
    private function resolvePeriod(string $preset, string $from, string $to): ?array
    {
        $preset = strtolower(trim($preset));
        $now = Carbon::now();

        $resolved = match ($preset) {
            'today' => [$now->copy()->startOfDay(), $now->copy()->endOfDay()],
            'this_month' => [$now->copy()->startOfMonth(), $now->copy()->endOfMonth()],
            'last_month' => [$now->copy()->subMonthNoOverflow()->startOfMonth(), $now->copy()->subMonthNoOverflow()->endOfMonth()],
            'this_quarter' => [$now->copy()->startOfQuarter(), $now->copy()->endOfQuarter()],
            'this_year' => [$now->copy()->startOfYear(), $now->copy()->endOfYear()],
            'last_year' => [$now->copy()->subYear()->startOfYear(), $now->copy()->subYear()->endOfYear()],
            default => null,
        };

        if ($resolved === null && $from === '' && $to === '') {
            return null;
        }

        if ($resolved === null) {
            try {
                $start = $from !== '' ? Carbon::parse($from)->startOfDay() : $now->copy()->startOfMonth();
                $end = $to !== '' ? Carbon::parse($to)->endOfDay() : $now->copy()->endOfDay();
            } catch (Throwable) {
                return null;
            }

            $resolved = [$start, $end];
            $preset = 'custom';
        }

        return [
            'from' => $resolved[0]->toDateString(),
            'to' => $resolved[1]->toDateString(),
            'preset' => $preset ?: 'custom',
        ];
    }
}
