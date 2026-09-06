<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\User;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\KiteLedgerCopilotService;
use App\Services\AI\Copilot\NeuronProviderFactory;
use App\Services\AI\Copilot\ToolAuthorizationService;
use App\Services\AI\AiSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use NeuronAI\Chat\Messages\AssistantMessage;
use NeuronAI\Providers\AIProviderInterface;
use NeuronAI\Testing\FakeAIProvider;
use Tests\TestCase;

/**
 * Phase 1: the Copilot streams real text as the model produces it.
 *
 * The regression this guards against is a `/stream` endpoint that blocks for
 * the whole turn and then emits one finished answer — the shape the frontend
 * already expected, but which delivered none of the benefit.
 */
class CopilotStreamingTest extends TestCase
{
    use RefreshDatabase;

    private FakeAIProvider $fake;

    protected function setUp(): void
    {
        parent::setUp();

        $this->fake = new FakeAIProvider(new AssistantMessage('Sales this month are AED 248,340.'));
        $this->fake->setStreamChunkSize(8);

        $fake = $this->fake;

        $this->app->bind(NeuronProviderFactory::class, fn () => new class($fake) extends NeuronProviderFactory
        {
            public function __construct(private readonly AIProviderInterface $fake) {}

            public function chat(bool $interactive = false): AIProviderInterface
            {
                return $this->fake;
            }
        });
    }

    private function context(User $user): CopilotContext
    {
        return new CopilotContext(
            user: $user,
            tenantId: null,
            tenantConnection: 'tenant',
            branchId: null,
            allowedBranchIds: [],
            fiscalYearId: null,
            allowedFiscalYearIds: [],
            permissions: ['ai.use'],
            applicationUrl: 'https://tenant.test',
            module: 'general',
            conversationId: null,
            locale: 'en',
            baseCurrency: 'AED',
            timezone: 'UTC',
            request: Request::create('/api/ai/chat', 'POST'),
        );
    }

    private function conversationWithQuestion(User $user, string $question): AiConversation
    {
        $conversation = AiConversation::create([
            'user_id' => $user->id,
            'branch_id' => null,
            'module' => 'general',
            'title' => 'stream',
            'status' => 'active',
        ]);

        AiMessage::create([
            'ai_conversation_id' => $conversation->id,
            'role' => 'user',
            'content' => $question,
        ]);

        return $conversation;
    }

    private function service(): KiteLedgerCopilotService
    {
        return new KiteLedgerCopilotService(
            app(NeuronProviderFactory::class),
            app(ToolAuthorizationService::class),
            app(AiSettingsService::class),
        );
    }

    public function test_the_answer_arrives_as_multiple_deltas_not_one_final_blob(): void
    {
        $user = User::factory()->create();
        $conversation = $this->conversationWithQuestion($user, 'How much did we sell this month?');

        $deltas = [];

        $result = $this->service()->respondStreamed(
            $this->context($user),
            $conversation,
            [],
            function (string $text) use (&$deltas): void {
                $deltas[] = $text;
            },
        );

        // More than one fragment is the whole point: a single delta carrying
        // the finished answer is the fake-streaming behaviour being replaced.
        $this->assertGreaterThan(1, count($deltas));
        $this->assertSame('Sales this month are AED 248,340.', implode('', $deltas));
        $this->assertSame('Sales this month are AED 248,340.', $result['text']);
        $this->assertTrue($result['streamed']);
    }

    public function test_the_streamed_text_matches_the_non_streamed_answer(): void
    {
        $user = User::factory()->create();

        $streamedConversation = $this->conversationWithQuestion($user, 'How much did we sell this month?');
        $streamed = $this->service()->respondStreamed(
            $this->context($user),
            $streamedConversation,
            [],
            static function (string $text): void {},
        );

        $this->fake->addResponses(new AssistantMessage('Sales this month are AED 248,340.'));

        $blockingConversation = $this->conversationWithQuestion($user, 'How much did we sell this month?');
        $blocking = $this->service()->respond(
            $this->context($user),
            $blockingConversation,
            [],
        );

        $this->assertSame($blocking['text'], $streamed['text']);
    }

    public function test_the_narrowed_toolset_reaches_the_provider(): void
    {
        $user = User::factory()->create();
        $conversation = $this->conversationWithQuestion($user, 'hello');

        $this->service()->respondStreamed(
            $this->context($user),
            $conversation,
            [],
            static function (string $text): void {},
        );

        // An empty scope means a greeting turn offers the model no tools at
        // all, so it cannot spuriously call one.
        $this->fake->assertToolsConfigured([]);
    }
}
