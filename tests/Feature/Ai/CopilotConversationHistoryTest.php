<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\User;
use App\Services\AI\Copilot\KiteLedgerCopilotService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use NeuronAI\Chat\Messages\AssistantMessage;
use NeuronAI\Chat\Messages\UserMessage;
use ReflectionMethod;
use Tests\TestCase;

/**
 * Phase 1: replayed conversation history must be the most recent turns, bounded
 * by tokens as well as by message count.
 *
 * The failure this guards against is not theoretical: taking the first N rows
 * of a long thread replays the opening small talk and drops the question the
 * user actually asked, so the model answers from stale context.
 */
class CopilotConversationHistoryTest extends TestCase
{
    use RefreshDatabase;

    private function conversation(): AiConversation
    {
        $user = User::factory()->create();

        return AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => null,
            'module' => 'general',
            'title' => 'history',
            'status' => 'active',
        ]);
    }

    private function addMessage(AiConversation $conversation, string $role, string $content, int $minutesAgo): void
    {
        $message = AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => $role,
            'content' => $content,
        ]);

        // created_at is set explicitly so ordering is unambiguous: several
        // messages inserted in the same second would otherwise tie.
        $message->forceFill(['created_at' => now()->subMinutes($minutesAgo)])->saveQuietly();
    }

    /** @return array<int, AssistantMessage|UserMessage> */
    private function history(AiConversation $conversation): array
    {
        $method = new ReflectionMethod(KiteLedgerCopilotService::class, 'history');

        return $method->invoke(app(KiteLedgerCopilotService::class), $conversation);
    }

    public function test_history_keeps_the_newest_turns_not_the_oldest(): void
    {
        config(['ai.copilot.history_messages' => 4]);
        config(['ai.copilot.history_token_budget' => 100000]);

        $conversation = $this->conversation();

        // Ten turns, oldest first.
        for ($i = 10; $i >= 1; $i--) {
            $this->addMessage($conversation, $i % 2 === 0 ? 'assistant' : 'user', "turn {$i}", $i);
        }

        $contents = array_map(
            static fn ($message) => $message->getContent(),
            $this->history($conversation),
        );

        $this->assertSame(['turn 4', 'turn 3', 'turn 2', 'turn 1'], $contents);
        $this->assertNotContains('turn 10', $contents, 'The oldest turn must not survive the window.');
    }

    public function test_history_is_returned_in_chronological_order_for_the_model(): void
    {
        config(['ai.copilot.history_messages' => 20]);
        config(['ai.copilot.history_token_budget' => 100000]);

        $conversation = $this->conversation();
        $this->addMessage($conversation, 'user', 'first question', 3);
        $this->addMessage($conversation, 'assistant', 'first answer', 2);
        $this->addMessage($conversation, 'user', 'follow-up', 1);

        $history = $this->history($conversation);

        $this->assertSame('first question', $history[0]->getContent());
        $this->assertSame('first answer', $history[1]->getContent());
        $this->assertSame('follow-up', $history[2]->getContent());
        $this->assertInstanceOf(AssistantMessage::class, $history[1]);
        $this->assertInstanceOf(UserMessage::class, $history[2]);
    }

    public function test_a_token_budget_drops_the_oldest_turns_not_the_request(): void
    {
        config(['ai.copilot.history_messages' => 20]);
        // Roughly 250 characters at the 4-chars-per-token estimate.
        config(['ai.copilot.history_token_budget' => 500]);

        $conversation = $this->conversation();

        // Three long turns; the budget fits fewer than all of them.
        $this->addMessage($conversation, 'user', str_repeat('a', 1200), 3);
        $this->addMessage($conversation, 'assistant', str_repeat('b', 1200), 2);
        $this->addMessage($conversation, 'user', 'what is my overdue total?', 1);

        $contents = array_map(
            static fn ($message) => $message->getContent(),
            $this->history($conversation),
        );

        $this->assertContains('what is my overdue total?', $contents, 'The newest turn must always be kept.');
        $this->assertNotContains(str_repeat('a', 1200), $contents);
    }

    public function test_the_newest_turn_survives_even_when_it_alone_exceeds_the_budget(): void
    {
        config(['ai.copilot.history_messages' => 20]);
        config(['ai.copilot.history_token_budget' => 500]);

        $conversation = $this->conversation();
        $this->addMessage($conversation, 'user', 'older', 2);
        $this->addMessage($conversation, 'user', str_repeat('z', 20000), 1);

        $history = $this->history($conversation);

        $this->assertCount(1, $history);
        $this->assertSame(str_repeat('z', 20000), $history[0]->getContent());
    }

    public function test_system_and_tool_rows_are_not_replayed_as_conversation(): void
    {
        config(['ai.copilot.history_messages' => 20]);
        config(['ai.copilot.history_token_budget' => 100000]);

        $conversation = $this->conversation();
        $this->addMessage($conversation, 'system', 'internal note', 2);
        $this->addMessage($conversation, 'user', 'real question', 1);

        $contents = array_map(
            static fn ($message) => $message->getContent(),
            $this->history($conversation),
        );

        $this->assertSame(['real question'], $contents);
    }
}
