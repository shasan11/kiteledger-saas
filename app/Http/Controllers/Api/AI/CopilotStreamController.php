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
use App\Services\AI\Copilot\CopilotStreamEmitter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\StreamedResponse;
use Throwable;

/**
 * Server-Sent Events for Copilot V2.
 *
 * Emits both *stage* events (real orchestration boundaries — routing, data
 * retrieval, answer composition) and *delta* events carrying the model's text
 * as it is produced, so the first words reach the user without waiting for the
 * complete answer. Deterministic tool execution has no partial output, which is
 * exactly what the stages cover: the user sees what the server is doing while
 * the figures are being computed, then sees the explanation stream in.
 *
 * The terminal `answer` event always carries the complete structured response,
 * so a client that ignores deltas entirely still renders correctly.
 */
final class CopilotStreamController extends Controller
{
    public function __construct(
        private readonly AiSettingsService $settings,
        private readonly AiPermissionService $permissions,
        private readonly CopilotRequestFactory $requests,
        private readonly CopilotOrchestrator $orchestrator,
    ) {}

    public function stream(Request $request): StreamedResponse|JsonResponse
    {
        $user = $request->user();

        if (! $this->permissions->canChat($user)) {
            return response()->json([
                'ok' => false,
                'message' => 'You do not have permission to use KiteLedger Copilot.',
                'code' => CopilotException::AI_PERMISSION_DENIED,
            ], 403);
        }

        if (! $this->settings->streamEnabled()
            || ! config('ai.copilot.streaming_enabled', false)
            || ! $this->settings->copilotV2Enabled()) {
            // 422 with this code is the client's signal to retry on the plain
            // JSON endpoint rather than surfacing an error to the user.
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
            'cache' => 'nullable|boolean',
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

            $emitter = new class($emit) implements CopilotStreamEmitter
            {
                public function __construct(private readonly \Closure $emit) {}

                public function stage(string $stage, string $label): void
                {
                    ($this->emit)('stage', ['stage' => $stage, 'label' => $label]);
                }

                public function delta(string $text): void
                {
                    ($this->emit)('delta', ['text' => $text]);
                }
            };

            try {
                $copilotRequest = $this->requests->make($request, $data, $conversation);

                $outcome = $this->orchestrator->handle($copilotRequest, $emitter);

                if ($outcome->failed()) {
                    $emit('error', [
                        'code' => $outcome->exception?->getErrorCode(),
                        'message' => $outcome->response->message,
                    ]);

                    return;
                }

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
