<?php

namespace App\Services\AI;

use App\Models\AiSetting;
use Illuminate\Support\Facades\Auth;
use Symfony\Component\HttpKernel\Exception\HttpException;

class AiActionGuard
{
    protected AiSetting $settings;

    public function __construct()
    {
        $this->settings = AiSetting::current();
    }

    /** Throws 503 if AI is globally disabled. */
    public function assertAiEnabled(): void
    {
        if (!$this->settings->enabled) {
            abort(503, 'AI is disabled. Enable AI from Settings > AI Settings.');
        }
    }

    /** Throws 503 if the given module is not enabled. */
    public function assertModuleEnabled(string $module): void
    {
        $this->assertAiEnabled();

        if (!$this->settings->isModuleEnabled($module)) {
            abort(503, 'This AI feature is disabled. Enable it from Settings > AI Settings.');
        }
    }

    /** Throws 403 if authenticated user lacks the given permission. */
    public function assertUserCanUse(string $permission): void
    {
        $user = Auth::user();

        if (!$user || !$user->hasPermissionTo($permission)) {
            abort(403, 'You do not have permission to use this AI feature.');
        }
    }

    /**
     * Throws 422 if the requested action is in the unsafe list.
     * Returns true if action is safe.
     */
    public function assertSafeAction(string $action): bool
    {
        $unsafe = config('ai.unsafe_actions', []);

        if (in_array($action, $unsafe, true)) {
            abort(422, 'AI cannot perform this action directly. Please review and use the normal approval workflow.');
        }

        return true;
    }

    /**
     * Strip sensitive keys from a context array before sending to LLM.
     */
    public function sanitizeContext(array $context): array
    {
        $sensitiveKeys = [
            'password', 'token', 'api_key', 'secret', 'private_key',
            'access_token', 'refresh_token', 'auth_token',
        ];

        return $this->deepStrip($context, $sensitiveKeys);
    }

    /**
     * Prevent sensitive data from leaking in outgoing payloads.
     */
    public function preventSensitiveLeak(array $payload): array
    {
        return $this->sanitizeContext($payload);
    }

    private function deepStrip(array $data, array $keys): array
    {
        foreach ($data as $k => $v) {
            if (in_array(strtolower((string) $k), $keys, true)) {
                unset($data[$k]);
                continue;
            }

            if (is_array($v)) {
                $data[$k] = $this->deepStrip($v, $keys);
            }
        }

        return $data;
    }
}
