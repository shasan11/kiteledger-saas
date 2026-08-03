<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Neuron\Agents\Tools\QueryFinancialMetricTool;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\Metrics\CopilotMetricCatalog;
use App\Services\AI\Copilot\NeuronProviderFactory;
use App\Services\AI\Copilot\Tools\CopilotToolExecutor;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Regression cover for two defects that only surfaced against a live provider.
 *
 * Both produced HTTP 400 from Gemini and were masked by catch-all handling, so
 * neither was visible from the fake-provider tests.
 */
class NeuronProviderParametersTest extends TestCase
{
    use RefreshDatabase;

    private function parametersFor(string $provider): array
    {
        $factory = app(NeuronProviderFactory::class);

        $method = new \ReflectionMethod($factory, 'generationParameters');

        return $method->invoke($factory, $provider);
    }

    /**
     * Neuron spreads provider parameters straight into the request body, and
     * Gemini nests generation settings under generationConfig. Sending
     * OpenAI-style keys made Gemini reject every request with
     * 400 "Unknown name \"max_tokens\"".
     */
    public function test_gemini_parameters_are_nested_under_generation_config(): void
    {
        $parameters = $this->parametersFor('gemini');

        $this->assertArrayHasKey('generationConfig', $parameters);
        $this->assertArrayHasKey('temperature', $parameters['generationConfig']);
        $this->assertArrayHasKey('maxOutputTokens', $parameters['generationConfig']);

        $this->assertArrayNotHasKey('max_tokens', $parameters);
        $this->assertArrayNotHasKey('temperature', $parameters);
    }

    public function test_openai_compatible_parameters_stay_flat(): void
    {
        $parameters = $this->parametersFor('openai');

        $this->assertArrayHasKey('temperature', $parameters);
        $this->assertArrayHasKey('max_tokens', $parameters);
        $this->assertArrayNotHasKey('generationConfig', $parameters);
    }

    public function test_anthropic_omits_max_tokens_because_it_is_a_constructor_argument(): void
    {
        $parameters = $this->parametersFor('anthropic');

        $this->assertArrayHasKey('temperature', $parameters);
        $this->assertArrayNotHasKey('max_tokens', $parameters);
    }

    /**
     * A bare ARRAY ToolProperty emits no `items`, and Gemini rejects the tool
     * declaration with "parameters.properties[statuses].items: missing field".
     */
    public function test_array_tool_properties_declare_their_item_schema(): void
    {
        $user = User::factory()->create();

        $context = new CopilotContext(
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

        $tool = new QueryFinancialMetricTool(
            $context,
            app(CopilotToolExecutor::class),
            app(CopilotMetricCatalog::class),
        );

        $properties = json_decode(json_encode($tool->getProperties()), true);

        $statuses = collect($properties)->firstWhere('name', 'statuses');

        $this->assertNotNull($statuses, 'statuses property must exist');
        $this->assertSame('array', $statuses['type']);
        $this->assertArrayHasKey('items', $statuses, 'Gemini requires items on array properties.');
        $this->assertSame('string', $statuses['items']['type'] ?? null);
    }
}
