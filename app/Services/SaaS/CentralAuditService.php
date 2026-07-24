<?php

namespace App\Services\SaaS;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CentralAuditService
{
    public function log(Request $request, string $action, ?Model $model = null, array $old = [], array $new = []): void
    {
        $old = $this->mask($old);
        $new = $this->mask($new);
        DB::connection(config('tenancy.database.central_connection'))->table('central_audit_logs')->insert(['admin_id' => $request->attributes->get('centralAdmin')?->id, 'action' => $action, 'model_type' => $model?->getMorphClass(), 'model_id' => $model?->getKey(), 'old_values' => $old ? json_encode($old) : null, 'new_values' => $new ? json_encode($new) : null, 'ip_address' => $request->ip(), 'user_agent' => mb_substr((string) $request->userAgent(), 0, 1000), 'created_at' => now()]);
    }

    private function mask(array $values): array
    {
        $sensitive = '/password|secret|token|api.?key|private.?key|webhook|credential/i';
        foreach ($values as $key => $value) {
            $values[$key] = preg_match($sensitive, (string) $key) ? '[REDACTED]' : (is_array($value) ? $this->mask($value) : $value);
        }

        return $values;
    }
}
