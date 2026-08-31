<?php

namespace App\Services\AI;

use Illuminate\Support\Facades\Cache;

final class AiDataVersionService
{
    public function current(): int
    {
        return (int) Cache::get($this->key(), 1);
    }

    public function bump(): int
    {
        if (! Cache::has($this->key())) {
            Cache::forever($this->key(), 1);
        }

        return (int) Cache::increment($this->key());
    }

    private function key(): string
    {
        $tenantId = function_exists('tenant') ? tenant('id') : null;

        return 'ai:data-version:'.($tenantId ?: 'central');
    }
}
