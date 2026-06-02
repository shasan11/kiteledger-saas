<?php

namespace App\Services\AI;

use App\Models\AiUsageLog;
use Illuminate\Support\Facades\Auth;

class AiUsageLogger
{
    public function log(array $data): AiUsageLog
    {
        $user = Auth::user();

        return AiUsageLog::create([
            'user_id'           => $data['user_id']          ?? optional($user)->id,
            'branch_id'         => $data['branch_id']         ?? null,
            'module'            => $data['module']            ?? null,
            'provider'          => $data['provider']          ?? null,
            'model'             => $data['model']             ?? null,
            'prompt_tokens'     => $data['prompt_tokens']     ?? 0,
            'completion_tokens' => $data['completion_tokens'] ?? 0,
            'total_tokens'      => $data['total_tokens']      ?? 0,
            'estimated_cost'    => $data['estimated_cost']    ?? null,
            'status'            => $data['status']            ?? 'success',
            'error_message'     => $data['error_message']     ?? null,
            'duration_ms'       => $data['duration_ms']       ?? null,
            'request_hash'      => $data['request_hash']      ?? null,
            'question'          => $data['question']          ?? null,
            'intent'            => $data['intent']            ?? null,
            'selected_tool'     => $data['selected_tool']     ?? null,
            'filters'           => $data['filters']           ?? null,
            'date_range'        => $data['date_range']        ?? null,
            'row_count'         => $data['row_count']         ?? null,
            'token_estimate'    => $data['token_estimate']    ?? null,
        ]);
    }

    public function logBlocked(string $module, string $reason): void
    {
        $user = Auth::user();

        AiUsageLog::create([
            'user_id'       => optional($user)->id,
            'module'        => $module,
            'status'        => 'blocked',
            'error_message' => $reason,
        ]);
    }

    public function logError(string $module, string $provider, string $error): void
    {
        $user = Auth::user();

        AiUsageLog::create([
            'user_id'       => optional($user)->id,
            'module'        => $module,
            'provider'      => $provider,
            'status'        => 'error',
            'error_message' => $error,
        ]);
    }
}
