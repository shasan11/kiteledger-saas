<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use App\Neuron\Agents\KiteLedgerCopilotAgent;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use NeuronAI\Chat\Messages\AssistantMessage;
use NeuronAI\Chat\Messages\UserMessage;
use Throwable;

final class KiteLedgerCopilotService
{
    public function __construct(
        private NeuronProviderFactory $providers,
        private ToolAuthorizationService $authorization,
        private AiSettingsService $settings,
    ) {}

    public function respond(CopilotContext $context, AiConversation $conversation): array
    {
        $messages = $conversation->messages()
            ->whereIn('role', ['user', 'assistant'])
            ->orderByDesc('created_at')
            ->limit(max(2, min(50, (int) config('ai.copilot.history_messages', 20))))
            ->get(['role', 'content'])
            ->reverse()
            ->map(fn ($message) => $message->role === 'assistant'
                ? new AssistantMessage((string) $message->content)
                : new UserMessage((string) $message->content))
            ->values()
            ->all();

        try {
            $agent = new KiteLedgerCopilotAgent($context, $this->providers->chat(), $this->authorization, $this->settings);
            $response = $agent->chat($messages)->getMessage();
            $usage = $response->getUsage();

            return [
                'ok' => true,
                'text' => trim((string) $response->getContent()),
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'usage' => [
                    'prompt' => $usage?->inputTokens ?? 0,
                    'completion' => $usage?->outputTokens ?? 0,
                    'total' => $usage?->getTotal() ?? 0,
                ],
                'engine' => 'neuron',
            ];
        } catch (AiProviderException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            report($exception);
            $message = strtolower($exception->getMessage());
            $code = match (true) {
                str_contains($message, 'timed out'), str_contains($message, 'timeout') => 'AI_TIMEOUT',
                str_contains($message, '429'), str_contains($message, 'rate limit') => 'AI_RATE_LIMIT',
                str_contains($message, '401'), str_contains($message, '403'), str_contains($message, 'unauthorized') => 'AI_PROVIDER_AUTH_FAILED',
                default => 'AI_PROVIDER_ERROR',
            };

            throw new AiProviderException('KiteLedger Copilot could not complete the request. Please try again.', $code);
        }
    }
}
