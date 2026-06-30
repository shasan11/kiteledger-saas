<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiPendingAction;
use App\Models\AiToolCall;
use App\Services\AI\Agent\AiActionProposalService;
use App\Services\AI\Agent\AiAgentIntentService;
use App\Services\AI\Agent\AiAnswerComposer;
use App\Services\AI\Agent\AiDeterministicAnswerService;
use App\Services\AI\Agent\AiRecordSearchService;
use App\Services\AI\Agent\AiReportResolver;
use App\Services\AI\AiAssistantContext;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiPromptBuilder;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiResponseCacheService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use App\Services\AI\Assistant\AiFinancialAnswerService;
use App\Services\AI\Rag\AiGroundedAnswerService;
use App\Services\AI\Rag\AiRagRetriever;
use App\Services\AI\Rag\AiSourceSanitizer;
use App\Services\AI\Tools\AiToolRouter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Throwable;

class AiAgentChatController extends Controller
{
    public function __construct(
        protected AiSettingsService $settings,
        protected AiPermissionService $permissions,
        protected AiProviderManager $provider,
        protected AiAssistantContext $contextBuilder,
        protected AiPromptBuilder $prompts,
        protected AiResponseCacheService $cache,
        protected AiUsageLogger $usage,
        protected AiAgentIntentService $intentResolver,
        protected AiRecordSearchService $recordSearch,
        protected AiReportResolver $reportResolver,
        protected AiActionProposalService $proposalService,
        protected AiDeterministicAnswerService $deterministicAnswers,
        protected AiToolRouter $toolRouter,
        protected AiFinancialAnswerService $financialAnswers,
        protected AiRagRetriever $rag,
        protected AiAnswerComposer $answerComposer,
        protected AiGroundedAnswerService $groundedAnswers,
        protected AiSourceSanitizer $sourceSanitizer,
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $this->permissions->canChat($user)) {
            return $this->denied('ai.chat');
        }

        $data = $request->validate([
            'message' => 'required|string|max:4000',
            'conversation_id' => 'nullable|string',
            'context_type' => 'nullable|string|max:60',
            'context_payload' => 'nullable|array',
            'cache' => 'nullable|boolean',
        ]);

        $message = trim($data['message']);
        $payload = $data['context_payload'] ?? [];
        $toolClassification = $this->toolRouter->classify($message, $payload);
        $intent = in_array($toolClassification['type'] ?? '', ['query', 'report', 'action'], true)
            ? $toolClassification
            : $this->intentResolver->resolve($message, $payload);
        $contextType = ($data['context_type'] ?? 'auto') === 'auto'
            ? $this->contextTypeForIntent($intent)
            : ($data['context_type'] ?? 'general');

        $context = $this->contextBuilder->build($request, $contextType, array_merge($payload, [
            'detected_intent' => $intent,
        ]));
        $branchScope = $context['branch_scope'] ?? [];

