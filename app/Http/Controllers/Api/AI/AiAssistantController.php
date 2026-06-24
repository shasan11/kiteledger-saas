<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Resources\AiConversationResource;
use App\Http\Resources\AiMessageResource;
use App\Models\AiConversation;
use App\Services\AI\AiPromptBuilder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiAssistantController extends AiAgentChatController
{
    public function chat(Request $request): JsonResponse
    {
        $data = $request->validate([
            'message' => 'required|string|max:4000',
            'conversation_id' => 'nullable|string',
            'context_type' => 'nullable|string|max:60',
            'context_payload' => 'nullable|array',
            'cache' => 'nullable|boolean',
        ]);

        // Full ERP agent by default (RAG, deterministic tools, action proposals).
        // Deployments can still pin the assistant to report-only Q&A via the
        // `ai_assistant_mode` setting without losing any of the wiring below.
        if ($this->settings->reportsOnly() && !$this->isReportRequest($data['message'], $data['context_payload'] ?? [])) {
            return response()->json([
                'ok' => false,
                'code' => 'AI_REPORTS_ONLY',
                'message' => 'AI Assistant is currently limited to report questions. Ask it to open, explain, summarize, or analyze a report — or enable the full assistant in AI Settings.',
            ], 422);
        }

        return parent::chat($request);
    }

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
            'scope' => $this->settings->assistantMode(),
            'assistant_mode' => $this->settings->assistantMode(),
            'write_actions_enabled' => $this->settings->writeActionsEnabled(),
            'semantic_search_available' => $this->settings->enabled() && $this->settings->supportsEmbeddings(),
            'permissions' => $this->permissions->summary($user),
        ]);
    }

    public function stream(Request $request): JsonResponse
    {
        return $this->chat($request);
    }

    public function conversations(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.conversations.view', 'ai.use', 'ai.manage'])) {
            return $this->denied('ai.conversations.view');
        }

        $query = AiConversation::query()->orderByDesc('updated_at')->limit(50);
        if (!$this->permissions->canManage($user)) {
            $query->where('user_id', $user->id);
        }

        return response()->json([
            'conversations' => AiConversationResource::collection($query->get()),
        ]);
    }

    public function showConversation(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $conversation = AiConversation::query()->where('id', $id)->first();
        if (!$conversation) abort(404);

        if ($conversation->user_id !== $user->id && !$this->permissions->canManage($user)) {
            return $this->denied('ai.conversations.view');
        }

        return response()->json([
            'conversation' => new AiConversationResource($conversation),
            'messages' => AiMessageResource::collection($conversation->messages()->orderBy('created_at')->get()),
        ]);
    }

    public function deleteConversation(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $conversation = AiConversation::query()->where('id', $id)->first();
        if (!$conversation) abort(404);

        $isOwner = $conversation->user_id === $user->id;
        if (!$this->permissions->canManage($user) && (!$isOwner || !$this->permissions->has($user, 'ai.conversations.delete'))) {
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
            'report_data' => 'nullable|array',
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
        } catch (\App\Services\AI\AiProviderException $e) {
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
        } catch (\App\Services\AI\AiProviderException $e) {
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

    private function compressReportData(array $reportData): array
    {
        if (empty($reportData)) return [];

        foreach (['rows', 'data', 'items'] as $key) {
            if (isset($reportData[$key]) && is_array($reportData[$key])) {
                $reportData['row_count'] = count($reportData[$key]);
                $reportData[$key] = array_slice($reportData[$key], 0, 20);
                break;
            }
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

    private function isReportRequest(string $message, array $payload): bool
    {
        if (($payload['module'] ?? null) === 'reports' || str_starts_with((string) ($payload['url'] ?? ''), '/reports')) {
            return true;
        }

        $classification = $this->toolRouter->classify($message, $payload);
        if (($classification['type'] ?? null) === 'report') {
            return true;
        }

        return (bool) preg_match('/\b(report|reports|trial balance|balance sheet|profit and loss|p&l|cash flow|ledger|receivable|payable|sales summary|purchase summary|inventory report|tax report|payroll report|analytics)\b/i', $message);
    }
}
