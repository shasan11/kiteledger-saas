<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\User;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotRequest;
use App\Services\AI\Copilot\CopilotRouter;
use App\Services\AI\Copilot\CopilotTrace;
use App\Services\AI\Copilot\NeuronProviderFactory;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use NeuronAI\Providers\AIProviderInterface;
use NeuronAI\Testing\FakeAIProvider;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

/**
 * Runs the versioned Copilot evaluation dataset.
 *
 * Only the deterministic layers are scored here: Layer A (safety) and Layer B
 * (exact patterns) reach a decision without any model, so these results are
 * reproducible and need no paid provider. Model-dependent accuracy (Layer C)
 * requires a live provider and is deliberately kept out of the default suite.
 */
class CopilotEvaluationTest extends TestCase
{
    use RefreshDatabase;

    private const DATASET_PATH = __DIR__.'/../../Evaluations/Copilot';

    public static function deterministicCases(): array
    {
        $cases = [];

        foreach (['adversarial_questions.json', 'record_lookup.json'] as $file) {
            $path = self::DATASET_PATH.'/'.$file;

            if (! is_readable($path)) {
                continue;
            }

            $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

            foreach ($data['cases'] ?? [] as $case) {
                $cases[$file.':'.$case['id']] = [$case];
            }
        }

        return $cases;
    }

    private function router(): CopilotRouter
    {
        // No responses queued: if a deterministic case reaches Layer C the
        // fake provider runs dry and the test fails, which is the point.
        $fake = new FakeAIProvider();

        $factory = new class($fake) extends NeuronProviderFactory {
            public function __construct(private readonly AIProviderInterface $fake)
            {
            }

            public function chat(): AIProviderInterface
            {
                return $this->fake;
            }
        };

        return new CopilotRouter($factory);
    }

    private function makeRequest(string $message): CopilotRequest
    {
        $user = User::factory()->create();

        return new CopilotRequest(
            user: $user,
            message: $message,
            conversation: null,
            context: new CopilotContext(
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
            ),
            contextType: 'general',
            safeContextPayload: [],
            allowCache: false,
            requestId: 'eval',
        );
    }

    #[DataProvider('deterministicCases')]
    public function test_evaluation_case(array $case): void
    {
        $decision = $this->router()->route(
            $this->makeRequest($case['question']),
            new CopilotTrace('eval'),
        );

        $id = $case['id'];

        $this->assertSame(
            $case['expected_intent'],
            $decision->intent->value,
            "[{$id}] wrong intent for: {$case['question']}",
        );

        if ($case['expect_blocked'] ?? false) {
            $this->assertTrue($decision->isBlocked(), "[{$id}] must be blocked");

            // A refusal must not echo the attacker's payload back to the user.
            foreach ($case['must_not_contain'] ?? [] as $needle) {
                $this->assertStringNotContainsString(
                    strtolower($needle),
                    strtolower((string) $decision->blockedReason),
                    "[{$id}] refusal leaked: {$needle}",
                );
            }
        }

        foreach ($case['expected_tools'] ?? [] as $tool) {
            $this->assertContains($tool, $decision->candidateTools, "[{$id}] missing tool {$tool}");
        }

        foreach ($case['forbidden_tools'] ?? [] as $tool) {
            $this->assertNotContains($tool, $decision->candidateTools, "[{$id}] forbidden tool {$tool}");
        }

        foreach ($case['expected_filters'] ?? [] as $key => $value) {
            $this->assertSame($value, $decision->filters[$key] ?? null, "[{$id}] filter {$key} mismatch");
        }

        if (in_array('requires_live_data', $case['expected_answer_properties'] ?? [], true)) {
            $this->assertTrue($decision->requiresLiveData, "[{$id}] must require live data");
        }
    }
}
