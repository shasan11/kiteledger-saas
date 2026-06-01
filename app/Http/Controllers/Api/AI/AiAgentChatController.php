<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\AI\Agent\AiActionProposalService;
use App\Services\AI\Agent\AiAgentIntentService;
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
use App\Services\AI\Tools\AiToolRouter;
use App\Services\AI\AiUsageLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
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
    ) {}

    public function chat(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canChat($user)) {
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

        if (($toolClassification['type'] ?? null) === 'query') {
            $toolRequest = $request->merge(['message' => $message]);
            $result = $this->toolRouter->runQuery($toolRequest, $toolClassification);
            $reply = $this->toolRouter->explainToolResult($result);

            return $this->storeAndRespond($conversation, $reply, $toolClassification, $contextType, $branchScope, [], [$result]);
        }

        if (($toolClassification['type'] ?? null) === 'report') {
            $result = $this->toolRouter->runReport($request, $toolClassification, $message);
            $reply = $this->toolRouter->explainToolResult($result);

            return $this->storeAndRespond($conversation, $reply, $toolClassification, $contextType, $branchScope, [], [$result]);
        }

        if (($toolClassification['type'] ?? null) === 'action') {
            $action = $this->toolRouter->proposeAction($request, $conversation, $toolClassification, $message, $payload);

            return $this->storeAndRespond($conversation, 'I prepared an action for your approval.', $toolClassification, $contextType, $branchScope, [$this->formatAction($action)], []);
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
            return $this->storeAndRespond($conversation, 'I prepared an action for your approval.', $intent, $contextType, $branchScope, [$this->formatAction($action)], []);
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
                'error_message' => $e->getErrorCode() . ': ' . $e->getMessage(),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);

            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => $e->getErrorCode(),
                'conversation_id' => $conversation->id,
            ], 422);
        } catch (Throwable $e) {
            report($e);
            return response()->json([
                'ok' => false,
                'message' => 'AI request failed unexpectedly. Please try again.',
                'code' => 'AI_PROVIDER_ERROR',
                'conversation_id' => $conversation->id,
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

        $response = $this->responsePayload($conversation, $reply, $intent, $contextType, $branchScope, [], [], [
            'provider' => $providerResult['provider'] ?? null,
            'model' => $providerResult['model'] ?? null,
        ]);

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

    private function storeAndRespond(AiConversation $conversation, string $reply, array $intent, string $contextType, array $branchScope, array $actions, array $results): JsonResponse
    {
        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'context' => ['type' => $contextType, 'intent' => $intent, 'actions' => count($actions), 'results' => count($results)],
        ]);

        return response()->json($this->responsePayload($conversation, $reply, $intent, $contextType, $branchScope, $actions, array_values($results)));
    }

    private function responsePayload(AiConversation $conversation, string $reply, array $intent, string $contextType, array $branchScope, array $actions, array $results, array $extra = []): array
    {
        $mode = 'chat';
        if (!empty($actions)) {
            $mode = 'pending_action';
        } elseif (!empty($results)) {
            $mode = ($results[0]['type'] ?? null) === 'report' ? 'report' : 'tool_query';
        }

        return array_merge([
            'ok' => true,
            'mode' => $mode,
            'conversation_id' => $conversation->id,
            'message' => ['role' => 'assistant', 'content' => $reply],
            'tool' => !empty($results) || !empty($actions) ? [
                'name' => $intent['tool'] ?? $intent['name'] ?? null,
                'source' => $results[0]['source'] ?? (!empty($actions) ? 'action' : null),
            ] : null,
            'intent' => $intent,
            'context' => ['type' => $contextType, 'packs' => [$contextType]],
            'actions' => $actions,
            'results' => $results,
            'branch_scope' => $branchScope,
            'cached' => false,
        ], $extra);
    }

    private function formatAction($action): array
    {
        return [
            'id' => $action->id,
            'action_type' => $action->action_type,
            'module' => $action->module,
            'title' => $action->title,
            'summary' => $action->summary,
            'payload' => $action->payload,
            'risk_level' => $action->risk_level,
            'risk_reasons' => $action->risk_reasons ?? [],
            'missing_fields' => $action->metadata['missing_fields'] ?? [],
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
            $existing = AiConversation::query()->where('id', $id)->where('user_id', $user->id)->first();
            if ($existing) return $existing;
        }

        return AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => $branchId,
            'module' => $module,
            'title' => $firstMessage ? mb_substr(trim(preg_replace('/\s+/', ' ', $firstMessage)), 0, 80) : null,
            'status' => 'active',
        ]);
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
