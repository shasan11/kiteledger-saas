<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiPendingAction;
use App\Services\AI\AiActionExecutor;
use App\Services\AI\AiAuditLogger;
use App\Services\AI\AiPermissionGuard;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiActionController extends Controller
{
    public function __construct(
        protected AiActionExecutor  $executor,
        protected AiAuditLogger     $audit,
        protected AiPermissionGuard $guard,
    ) {}

    public function approve(Request $request, string $uuid): JsonResponse
    {
        $action = AiPendingAction::where('id', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if ($action->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Action is no longer pending (current status: ' . $action->status . ').',
            ], 422);
        }

        if (!$this->guard->userCanPerform($action->action_type)) {
            return response()->json([
                'success' => false,
                'message' => $this->guard->denialMessage(),
            ], 403);
        }

        $action->update([
            'status'      => 'approved',
            'approved_by' => $request->user()->id,
            'approved_at' => now(),
        ]);
        $this->audit->recordApproval($action);

        try {
            $result = $this->executor->execute($action);

            $action->update([
                'status'       => 'executed',
                'executed_at'  => now(),
                'error_message'=> null,
                'metadata'     => array_merge($action->metadata ?? [], ['result' => $result]),
            ]);
            $this->audit->recordExecution($action, $result);

            return response()->json([
                'success' => true,
                'message' => 'Action executed successfully.',
                'action'  => $action->fresh(),
                'result'  => $result,
            ]);
        } catch (Throwable $e) {
            $action->update([
                'status'        => 'failed',
                'error_message' => $e->getMessage(),
            ]);
            $this->audit->recordFailure($action, $e->getMessage());

            return response()->json([
                'success' => false,
                'message' => 'Action could not be executed.',
                'error'   => $e->getMessage(),
                'action'  => $action->fresh(),
            ], 422);
        }
    }

    public function reject(Request $request, string $uuid): JsonResponse
    {
        $action = AiPendingAction::where('id', $uuid)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        if (!in_array($action->status, ['pending', 'approved'], true)) {
            return response()->json([
                'success' => false,
                'message' => 'Action is already ' . $action->status . '.',
            ], 422);
        }

        $reason = $request->input('reason');
        $action->update(['status' => 'rejected']);
        $this->audit->recordRejection($action, $reason);

        return response()->json([
            'success' => true,
            'message' => 'Action rejected.',
            'action'  => $action->fresh(),
        ]);
    }
}
