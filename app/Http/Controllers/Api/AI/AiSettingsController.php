<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiSetting;
use App\Services\AI\AiActionGuard;
use App\Services\AI\AiProviderService;
use App\Services\AI\AiUsageLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\Rule;

class AiSettingsController extends Controller
{
    public function __construct(
        protected AiActionGuard     $guard,
        protected AiUsageLogger     $usageLogger,
    ) {}

    public function show(): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !$user->hasPermissionTo('ai.settings.view')) {
            abort(403, 'You do not have permission to view AI settings.');
        }

        $settings = AiSetting::current();

        return response()->json($this->formatSettings($settings));
    }

    public function update(Request $request): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !$user->hasPermissionTo('ai.settings.manage')) {
            abort(403, 'You do not have permission to manage AI settings.');
        }

        $validated = $request->validate([
            'enabled'               => 'boolean',
            'provider'              => ['sometimes', Rule::in(config('ai.supported_providers'))],
            'model'                 => 'nullable|string|max:100',
            'fallback_provider'     => ['nullable', Rule::in(config('ai.supported_providers'))],
            'fallback_model'        => 'nullable|string|max:100',
            'api_key'               => 'nullable|string|max:500',
            'base_url'              => 'nullable|url|max:500',
            'temperature'           => 'nullable|numeric|min:0|max:2',
            'max_tokens'            => 'nullable|integer|min:100|max:32000',
            'daily_request_limit'   => 'nullable|integer|min:1',
            'monthly_token_limit'   => 'nullable|integer|min:1',
            'enabled_modules'       => 'nullable|array',
            'enabled_modules.*'     => 'boolean',
            'safety_mode'           => 'nullable|string|in:strict,permissive',
            'log_prompts'           => 'boolean',
            'log_responses'         => 'boolean',
        ]);

        $settings = AiSetting::current();

        // Handle API key: only update if a new key is provided
        if (!empty($validated['api_key'])) {
            $settings->setApiKeyRawAttribute($validated['api_key']);
        }
        unset($validated['api_key']);

        $settings->fill($validated);
        $settings->updated_by_id = $user->id;
        $settings->save();

        return response()->json([
            'message'  => 'AI settings saved.',
            'settings' => $this->formatSettings($settings->fresh()),
        ]);
    }

    public function testConnection(): JsonResponse
    {
        $user = Auth::user();

        if (!$user || !$user->hasPermissionTo('ai.settings.manage')) {
            abort(403, 'You do not have permission to manage AI settings.');
        }

        $providerService = app(AiProviderService::class);
        $result = $providerService->testConnection();

        return response()->json($result, $result['success'] ? 200 : 422);
    }

    private function formatSettings(AiSetting $settings): array
    {
        return [
            'id'                    => $settings->id,
            'enabled'               => $settings->enabled,
            'provider'              => $settings->provider,
            'model'                 => $settings->model,
            'fallback_provider'     => $settings->fallback_provider,
            'fallback_model'        => $settings->fallback_model,
            'api_key_masked'        => $settings->getMaskedApiKey(),
            'has_api_key'           => !empty($settings->api_key_encrypted),
            'base_url'              => $settings->base_url,
            'temperature'           => $settings->temperature,
            'max_tokens'            => $settings->max_tokens,
            'daily_request_limit'   => $settings->daily_request_limit,
            'monthly_token_limit'   => $settings->monthly_token_limit,
            'enabled_modules'       => $settings->enabled_modules ?? config('ai.default_modules_enabled'),
            'safety_mode'           => $settings->safety_mode,
            'log_prompts'           => $settings->log_prompts,
            'log_responses'         => $settings->log_responses,
            'supported_providers'   => config('ai.supported_providers'),
            'available_modules'     => config('ai.modules'),
        ];
    }
}
