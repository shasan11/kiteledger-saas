<?php

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
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
        if (!$this->permissions->hasAny($user, ['ai.use', 'ai.chat', 'ai.manage'])) {
            return $this->denied('ai.use');
        }

        $query = AiPendingAction::query()->orderByDesc('created_at')->limit(100);
        if (!$this->permissions->canManage($user)) {
            $query->where('user_id', $user->id);
        }

        return response()->json(['actions' => $query->get()]);
    }

    public function show(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if ($action->user_id !== $user->id && !$this->permissions->canManage($user)) {
            return $this->denied('ai.actions.view');
        }

        return response()->json(['action' => $action]);
    }

    public function approve(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.actions.approve', 'ai.manage'])) {
            return $this->denied('ai.actions.approve');
        }

        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if ($action->user_id !== $user->id && !$this->permissions->canManage($user)) {
            return $this->denied('ai.actions.approve');
        }

        try {
            $result = $this->executor->execute($action, $user->id);
            return response()->json([
                'ok' => true,
                'status' => 'executed',
                'message' => $result['message'] ?? 'AI action executed.',
                'result' => $result,
                'action' => $action->fresh(),
            ]);
        } catch (Throwable $e) {
            $action->forceFill([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
            ])->save();

            return response()->json([
                'ok' => false,
                'status' => 'failed',
                'message' => $e->getMessage(),
                'action' => $action->fresh(),
            ], 422);
        }
    }

    public function reject(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        if (!$this->permissions->hasAny($user, ['ai.actions.reject', 'ai.manage'])) {
            return $this->denied('ai.actions.reject');
        }

        $action = AiPendingAction::query()->where('id', $id)->firstOrFail();
        if ($action->user_id !== $user->id && !$this->permissions->canManage($user)) {
            return $this->denied('ai.actions.reject');
        }

        try {
            $updated = $this->executor->reject($action, $user->id);
            return response()->json([
                'ok' => true,
                'status' => 'rejected',
                'message' => 'AI action rejected.',
                'action' => $updated,
            ]);
        } catch (Throwable $e) {
            return response()->json([
                'ok' => false,
                'message' => $e->getMessage(),
            ], 422);
        }
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
