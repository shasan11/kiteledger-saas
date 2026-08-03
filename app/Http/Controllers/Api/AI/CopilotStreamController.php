<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api\AI;

use App\Http\Controllers\Controller;
use App\Models\AiConversation;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Copilot\CopilotException;
use App\Services\AI\Copilot\CopilotOrchestrator;
use App\Services\AI\Copilot\CopilotRequestFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Server-Sent Events progress for Copilot V2.
 *
 * Streams *stage* events rather than token deltas. The stages correspond to
 * real orchestration boundaries — routing, tool execution, retrieval — so the
 * progress a user sees reflects what the server is actually doing rather than a
 * decorative animation. Token-level streaming is a separate concern and would
 * conflict with deterministic tool execution, which has no partial output.
 */
final class CopilotStreamController extends Controller
{
    public function __construct(
        private readonly AiSettingsService $settings,
        private readonly AiPermissionService $permissions,
        private readonly CopilotRequestFactory $requests,
        private readonly CopilotOrchestrator $orchestrator,
    ) {}

    public function stream(Request $request): StreamedResponse|\Illuminate\Http\JsonResponse
    {
        $user = $request->user();

        if (! $this->permissions->canChat($user)) {
            return response()->json([
                'ok' => false,
                'message' => 'You do not have permission to use KiteLedger Copilot.',
                'code' => CopilotException::AI_PERMISSION_DENIED,
            ], 403);
        }

        if (! config('ai.copilot.streaming_enabled', false) || ! $this->settings->copilotV2Enabled()) {
            return response()->json([
                'ok' => false,
                'message' => 'Streaming is not enabled.',
                'code' => 'AI_STREAMING_DISABLED',
            ], 422);
        }

        $data = $request->validate([
            'message' => 'required|string|max:4000',
            'conversation_id' => 'nullable|string|max:2048',
            'context_type' => ['nullable', 'string', Rule::in(['auto', 'general', 'sales', 'purchase', 'inventory', 'accounting', 'reports', 'contacts'])],
            'context_payload' => 'nullable|array',
        ]);

        $conversation = $this->resolveConversation($data['conversation_id'] ?? null, $user, trim((string) $data['message']));

        return response()->stream(function () use ($request, $data, $conversation): void {
            $emit = function (string $event, array $payload): void {
                echo 'event: '.$event."\n";
                echo 'data: '.json_encode($payload, JSON_UNESCAPED_SLASHES)."\n\n";

                if (ob_get_level() > 0) {
                    @ob_flush();
                }
                flush();
            };

            $emit('stage', ['stage' => 'understanding', 'label' => 'Understanding your request']);

            try {
                $copilotRequest = $this->requests->make($request, $data, $conversation);

                $emit('stage', ['stage' => 'working', 'label' => 'Checking your permitted business data']);

                $outcome = $this->orchestrator->handle($copilotRequest);

                if ($outcome->failed()) {
                    $emit('error', [
                        'code' => $outcome->exception?->getErrorCode(),
                        'message' => $outcome->response->message,
                    ]);

                    return;
                }

                $emit('stage', ['stage' => 'composing', 'label' => 'Preparing your answer']);

                $debug = $this->orchestrator->canViewTrace($copilotRequest) && config('ai.copilot.trace_enabled', true)
                    ? $outcome->trace->toArray()
                    : null;

                $emit('answer', $outcome->response->toArray(
                    $this->conversationToken($outcome->conversation),
                    $copilotRequest->requestId,
                    $debug,
                ));
            } catch (CopilotException $e) {
                $emit('error', ['code' => $e->getErrorCode(), 'message' => $e->getMessage()]);
            } catch (Throwable $e) {
                report($e);
                $emit('error', [
                    'code' => 'AI_PROVIDER_ERROR',
                    'message' => 'Copilot could not complete the request.',
                ]);
            } finally {
                $emit('done', ['ok' => true]);
            }
        }, 200, [
            'Content-Type' => 'text/event-stream',
            'Cache-Control' => 'no-cache, no-store, must-revalidate',
            'Connection' => 'keep-alive',
            // Nginx buffers proxied responses by default, which would hold the
            // whole stream until completion and defeat the point.
            'X-Accel-Buffering' => 'no',
        ]);
    }

    private function resolveConversation(?string $token, $user, string $firstMessage): AiConversation
    {
        if ($token && str_starts_with($token, 'conv_')) {
            try {
                $id = Crypt::decryptString(substr($token, 5));
                $existing = AiConversation::query()->where('id', $id)->where('user_id', $user->id)->first();

                if ($existing) {
                    return $existing;
                }
            } catch (Throwable) {
                // Fall through and start a new conversation.
            }
        }

        return AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => $user->branch_id,
            'module' => 'general',
            'title' => mb_substr(trim(preg_replace('/\s+/', ' ', $firstMessage) ?? ''), 0, 80) ?: null,
            'status' => 'active',
        ]);
    }

    private function conversationToken(AiConversation $conversation): string
    {
        return 'conv_'.Crypt::encryptString((string) $conversation->id);
    }
}
