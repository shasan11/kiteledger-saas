<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Http\Resources\AiActionAuditLogResource;
use App\Http\Resources\AiPendingActionResource;
use App\Models\AiActionAuditLog;
use App\Models\AiPendingAction;
use App\Services\AI\Agent\AiSafeActionExecutor;
use App\Services\AI\AiPermissionService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Throwable;

class AiActionApprovalController extends Controller
{
    public function __construct(
        protected AiPermissionService $permissions,
        protected AiSafeActionExecutor $executor,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.actions.view', 'ai.use', 'ai.chat', 'ai.manage'])) {
            return $this->denied('ai.actions.view');
        }

        $query = AiPendingAction::query()->orderByDesc('created_at')->limit(100);
        if (!$this->permissions->canManageData($user)) {
            $query->where('user_id', $user->id);
        }

        return response()->json(['actions' => AiPendingActionResource::collection($query->get())]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if (!$this->canAccess($user, $action)) {
            return $this->denied('ai.actions.view');
        }

        return response()->json(['action' => new AiPendingActionResource($action)]);
    }

    /**
     * Approve and apply a pending action. For high/critical-risk actions the
     * caller must supply a matching `confirmation_text` (spec §12/§13).
     */
    public function approve(Request $request, string $id): JsonResponse
    {
        return $this->runExecution($request, $id, 'ai.actions.approve');
    }

    /**
     * Canonical "apply the change" endpoint. Behaves like approve() — kept
     * distinct so the frontend can model a two-step approve/execute flow.
     */
    public function execute(Request $request, string $id): JsonResponse
    {
        return $this->runExecution($request, $id, 'ai.actions.execute');
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.actions.reject', 'ai.actions.approve', 'ai.manage'])) {
            return $this->denied('ai.actions.reject');
        }

        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if (!$this->canAccess($user, $action)) {
            return $this->denied('ai.actions.reject');
        }

        try {
            $updated = $this->executor->reject($action, $user->id, $this->auditContext($request));

            return response()->json([
                'ok' => true,
                'status' => 'rejected',
                'message' => 'AI action rejected.',
                'action' => new AiPendingActionResource($updated),
            ]);
        } catch (Throwable $e) {
            return response()->json(['ok' => false, 'message' => $e->getMessage()], 422);
        }
    }

    public function audit(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if (!$this->canAccess($user, $action)) {
            return $this->denied('ai.actions.view');
        }

        $logs = AiActionAuditLog::query()
            ->where('ai_pending_action_id', $action->id)
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['audit_logs' => AiActionAuditLogResource::collection($logs)]);
    }

    private function runExecution(Request $request, string $id, string $permission): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, [$permission, 'ai.actions.approve', 'ai.manage'])) {
            return $this->denied($permission);
        }

        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if (!$this->canAccess($user, $action)) {
            return $this->denied($permission);
        }

        // Critical/high-risk actions need an explicit typed confirmation phrase.
        $metadata = is_array($action->metadata) ? $action->metadata : [];
        $needsConfirmation = ($metadata['requires_confirmation'] ?? false) || in_array($action->risk_level, ['high', 'critical'], true);
        if ($needsConfirmation) {
            $expected = $metadata['confirmation_text'] ?? null;
            $provided = trim((string) $request->input('confirmation_text', ''));

            if ($expected && $provided !== $expected) {
                return response()->json([
                    'ok' => false,
                    'code' => 'AI_CONFIRMATION_REQUIRED',
                    'status' => 'pending',
                    'message' => "This is a {$action->risk_level}-risk action. Type \"{$expected}\" to confirm.",
                    'confirmation_text' => $expected,
                    'action' => new AiPendingActionResource($action),
                ], 422);
            }
        }

        try {
            $result = $this->executor->execute($action, $user->id, $this->auditContext($request));

            return response()->json([
                'ok' => true,
                'status' => 'executed',
                'message' => $result['message'] ?? 'AI action executed.',
                'result' => [
                    'id' => $result['id'] ?? null,
                    'status' => $result['status'] ?? null,
                    'open_url' => $result['open_url'] ?? null,
                    'message' => $result['message'] ?? null,
                ],
                'action' => new AiPendingActionResource($action->fresh()),
            ]);
        } catch (Throwable $e) {
            $action->forceFill([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ])->save();

            $this->executor->recordFailure($action, $e->getMessage(), $this->auditContext($request));

            return response()->json([
                'ok' => false,
                'status' => 'failed',
                'message' => $e->getMessage(),
                'action' => new AiPendingActionResource($action->fresh()),
            ], 422);
        }
    }

    private function canAccess($user, AiPendingAction $action): bool
    {
        return $action->user_id === $user->id || $this->permissions->canManageData($user);
    }

    private function auditContext(Request $request): array
    {
        return [
            'ip' => $request->ip(),
            'user_agent' => $request->userAgent(),
        ];
    }

    private function denied(string $perm): JsonResponse
    {
        return response()->json([
            'ok' => false,
            'message' => 'You do not have permission to perform this AI action.',
            'code' => 'AI_PERMISSION_DENIED',
            'required_permission' => $perm,
        ], 403);
    }
}
