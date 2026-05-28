<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class AiSettingsController extends Controller
{
    public function __construct(
        protected AiSettingsService $settings,
        protected AiProviderManager $provider,
        protected AiPermissionService $permissions,
    ) {}

    public function show(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canViewSettings($user)) {
            return $this->denied('ai.settings.view');
        }

        return response()->json([
            'settings' => $this->settings->all(),
            'supported_providers' => ['openai', 'groq', 'gemini', 'ollama'],
            'model_suggestions' => [
                'openai' => ['gpt-4o-mini', 'gpt-4.1-mini', 'gpt-4o'],
                'groq' => ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
                'gemini' => ['gemini-1.5-flash', 'gemini-1.5-pro'],
                'ollama' => ['llama3.1:8b', 'mistral', 'qwen2.5'],
            ],
            'default_base_urls' => [
                'openai' => 'https://api.openai.com/v1',
                'groq' => 'https://api.groq.com/openai/v1',
                'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
                'ollama' => 'http://localhost:11434',
            ],
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canManage($user)) {
            return $this->denied('ai.settings.update');
        }

        $validated = $request->validate([
            'ai_enabled' => 'nullable|boolean',
            'ai_provider' => ['nullable', Rule::in(['openai', 'groq', 'gemini', 'ollama'])],
            'ai_model' => 'nullable|string|max:120',
            'ai_api_key' => 'nullable|string|max:500',
            'ai_base_url' => 'nullable|string|max:500',
            'ai_temperature' => 'nullable|numeric|min:0|max:2',
            'ai_max_tokens' => 'nullable|integer|min:50|max:32000',
            'ai_timeout_seconds' => 'nullable|integer|min:5|max:600',
            'ai_connect_timeout_seconds' => 'nullable|integer|min:2|max:60',
            'ai_stream_enabled' => 'nullable|boolean',
            'ai_cache_enabled' => 'nullable|boolean',
            'ai_cache_ttl' => 'nullable|integer|min:30|max:86400',
            'ai_context_max_rows' => 'nullable|integer|min:1|max:500',
            'ai_context_max_chars' => 'nullable|integer|min:500|max:200000',
            'ai_fast_mode' => 'nullable|boolean',
        ]);

        // API key: only update if a real value provided. Reject masked values.
        if (isset($validated['ai_api_key'])) {
            $key = trim((string) $validated['ai_api_key']);
            if ($key === '' || str_contains($key, '...')) {
                unset($validated['ai_api_key']);
            } else {
                $this->settings->setApiKey($key);
                unset($validated['ai_api_key']);
            }
        }

        $this->settings->setMany($validated);

        return response()->json([
            'ok' => true,
            'message' => 'AI settings saved.',
            'settings' => $this->settings->all(),
        ]);
    }

    public function test(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->canManage($user)) {
            return $this->denied('ai.settings.update');
        }

        $result = $this->provider->testConnection();
        return response()->json($result, ($result['success'] ?? false) ? 200 : 422);
    }

    // Backward compatibility: old route is /ai/settings/test-connection
    public function testConnection(Request $request): JsonResponse
    {
        return $this->test($request);
    }

    private function denied(string $perm): JsonResponse
    {
        return response()->json([
            'message' => 'You do not have permission to manage AI settings.',
            'code' => 'AI_PERMISSION_DENIED',
            'required_permission' => $perm,
        ], 403);
    }
}
