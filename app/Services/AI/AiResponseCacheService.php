<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;

class AiResponseCacheService
{
    public function __construct(protected AiSettingsService $settings) {}

    public function key(?int $userId, ?string $branchId, string $message, array $context): string
    {
        $provider = $this->settings->provider();
        $model = $this->settings->model();
        $msgHash = substr(hash('sha256', $message), 0, 24);
        $ctxHash = substr(hash('sha256', json_encode($context)), 0, 24);
        return "ai_response:{$userId}:{$branchId}:{$provider}:{$model}:{$msgHash}:{$ctxHash}";
    }

    public function get(string $key): ?array
    {
        if (!$this->settings->cacheEnabled()) return null;
        $val = Cache::get($key);
        return is_array($val) ? $val : null;
    }

    public function put(string $key, array $value): void
    {
        if (!$this->settings->cacheEnabled()) return;
        Cache::put($key, $value, $this->settings->cacheTtl());
    }
}
