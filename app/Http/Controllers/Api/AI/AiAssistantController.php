<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Services\AI\AiAssistantContext;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiPromptBuilder;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiResponseCacheService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiAssistantController extends Controller
{
    public function __construct(
        protected AiSettingsService $settings,
        protected AiPermissionService $permissions,
        protected AiProviderManager $provider,
        protected AiAssistantContext $contextBuilder,
        protected AiPromptBuilder $prompts,
        protected AiResponseCacheService $cache,
        protected AiUsageLogger $usage,
    ) {}

    public function health(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canUseAi($user)) {
            return $this->denied('ai.use');
        }

        return response()->json([
            'ok' => true,
            'ai_enabled' => $this->settings->enabled(),
            'provider_configured' => $this->settings->hasApiKey() || $this->settings->provider() === 'ollama',
            'provider' => $this->settings->provider(),
            'model' => $this->settings->model(),
            'stream_enabled' => $this->settings->streamEnabled(),
            'cache_enabled' => $this->settings->cacheEnabled(),
            'fast_mode' => $this->settings->fastMode(),
            'permissions' => $this->permissions->summary($user),
        ]);
    }

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

        $contextType = $data['context_type'] ?? 'general';
        $payload = $data['context_payload'] ?? [];

        $context = $this->contextBuilder->build($request, $contextType, $payload);

        $branchScope = $context['branch_scope'] ?? [];
        $cacheKey = $this->cache->key($user?->id, $branchScope['branch_id'] ?? null, $data['message'], $context);

        $useCache = ($data['cache'] ?? true) && empty($payload['private']);
        if ($useCache) {
            if ($cached = $this->cache->get($cacheKey)) {
                return response()->json(array_merge($cached, ['cached' => true]));
            }
        }

        $conversation = $this->resolveConversation(
            $data['conversation_id'] ?? null,
            $user,
            $contextType,
            $branchScope['branch_id'] ?? null,
            $data['message'],
        );

        $history = $conversation->messages()
            ->orderBy('created_at')
            ->limit(20)
            ->get(['role', 'content'])
            ->map(fn ($m) => ['role' => $m->role, 'content' => $m->content])
            ->toArray();

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $data['message'],
            'context' => ['type' => $contextType],
        ]);

        $messages = $this->prompts->build($data['message'], $context, $history);

        $startedAt = microtime(true);
        try {
            $result = $this->provider->chat($messages);
        } catch (AiProviderException $e) {
            $this->usage->log([
                'user_id' => $user?->id,
                'branch_id' => $branchScope['branch_id'] ?? null,
                'module' => $contextType,
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'status' => $e->getErrorCode() === 'AI_TIMEOUT' ? 'error' : 'error',
                'error_message' => $e->getErrorCode() . ': ' . $e->getMessage(),
                'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            ]);
            $status = in_array($e->getErrorCode(), [
                'AI_PROVIDER_AUTH_FAILED', 'AI_API_KEY_MISSING',
                'AI_PROVIDER_MISSING', 'AI_MODEL_MISSING',
            ], true) ? 422 : 422;
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
                'code' => $e->getErrorCode(),
                'conversation_id' => $conversation->id,
            ], $status);
        } catch (Throwable $e) {
            \Log::error('AI chat unexpected error', ['error' => $e->getMessage()]);
            return response()->json([
                'ok' => false,
                'message' => 'AI request failed unexpectedly. Please try again.',
                'code' => 'AI_PROVIDER_ERROR',
                'conversation_id' => $conversation->id,
            ], 500);
        }

        $reply = $result['text'] ?? '';

        $this->usage->log([
            'user_id' => $user?->id,
            'branch_id' => $branchScope['branch_id'] ?? null,
            'module' => $contextType,
            'provider' => $result['provider'] ?? null,
            'model' => $result['model'] ?? null,
            'prompt_tokens' => (int) ($result['usage']['prompt'] ?? 0),
            'completion_tokens' => (int) ($result['usage']['completion'] ?? 0),
            'total_tokens' => (int) ($result['usage']['total'] ?? 0),
            'status' => 'success',
            'duration_ms' => (int) round((microtime(true) - $startedAt) * 1000),
            'request_hash' => $cacheKey ?? null,
        ]);

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'assistant',
            'content' => $reply,
            'context' => ['type' => $contextType],
            'provider' => $result['provider'] ?? null,
            'model' => $result['model'] ?? null,
            'tokens_input' => $result['usage']['prompt'] ?? null,
            'tokens_output' => $result['usage']['completion'] ?? null,
        ]);

        $response = [
            'ok' => true,
            'conversation_id' => $conversation->id,
            'message' => ['role' => 'assistant', 'content' => $reply],
            'provider' => $result['provider'] ?? null,
            'model' => $result['model'] ?? null,
            'branch_scope' => $branchScope,
            'cached' => false,
        ];

        if ($useCache) {
            $this->cache->put($cacheKey, $response);
        }

        return response()->json($response);
    }

    public function stream(Request $request): JsonResponse
    {
        // Streaming would require a Symfony StreamedResponse; for now use the
        // non-streaming chat handler. Frontend supports both.
        return $this->chat($request);
    }

    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.conversations.view', 'ai.use', 'ai.manage'])) {
            return $this->denied('ai.conversations.view');
        }

        $list = AiConversation::query()
            ->where('user_id', $user->id)
            ->orderByDesc('updated_at')
            ->limit(50)
            ->get(['id', 'title', 'module', 'status', 'updated_at']);

        return response()->json(['conversations' => $list]);
    }

    public function showConversation(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $conversation = AiConversation::query()->where('id', $id)->first();
        if (!$conversation) abort(404);
        if ($conversation->user_id !== $user->id && !$this->permissions->canManage($user)) {
            return $this->denied('ai.conversations.view');
        }

        $messages = $conversation->messages()->orderBy('created_at')->get();

        return response()->json([
            'conversation' => $conversation,
            'messages' => $messages,
        ]);
    }

    public function deleteConversation(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $conversation = AiConversation::query()->where('id', $id)->first();
        if (!$conversation) abort(404);

        $isOwner = $conversation->user_id === $user->id;
        $canManage = $this->permissions->canManage($user);
        if (!$canManage && (!$isOwner || !$this->permissions->has($user, 'ai.conversations.delete'))) {
            return $this->denied('ai.conversations.delete');
        }

        $conversation->messages()->delete();
        $conversation->delete();

        return response()->json(['ok' => true]);
    }

    public function reportSummary(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canSummarizeReports($user)) {
            return $this->denied('ai.report_summary');
        }

        $data = $request->validate([
            'category' => 'required|string|max:60',
            'report_key' => 'required|string|max:120',
            'filters' => 'nullable|array',
            'report_data' => 'nullable|array', // pre-built compressed report from frontend (optional)
            'title' => 'nullable|string|max:200',
        ]);

        $branch = $this->contextBuilder->branchScope($request, $user);

        $reportContext = [
            'title' => $data['title'] ?? ($data['category'] . ' / ' . $data['report_key']),
            'category' => $data['category'],
            'report_key' => $data['report_key'],
            'filters' => $data['filters'] ?? [],
            'branch_scope' => $branch,
            'report' => $this->compressReportData($data['report_data'] ?? []),
            'generated_at' => now()->toIso8601String(),
        ];

        $messages = $this->prompts->buildReportSummaryMessages($reportContext);

        try {
            $result = $this->provider->chat($messages);
        } catch (AiProviderException $e) {
            return response()->json($e->toArray() + ['ok' => false], 422);
        }

        $parsed = $this->tryParseJson($result['text'] ?? '');

        return response()->json([
            'ok' => true,
            'summary' => $parsed['summary'] ?? trim($result['text'] ?? ''),
            'key_numbers' => $parsed['key_numbers'] ?? [],
            'risks' => $parsed['risks'] ?? [],
            'actions' => $parsed['actions'] ?? [],
            'branch_scope' => $branch,
            'generated_at' => now()->toIso8601String(),
        ]);
    }

    public function businessInsight(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canBusinessInsight($user)) {
            return $this->denied('ai.business_insight');
        }

        $safeBuild = function (string $type) use ($request) {
            try {
                return $this->contextBuilder->build($request, $type);
            } catch (Throwable $e) {
                \Log::warning("AI businessInsight: {$type} context failed", ['error' => $e->getMessage()]);
                return ['data' => ['note' => "{$type} context unavailable"], 'branch_scope' => []];
            }
        };

        $sales = $safeBuild('sales');
        $receivable = $safeBuild('receivable');
        $payable = $safeBuild('payable');
        $inventory = $safeBuild('inventory');

        $snapshot = [
            'sales' => $sales['data'] ?? [],
            'receivable' => $receivable['data'] ?? [],
            'payable' => $payable['data'] ?? [],
            'inventory' => $inventory['data'] ?? [],
            'branch_scope' => $sales['branch_scope'] ?? [],
        ];

        $messages = [
            ['role' => 'system', 'content' => AiPromptBuilder::SYSTEM_PROMPT],
            ['role' => 'system', 'content' => 'Return business insights as concise JSON with keys: summary, key_numbers, risks, actions. JSON only.'],
            ['role' => 'user', 'content' => "Business snapshot:\n" . $this->prompts->compressContext($snapshot, $this->settings->contextMaxChars())],
        ];

        try {
            $result = $this->provider->chat($messages);
        } catch (AiProviderException $e) {
            return response()->json($e->toArray() + ['ok' => false], 422);
        }

        $parsed = $this->tryParseJson($result['text'] ?? '');

        return response()->json([
            'ok' => true,
            'summary' => $parsed['summary'] ?? trim($result['text'] ?? ''),
            'key_numbers' => $parsed['key_numbers'] ?? [],
            'risks' => $parsed['risks'] ?? [],
            'actions' => $parsed['actions'] ?? [],
            'branch_scope' => $snapshot['branch_scope'],
        ]);
    }

    private function resolveConversation(
        ?string $id,
        $user,
        ?string $module,
        ?string $branchId = null,
        ?string $firstMessage = null,
    ): AiConversation {
        if ($id) {
            $existing = AiConversation::query()->where('id', $id)->where('user_id', $user->id)->first();
            if ($existing) return $existing;
        }

        $title = null;
        if ($firstMessage) {
            $title = mb_substr(trim(preg_replace('/\s+/', ' ', $firstMessage)), 0, 80);
        }

        return AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => $branchId,
            'module' => $module,
            'title' => $title,
            'status' => 'active',
        ]);
    }

    private function compressReportData(array $reportData): array
    {
        if (empty($reportData)) return [];

        $rowsKey = null;
        foreach (['rows', 'data', 'items'] as $candidate) {
            if (isset($reportData[$candidate]) && is_array($reportData[$candidate])) {
                $rowsKey = $candidate;
                break;
            }
        }
        if ($rowsKey) {
            $rows = $reportData[$rowsKey];
            $reportData['row_count'] = count($rows);
            $reportData[$rowsKey] = array_slice($rows, 0, 20);
        }
        return $reportData;
    }

    private function tryParseJson(string $text): ?array
    {
        $text = trim($text);
        $text = preg_replace('/^```(?:json)?\s*/i', '', $text);
        $text = preg_replace('/\s*```$/', '', $text);
        $decoded = json_decode($text, true);
        return is_array($decoded) ? $decoded : null;
    }

    private function denied(string $perm): JsonResponse
    {
        return response()->json([
            'message' => 'You do not have permission to use AI Assistant.',
            'code' => 'AI_PERMISSION_DENIED',
            'required_permission' => $perm,
        ], 403);
    }
}
