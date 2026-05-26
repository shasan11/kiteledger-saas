<?php

namespace App\Services\AI;

use App\Models\AiActionLog;
use App\Models\AiPendingAction;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AiAuditLogger
{
    public function recordProposal(AiPendingAction $action, string $originalPrompt): void
    {
        $this->write($action, 'proposed', 'AI proposed action: ' . $action->title, null, [
            'prompt' => $originalPrompt,
        ]);
    }

    public function recordApproval(AiPendingAction $action): void
    {
        $this->write($action, 'approved', 'User approved AI action: ' . $action->title);
    }

    public function recordRejection(AiPendingAction $action, ?string $reason = null): void
    {
        $this->write($action, 'rejected', 'User rejected AI action' . ($reason ? ': ' . $reason : ''));
    }

    public function recordExecution(AiPendingAction $action, array $resultPayload): void
    {
        $this->write($action, 'executed', 'AI action executed successfully', $resultPayload);
    }

    public function recordFailure(AiPendingAction $action, string $error): void
    {
        $this->write($action, 'failed', 'AI action execution failed: ' . $error);
    }

    public function recentForUser(?int $limit = 20): \Illuminate\Support\Collection
    {
        $userId = Auth::id();
        if (!$userId) {
            return collect();
        }

        return AiActionLog::where('user_id', $userId)
            ->orderByDesc('created_at')
            ->limit($limit ?? 20)
            ->get();
    }

    private function write(
        AiPendingAction $action,
        string          $status,
        string          $description,
        ?array          $responsePayload = null,
        ?array          $extra = null
    ): void {
        AiActionLog::create([
            'user_id'          => Auth::id(),
            'branch_id'        => $action->branch_id,
            'module'           => $action->module,
            'action_type'      => $action->action_type,
            'target_type'      => $action->target_type,
            'target_id'        => $action->target_id,
            'request_payload'  => array_merge([
                'pending_action_id' => $action->id,
                'title'             => $action->title,
                'summary'           => $action->summary,
                'description'       => $description,
                'ip'                => Request::ip(),
                'user_agent'        => substr((string) Request::userAgent(), 0, 250),
            ], $extra ?? []),
            'response_payload' => $responsePayload,
            'risk_level'       => $action->risk_level,
            'status'           => $status,
        ]);
    }
}
