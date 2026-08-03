<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;

class AiResponseCacheService
{
    public function __construct(
        protected AiSettingsService $settings,
        protected AiDataVersionService $versions,
    ) {}

    public function key(?int $userId, ?string $branchId, string $message, array $context): string
    {
        $provider = $this->settings->provider();
        $model = $this->settings->model();
        $tenantId = function_exists('tenant') ? tenant('id') : null;
        $fiscalYearId = $context['fiscal_year_id'] ?? request()->header('X-Fiscal-Year-Id') ?? 'none';
        $permissions = [];
        try {
            $permissions = request()->user()?->getAllPermissions()?->pluck('name')->sort()->values()->all() ?? [];
        } catch (\Throwable) {
        }
        $permissionHash = substr(hash('sha256', json_encode($permissions)), 0, 16);
        $msgHash = substr(hash('sha256', Str::squish(mb_strtolower($message))), 0, 24);
        $ctxHash = substr(hash('sha256', json_encode($context)), 0, 24);
        $version = $this->versions->current();

        return "ai_response:{$tenantId}:{$userId}:{$branchId}:{$fiscalYearId}:{$permissionHash}:{$version}:{$provider}:{$model}:{$msgHash}:{$ctxHash}";
    }

    public function get(string $key): ?array
    {
        if (! $this->settings->cacheEnabled()) {
            return null;
        }
        $val = Cache::get($key);

        return is_array($val) ? $val : null;
    }

    public function put(string $key, array $value): void
    {
        if (! $this->settings->cacheEnabled()) {
            return;
        }
        Cache::put($key, $value, $this->settings->cacheTtl());
    }
}
