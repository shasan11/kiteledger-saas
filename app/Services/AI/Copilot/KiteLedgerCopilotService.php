<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use App\Neuron\Agents\KiteLedgerCopilotAgent;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use NeuronAI\Chat\Messages\AssistantMessage;
use NeuronAI\Chat\Messages\Stream\Chunks\TextChunk;
use NeuronAI\Chat\Messages\UserMessage;
use Throwable;

final class KiteLedgerCopilotService
{
    public function __construct(
        private NeuronProviderFactory $providers,
        private ToolAuthorizationService $authorization,
        private AiSettingsService $settings,
    ) {}

    /**
     * @param  string[]|null  $allowedTools  registry tool names for this turn
     * @return array<string, mixed>
     */
    public function respond(CopilotContext $context, AiConversation $conversation, ?array $allowedTools = null): array
    {
        $messages = $this->history($conversation);

        try {
            $agent = $this->agent($context, $allowedTools);
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
            throw $this->providerFailure($exception);
        }
    }

    /**
     * Streams the agent's answer, invoking $onDelta for each text fragment.
     *
     * The return shape is identical to respond(), so a caller can stream to the
     * user and still persist and compose from the same completed result. Tool
     * calls produce no text chunks, which is correct: nothing is shown to the
     * user until the model actually starts writing the answer, and the stage
     * events carry progress in the meantime.
     *
     * @param  string[]|null  $allowedTools  registry tool names for this turn
     * @param  callable(string): void  $onDelta
     * @return array<string, mixed>
     */
    public function respondStreamed(
        CopilotContext $context,
        AiConversation $conversation,
        ?array $allowedTools,
        callable $onDelta,
    ): array {
        $messages = $this->history($conversation);
        $buffer = '';

        try {
            $agent = $this->agent($context, $allowedTools);
            $handler = $agent->stream($messages);

            foreach ($handler->events() as $chunk) {
                if (! $chunk instanceof TextChunk || $chunk->content === '') {
                    continue;
                }

                $buffer .= $chunk->content;
                $onDelta($chunk->content);
            }

            // events() stores the final workflow state, so run() returns it
            // without re-executing the agent.
            $usage = $handler->run()->getMessage()->getUsage();

            return [
                'ok' => true,
                'text' => trim($buffer),
                'provider' => $this->settings->provider(),
                'model' => $this->settings->model(),
                'usage' => [
                    'prompt' => $usage?->inputTokens ?? 0,
                    'completion' => $usage?->outputTokens ?? 0,
                    'total' => $usage?->getTotal() ?? 0,
                ],
                'engine' => 'neuron',
                'streamed' => true,
            ];
        } catch (AiProviderException $exception) {
            throw $exception;
        } catch (Throwable $exception) {
            throw $this->providerFailure($exception);
        }
    }

    /** @param string[]|null $allowedTools */
    private function agent(CopilotContext $context, ?array $allowedTools): KiteLedgerCopilotAgent
    {
        return new KiteLedgerCopilotAgent(
            $context,
            $this->providers->chat(interactive: true),
            $this->authorization,
            $this->settings,
            $allowedTools,
        );
    }

    /**
     * Most recent turns first, constrained by a token budget as well as a
     * message count.
     *
     * A count alone is not a bound: twenty turns that each quote a report can
     * exceed the context window on their own, and the provider then rejects the
     * whole request rather than the oldest part of it. Messages are collected
     * newest-first, kept while they fit, and reversed back into chronological
     * order for the model.
     *
     * @return list<AssistantMessage|UserMessage>
     */
    private function history(AiConversation $conversation): array
    {
        $limit = max(2, min(50, (int) config('ai.copilot.history_messages', 20)));
        $budget = max(500, (int) config('ai.copilot.history_token_budget', 3000));

        $rows = $conversation->messages()
            ->whereIn('role', ['user', 'assistant'])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit($limit)
            ->get(['role', 'content']);

        $kept = [];
        $spent = 0;

        foreach ($rows as $row) {
            $content = (string) $row->content;
            // Four characters per token is the usual rough ratio and is only
            // used to decide what to drop, never reported as a real count.
            $cost = (int) ceil(mb_strlen($content) / 4);

            // The newest message is always kept, even when it alone exceeds the
            // budget — dropping it would discard the question being answered.
            if ($kept !== [] && $spent + $cost > $budget) {
                break;
            }

            $spent += $cost;
            $kept[] = $row->role === 'assistant'
                ? new AssistantMessage($content)
                : new UserMessage($content);
        }

        return array_reverse($kept);
    }

    private function providerFailure(Throwable $exception): AiProviderException
    {
        report($exception);
        $message = strtolower($exception->getMessage());
        $code = match (true) {
            str_contains($message, 'timed out'), str_contains($message, 'timeout') => 'AI_TIMEOUT',
            str_contains($message, '429'), str_contains($message, 'rate limit') => 'AI_RATE_LIMIT',
            str_contains($message, '401'), str_contains($message, '403'), str_contains($message, 'unauthorized') => 'AI_PROVIDER_AUTH_FAILED',
            default => 'AI_PROVIDER_ERROR',
        };

        return new AiProviderException('KiteLedger Copilot could not complete the request. Please try again.', $code);
    }
}