        $conversation = $this->resolveConversation(
            $data['conversation_id'] ?? null,
            $user,
            $contextType,
            $branchScope['branch_id'] ?? null,
            $message,
        );

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $message,
            'context' => ['type' => $contextType, 'intent' => $intent],
        ]);

        if (! in_array($toolClassification['type'] ?? null, ['report', 'query'], true) && $displayAnswer = $this->financialAnswers->answer($request, $message, $payload)) {
            $financialIntent = [
                'type' => 'controlled_business_answer',
                'tool' => $this->compatToolName($displayAnswer['intent'] ?? null, $displayAnswer['selected_tool'] ?? null),
                'name' => $displayAnswer['intent'] ?? 'financial_summary',
                'module' => 'accounting',
                'source' => 'journal_entries',
            ];

            $this->usage->log([
                'user_id' => $user?->id,
                'branch_id' => $branchScope['branch_id'] ?? null,
                'module' => 'accounting',
                'status' => 'success',
                'question' => $message,
                'intent' => $financialIntent['name'],
                'selected_tool' => $financialIntent['tool'],
                'filters' => $displayAnswer['filters'] ?? [],
                'date_range' => array_filter([
                    'from' => $displayAnswer['filters']['date_from'] ?? null,
                    'to' => $displayAnswer['filters']['date_to'] ?? null,
                ]),
                'row_count' => collect($displayAnswer['tables'] ?? [])->sum(fn ($table) => count($table['rows'] ?? [])),
                'token_estimate' => mb_strlen(json_encode($displayAnswer)) / 4,
            ]);

            return $this->storeAndRespond(
                $conversation,
                (string) ($displayAnswer['message'] ?? 'I prepared the requested answer.'),
                $financialIntent,
                'accounting',
                $branchScope,
                [],
                [$this->compatResult($displayAnswer, $financialIntent)],
                $displayAnswer,
            );
        }

        if (($toolClassification['type'] ?? null) === 'query') {
            $toolRequest = $request->merge(['message' => $message]);
            $started = microtime(true);
            $result = $this->toolRouter->runQuery($toolRequest, $toolClassification);
            $reply = $this->toolRouter->explainToolResult($result);
            $this->logToolCall($conversation, $user, $toolClassification['tool'] ?? 'query', ['message' => $message], ['record_count' => count($result['records'] ?? [])], 'completed', $started);

            return $this->storeAndRespond(
                $conversation,
                $reply,
                $toolClassification,
                $contextType,
                $branchScope,
                [],
                [$result],
                $this->deterministicDisplay($result, $reply),
            );
        }

        if (($toolClassification['type'] ?? null) === 'report') {
            $started = microtime(true);
            $result = $this->toolRouter->runReport($request, $toolClassification, $message);
            $reply = $this->toolRouter->explainToolResult($result);
            $this->logToolCall($conversation, $user, $toolClassification['tool'] ?? 'report', ['message' => $message], ['report_key' => $result['report_key'] ?? null], 'completed', $started);

            $reportSources = empty($result['matched']) ? [] : [[
                'key' => 'report-'.($result['report_key'] ?? 'result'),
                'label' => $result['title'] ?? 'Report',
                'type' => 'Report',
                'module' => $result['category'] ?? 'Reports',
                'route' => strtok((string) ($result['open_url'] ?? '/reports'), '?'),
                'match_label' => 'Exact match',
            ]];

            return $this->storeAndRespond(
                $conversation,
                $reply,
                $toolClassification,
                $contextType,
                $branchScope,
                [],
                [$result],
                $this->deterministicDisplay($result, $reply),
                $reportSources,
            );
        }

        if (($toolClassification['type'] ?? null) === 'action') {
            // Dangerous / disabled writes never become a pending action — explain
            // the safe path instead (spec §12).
            if (($toolClassification['tool'] ?? null) === 'action.blocked') {
                $this->logToolCall($conversation, $user, 'action.blocked', ['message' => $message], ['reason' => $toolClassification['reason'] ?? null], 'blocked');

                return $this->storeAndRespond($conversation, $this->blockedActionReply($message, $toolClassification), array_merge($toolClassification, ['name' => 'blocked_action']), $contextType, $branchScope, [], []);
            }

            $action = $this->toolRouter->proposeAction($request, $conversation, $toolClassification, $message, $payload);
            $this->logToolCall($conversation, $user, $toolClassification['tool'] ?? 'action', ['message' => $message], ['pending_action_id' => $action->id, 'risk_level' => $action->risk_level], 'completed');

            return $this->storeAndRespond($conversation, $this->actionReply($action), $toolClassification, $contextType, $branchScope, [$this->formatAction($action)], []);
        }

        if ($deterministic = $this->deterministicAnswers->answer($request, $message)) {
            return $this->storeAndRespond(
                $conversation,
                $deterministic['reply'],
                array_merge($intent, ['name' => 'deterministic_database_answer', 'source' => 'database']),
                $contextType,
                $branchScope,
                [],
                [$deterministic['result']],
            );
        }

        if (($intent['name'] ?? null) === 'search_records') {
            $result = $this->recordSearch->search($request, $intent['module'] ?? 'records', $message);

            return $this->storeAndRespond($conversation, 'Here are the matching records.', $intent, $contextType, $branchScope, [], array_filter([$result]));
        }

        if (($intent['name'] ?? null) === 'show_report') {
            $result = $this->reportResolver->resolve($request, $message);

            return $this->storeAndRespond($conversation, 'Here is the report I found.', $intent, $contextType, $branchScope, [], [$result]);
        }

        if (in_array($intent['name'] ?? '', ['create_record', 'update_record'], true)) {
            $action = $this->proposalService->propose($request, $conversation, $intent, $message, $payload);
            $this->logToolCall($conversation, $user, $action->action_type, ['message' => $message], ['pending_action_id' => $action->id, 'risk_level' => $action->risk_level], 'completed');

            return $this->storeAndRespond($conversation, $this->actionReply($action), $intent, $contextType, $branchScope, [$this->formatAction($action)], []);
        }

        // Every read-only ERP question gets hybrid retrieval unless a
        // deterministic tool already supplied the complete answer.
        if ($this->shouldUseRag($message, $toolClassification, $intent)) {
            $retrieval = $this->rag->retrieveWithContext($user, $message, [
                'branch_id' => $branchScope['branch_id'] ?? $user?->branch_id,
                'fiscal_year_id' => $branchScope['fiscal_year_id'] ?? null,
                'context_payload' => $payload,
                'embedding_model' => $this->settings->embeddingModel(),
            ]);

            if ($retrieval['understanding']['use_retrieval'] ?? false) {
                $answer = $this->groundedAnswers->answer($message, $retrieval);
                $reply = trim($answer['body'] ?: $answer['headline']);
                $this->logToolCall($conversation, $user, 'rag.hybrid_retrieval', ['query' => $message], ['count' => count($retrieval['sources'])], 'completed');
                $ragIntent = array_merge($intent, [
                    'type' => 'rag_query',
                    'name' => $retrieval['understanding']['intent'],
                    'source' => 'rag',
                    'module' => $intent['module'] ?? 'records',
                ]);

                $debug = $this->permissions->canViewDebug($user) ? [
                    'provider' => $this->settings->provider(),
                    'model' => $this->settings->model(),
                    'embedding_model' => $this->settings->embeddingModel(),
                    'query_plan' => $retrieval['understanding'],
                    'retrieval_ms' => $retrieval['duration_ms'],
                    'candidates' => $this->sourceSanitizer->debug($retrieval['candidates']),
                ] : null;

                return $this->storeAndRespond(
                    $conversation,
                    $reply,
                    $ragIntent,
                    $contextType,
                    $branchScope,
                    [],
                    [],
                    ['answer' => $answer, 'followups' => $answer['followups']],
                    $retrieval['sources'],
                    $debug,
                );
            }
        }

        $cacheKey = $this->cache->key($user?->id, $branchScope['branch_id'] ?? null, $message, $context);
        $useCache = ($data['cache'] ?? true) && empty($payload['private']);
        if ($useCache && ($cached = $this->cache->get($cacheKey))) {
            return response()->json(array_merge($cached, ['cached' => true]));
        }

        $history = $conversation->messages()
            ->orderBy('created_at')
            ->limit(20)
            ->get(['role', 'content'])
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        $messages = $this->prompts->build($message, $context, $history);
        $startedAt = microtime(true);

        try {
            $providerResult = $this->provider->chat($messages);
        } catch (AiProviderException $e) {
            $this->usage->log([
                'user_id' => $user?->id,
                'branch_id' => $branchScope['branch_id'] ?? null,
                'module' => $contextType,
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'status' => 'error',
                'error_message' => $e->getErrorCode().': '.$e->getMessage(),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);

            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => $e->getErrorCode(),
                'conversation_id' => $this->conversationToken($conversation),
            ], 422);
        } catch (Throwable $e) {
            report($e);

            return response()->json([
                'ok' => false,
                'message' => 'AI request failed unexpectedly. Please try again.',
                'code' => 'AI_PROVIDER_ERROR',
                'conversation_id' => $this->conversationToken($conversation),
            ], 500);
        }

        $reply = trim((string) ($providerResult['text'] ?? '')) ?: 'I could not generate a reply.';

        $this->usage->log([
            'user_id' => $user?->id,
            'branch_id' => $branchScope['branch_id'] ?? null,
            'module' => $contextType,
            'provider' => $providerResult['provider'] ?? null,
            'model' => $providerResult['model'] ?? null,
            'prompt_tokens' => (int) ($providerResult['usage']['prompt'] ?? 0),
            'completion_tokens' => (int) ($providerResult['usage']['completion'] ?? 0),
            'total_tokens' => (int) ($providerResult['usage']['total'] ?? 0),
            'status' => 'success',
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'request_hash' => $cacheKey,
        ]);

        $debug = $this->permissions->canViewDebug($user) ? [
            'provider' => $providerResult['provider'] ?? null,
            'model' => $providerResult['model'] ?? null,
        ] : null;
        $response = $this->responsePayload($conversation, $reply, $intent, $contextType, $branchScope, [], [], [], [], [], $debug);

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'context' => ['type' => $contextType, 'intent' => $intent],
            'provider' => $providerResult['provider'] ?? null,
            'model' => $providerResult['model'] ?? null,
            'tokens_input' => $providerResult['usage']['prompt'] ?? null,
            'tokens_output' => $providerResult['usage']['completion'] ?? null,
        ]);

        if ($useCache) {
            $this->cache->put($cacheKey, $response);
        }

        return response()->json($response);
    }

    private function storeAndRespond(AiConversation $conversation, string $reply, array $intent, string $contextType, array $branchScope, array $actions, array $results, array $display = [], array $sources = [], ?array $debug = null): JsonResponse
    {
        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'context' => ['type' => $contextType, 'intent' => $intent, 'actions' => count($actions), 'results' => count($results), 'sources' => count($sources), 'display' => $display],
        ]);

        return response()->json($this->responsePayload($conversation, $reply, $intent, $contextType, $branchScope, $actions, array_values($results), [], $display, $sources, $debug));
    }

    private function responsePayload(AiConversation $conversation, string $reply, array $intent, string $contextType, array $branchScope, array $actions, array $results, array $extra = [], array $display = [], array $sources = [], ?array $debug = null): array
    {
        $mode = 'chat';
        if (! empty($actions)) {
            $mode = 'pending_action';
        } elseif (! empty($results)) {
            $mode = ($results[0]['type'] ?? null) === 'report' ? 'report' : 'tool_query';
        } elseif (! empty($sources)) {
            $mode = 'rag';
        }

        $answer = $display['answer'] ?? [
            'headline' => $this->headline($reply),
            'body' => $reply,
            'bullets' => [],
            'limitations' => [],
            'confidence' => 'medium',
            'confidence_label' => 'Medium confidence',
        ];
        $canDebug = $this->permissions->canViewDebug(request()->user());
        $publicDisplay = $canDebug ? $display : $this->sanitizePublicData($display);

        $payload = [
            'ok' => true,
            'mode' => $mode,
            'conversation_id' => $this->conversationToken($conversation),
            'message' => ['role' => 'assistant', 'content' => $reply],
            'answer' => $canDebug ? $answer : $this->sanitizePublicData($answer),
            'actions' => $actions,
            'sources' => $canDebug ? $sources : $this->sanitizePublicData($sources),
            'display' => $publicDisplay,
            'answer_type' => $publicDisplay['answer_type'] ?? null,
            'cards' => $publicDisplay['cards'] ?? [],
            'tables' => $publicDisplay['tables'] ?? [],
            'warnings' => $publicDisplay['warnings'] ?? [],
            'source_note' => $publicDisplay['source_note'] ?? null,
            'followups' => $publicDisplay['followups'] ?? [],
            'cached' => false,
            'debug' => $canDebug ? $debug : null,
        ];

        if ($canDebug) {
            $payload['debug'] = array_merge($debug ?? [], ['conversation_id' => $conversation->id]);
            $payload['intent'] = $intent;
            $payload['context'] = ['type' => $contextType, 'packs' => [$contextType]];
            $payload['results'] = $results;
            $payload['branch_scope'] = $branchScope;
        }

        return array_merge($payload, $extra);
    }

    /**
     * Deterministic tools take priority. Remaining read-only questions retrieve
     * first; greetings and clearly unrelated requests are classified downstream.
     */
    private function shouldUseRag(string $message, array $toolClassification, array $intent): bool
    {
        if (! $this->rag->available()) {
            return false;
        }

        if (in_array($toolClassification['type'] ?? null, ['query', 'report', 'action'], true)) {
            return false;
        }

        if (in_array($intent['name'] ?? null, ['create_record', 'update_record', 'show_report'], true)) {
            return false;
        }

        return trim($message) !== '';
    }

    private function headline(string $reply): string
    {
        $line = trim(strtok($reply, "\n") ?: $reply);

        return mb_strlen($line) > 140 ? mb_substr($line, 0, 137).'...' : $line;
    }

    private function deterministicDisplay(array $result, string $reply): array
    {
        return [
            'answer' => [
                'headline' => trim((string) ($result['title'] ?? 'KiteLedger result')),
                'body' => $this->sourceSanitizer->sanitizeText($reply),
                'bullets' => [],
                'limitations' => [],
                'confidence' => 'high',
                'confidence_label' => 'Verified from your data',
            ],
        ];
    }

    private function sanitizePublicData(mixed $value, ?string $key = null): mixed
    {
        if ($key && (
            $key === 'id' || str_ends_with($key, '_id') ||
            in_array($key, ['provider', 'model', 'tool', 'source_public_id', 'embedding', 'vector', 'raw'], true)
        )) {
            return null;
        }

        if (is_array($value)) {
            $clean = [];
            foreach ($value as $childKey => $childValue) {
                $sanitized = $this->sanitizePublicData($childValue, is_string($childKey) ? $childKey : null);
                if ($sanitized !== null) {
                    $clean[$childKey] = $sanitized;
                }
            }

            return $clean;
        }

        if (is_string($value)) {
            if (in_array($key, ['route', 'open_url', 'url'], true) && $this->sourceSanitizer->containsUuid($value)) {
                return null;
            }

            return $this->sourceSanitizer->sanitizeText($value);
        }

        return $value;
    }

    /**
     * Persist a deterministic tool / action / RAG invocation for traceability.
     */
    private function logToolCall(AiConversation $conversation, $user, string $tool, array $input, array $output, string $status = 'completed', ?float $startedAt = null): void
    {
        try {
            AiToolCall::create([
                'ai_conversation_id' => $conversation->id,
                'user_id' => $user?->id,
                'tool_name' => $tool,
                'input' => $input,
                'output' => $output,
                'status' => $status,
                'duration_ms' => $startedAt ? (int) round((microtime(true) - $startedAt) * 1000) : null,
            ]);
        } catch (Throwable) {
            // Tool-call logging must never break the chat response.
        }
    }

    private function actionReply(AiPendingAction $action): string
    {
        if (! empty($action->metadata['missing_fields'])) {
            return $this->clarificationReply($action);
        }

        if (in_array($action->risk_level, ['high', 'critical'], true)) {
            $phrase = $action->metadata['confirmation_text'] ?? 'CONFIRM';

            return "This is a {$action->risk_level}-risk action that changes financial data. Review it carefully, then type \"{$phrase}\" to confirm before I apply it.";
        }

        return 'I prepared a draft for your approval. Please review and approve before I create it.';
    }

    /**
     * Friendly explanation for a blocked dangerous/disabled write (spec §12).
     */
    private function blockedActionReply(string $message, array $classification): string
    {
        $reason = (string) ($classification['reason'] ?? '');

        if (str_contains($reason, 'disabled')) {
            return 'AI write actions are turned off in AI Settings, so I can only read and summarize data right now. Ask an administrator to enable them if you need me to prepare drafts.';
        }

        $m = mb_strtolower($message);

        if (str_contains($m, 'delete') || str_contains($m, 'remove')) {
            return 'I can’t delete records — that would damage your accounting history. If your permissions allow it, I can prepare a void/reversal instead. Want me to do that?';
        }

        if (str_contains($m, 'void')) {
            return 'Voiding is a high-risk action I won’t do automatically. Open the record and use the void workflow, or ask an approver to prepare a void with explicit confirmation.';
        }

        if (str_contains($m, 'mark paid') || str_contains($m, 'paid')) {
            return 'I won’t mark invoices paid automatically — that posts money movements. I can prepare a customer-payment draft for your review instead. Shall I?';
        }

        if (str_contains($m, 'approve') || str_contains($m, 'post ')) {
            return 'Approving/posting is a controlled step I won’t perform automatically. Please approve it through the normal workflow so the right validations and audit trail apply.';
        }

        if (str_contains($m, 'fiscal year')) {
            return 'Closing or reopening a fiscal year is a critical action I won’t perform. Please use the fiscal-year settings with the appropriate permissions.';
        }

        return 'That’s a high-risk operation I can’t perform directly. I can help you prepare a safer draft or open the relevant screen instead.';
    }

    private function clarificationReply(AiPendingAction $action): string
    {
        $first = $action->metadata['missing_fields'][0] ?? null;
        $reason = is_array($first) ? ($first['reason'] ?? null) : null;
        $options = is_array($first) ? ($first['options'] ?? []) : [];

        if (! empty($options)) {
            $names = collect($options)->pluck('name')->filter()->take(6)->implode(', ');

            return trim(($reason ? $reason.' ' : '').'Which one should I use? '.$names);
        }

        return $reason ?: 'I need a little more detail before I can prepare this. What should I fill in?';
    }

    private function compatToolName(?string $intent, ?string $tool): ?string
    {
        return match ($intent) {
            'cash_bank_summary' => 'journal_voucher.cash_balance',
            'profit_and_loss' => 'profit_loss_tool',
            'receivable_summary' => 'receivable.total',
            'payable_summary' => 'payable.total',
            default => $tool,
        };
    }

    private function compatResult(array $display, array $intent): array
    {
        $records = [];
        if (($display['intent'] ?? null) === 'cash_bank_summary') {
            $cash = collect($display['cards'] ?? [])->firstWhere('label', 'Cash Balance');
            $bank = collect($display['cards'] ?? [])->firstWhere('label', 'Bank Balance');
            $records[] = [
                'account' => 'Cash and Bank',
                'cash_balance' => $cash['value'] ?? 0,
                'bank_balance' => $bank['value'] ?? 0,
                'balance' => $cash['value'] ?? 0,
            ];
        } elseif (! empty($display['tables'][0]['rows'])) {
            $records = array_slice($display['tables'][0]['rows'], 0, 20);
        } elseif (! empty($display['cards'])) {
            $records[] = collect($display['cards'])->mapWithKeys(fn ($card) => [strtolower(str_replace(' ', '_', $card['label'])) => $card['value']])->all();
        }

        return [
            'type' => 'query_result',
            'tool' => $intent['tool'] ?? null,
            'title' => $display['answer_type'] ?? 'AI Assistant Answer',
            'summary' => $display['message'] ?? null,
            'records' => $records,
            'filters' => $display['filters'] ?? [],
            'source' => 'journal_entries',
        ];
    }

    private function formatAction(AiPendingAction $action): array
    {
        $metadata = is_array($action->metadata) ? $action->metadata : [];

        return [
            'id' => $action->id,
            'action_type' => $action->action_type,
            'module' => $action->module,
            'title' => $action->title,
            'summary' => $action->summary,
            'payload' => $action->payload,
            'preview' => $metadata['preview'] ?? null,
            'risk_level' => $action->risk_level,
            'risk_reasons' => $action->risk_reasons ?? [],
            'missing_fields' => $metadata['missing_fields'] ?? [],
            'requires_confirmation' => $metadata['requires_confirmation'] ?? in_array($action->risk_level, ['high', 'critical'], true),
            'confirmation_text' => $metadata['confirmation_text'] ?? null,
            'status' => $action->status,
            'requires_approval' => true,
        ];
    }

    private function contextTypeForIntent(array $intent): string
    {
        $module = $intent['module'] ?? 'general';

        return match ($module) {
            'invoices', 'quotations', 'sales_orders', 'customer_payments', 'credit_notes' => 'sales',
            'purchase_orders', 'purchase_bills', 'supplier_payments', 'debit_notes', 'expenses' => 'purchase',
            'products', 'warehouse_transfers', 'inventory_adjustments' => 'inventory',
            'journal_vouchers', 'cash_transfers', 'reports' => 'accounting',
            default => 'general',
        };
    }

    private function resolveConversation(?string $id, $user, ?string $module, ?string $branchId, ?string $firstMessage): AiConversation
    {
        if ($id) {
            $internalId = $this->decodeConversationToken($id);
            $existing = $internalId ? AiConversation::query()->where('id', $internalId)->where('user_id', $user->id)->first() : null;
            if ($existing) {
                return $existing;
            }
        }

        return AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => $branchId,
            'module' => $module,
            'title' => $firstMessage ? mb_substr(trim(preg_replace('/\s+/', ' ', $firstMessage)), 0, 80) : null,
            'status' => 'active',
        ]);
    }

    protected function conversationToken(AiConversation $conversation): string
    {
        return 'conv_'.Crypt::encryptString((string) $conversation->id);
    }

    protected function decodeConversationToken(string $token): ?string
    {
        if (str_starts_with($token, 'conv_')) {
            try {
                return Crypt::decryptString(substr($token, 5));
            } catch (Throwable) {
                return null;
            }
        }

        // Backward compatibility for conversations opened before this upgrade.
        return preg_match('/^[0-9a-f-]{36}$/i', $token) ? $token : null;
    }

    protected function denied(string $perm): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'message' => 'You do not have permission to use AI Assistant.',
            'code' => 'AI_PERMISSION_DENIED',
            'required_permission' => $perm,
        ], 403);
    }
}
