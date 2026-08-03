<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiSettingsService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiSettingsController extends Controller
{
    public function __construct(
        private readonly AiSettingsService $settings,
        private readonly AiPermissionService $permissions,
    ) {}

    public function show(Request $request): JsonResponse
    {
        if (! $this->permissions->canViewSettings($request->user())) {
            return $this->denied('ai.settings.view');
        }

        return response()->json([
            'settings' => $this->settings->all(),
            'supported_providers' => ['openai', 'groq', 'gemini', 'openrouter', 'ollama'],
            'model_suggestions' => [
                'openai' => ['gpt-4o-mini', 'gpt-4o'],
                'groq' => ['llama-3.1-8b-instant', 'llama-3.3-70b-versatile'],
                'gemini' => ['gemini-2.5-flash', 'gemini-2.5-flash-lite', 'gemini-2.5-pro'],
                'openrouter' => ['google/gemini-2.0-flash-001', 'openai/gpt-4o-mini'],
                'ollama' => ['llama3.1:8b', 'mistral:7b'],
            ],
            'default_base_urls' => [
                'openai' => 'https://api.openai.com/v1',
                'groq' => 'https://api.groq.com/openai/v1',
                'gemini' => 'https://generativelanguage.googleapis.com/v1beta/models',
                'openrouter' => 'https://openrouter.ai/api/v1',
                'ollama' => 'http://localhost:11434',
            ],
            'central_managed' => true,
            'editable' => false,
            'message' => 'AI provider settings are managed by the central administrator.',
        ]);
    }

    public function update(Request $request): JsonResponse
    {
        return $this->centrallyManaged();
    }

    public function test(Request $request): JsonResponse
    {
        return $this->centrallyManaged();
    }

    public function testConnection(Request $request): JsonResponse
    {
        return $this->test($request);
    }

    private function centrallyManaged(): JsonResponse
    {
        return response()->json([
            'message' => 'AI provider settings are managed by the central administrator.',
            'code' => 'AI_SETTINGS_CENTRALLY_MANAGED',
        ], 403);
    }

    private function denied(string $permission): JsonResponse
    {
        return response()->json([
            'message' => 'You do not have permission to view AI settings.',
            'code' => 'AI_PERMISSION_DENIED',
            'required_permission' => $permission,
        ], 403);
    }
}
