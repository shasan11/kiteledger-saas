<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\CopilotRoutingDecision;
use App\Services\AI\Copilot\Tools\CopilotToolRegistry;
use App\Services\AI\Copilot\Tools\CopilotToolScope;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Phase 1: the model is shown only the tools the routing decision calls for.
 *
 * Narrowing is a precision and latency measure, never a security boundary — the
 * assertions below check both halves of that: irrelevant tools disappear, and
 * narrowing can never reveal a tool the user has no permission to use.
 */
class CopilotToolScopeTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (AiPermissionService::ALL as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        foreach (['reports.financial.view', 'inventory.report.view'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @param string[] $permissions */
    private function contextFor(array $permissions): CopilotContext
    {
        $user = User::factory()->create();

        foreach ($permissions as $p) {
            $user->givePermissionTo($p);
        }

        return new CopilotContext(
            user: $user->fresh(),
            tenantId: null,
            tenantConnection: 'tenant',
            branchId: null,
            allowedBranchIds: [],
            fiscalYearId: null,
            allowedFiscalYearIds: [],
            permissions: $permissions,
            applicationUrl: 'https://tenant.test',
            module: 'general',
            conversationId: null,
            locale: 'en',
            baseCurrency: 'AED',
            timezone: 'UTC',
            request: Request::create('/api/ai/chat', 'POST'),
        );
    }

    /** @param string[] $candidateTools */
    private function decisionFor(CopilotIntent $intent, array $candidateTools = []): CopilotRoutingDecision
    {
        return new CopilotRoutingDecision(
            intent: $intent,
            confidence: 0.9,
            requiresLiveData: $intent->requiresLiveData(),
            requiresKnowledge: false,
            candidateTools: $candidateTools,
            entities: [],
            filters: [],
            missingFields: [],
            reason: null,
            decidedBy: 'test',
            sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
        );
    }

    // ---------- Scope resolution ----------

    public function test_a_receivables_question_is_not_offered_inventory_or_action_tools(): void
    {
        $scope = app(CopilotToolScope::class)->resolve(
            $this->decisionFor(CopilotIntent::MetricQuery, ['financial_metrics.query']),
        );

        $this->assertSame(['financial_metrics.query'], $scope);
        $this->assertNotContains('inventory.position', $scope);
        $this->assertNotContains('actions.propose', $scope);
        $this->assertNotContains('knowledge.search', $scope);
    }

    public function test_an_app_help_question_is_not_offered_financial_tools(): void
    {
        $scope = app(CopilotToolScope::class)->resolve(
            $this->decisionFor(CopilotIntent::AppHelp, ['knowledge.search']),
        );

        $this->assertSame(['knowledge.search'], $scope);
        $this->assertNotContains('financial_metrics.query', $scope);
    }

    public function test_a_greeting_is_offered_no_tools_at_all(): void
    {
        $this->assertSame(
            [],
            app(CopilotToolScope::class)->resolve($this->decisionFor(CopilotIntent::Greeting)),
        );
    }

    public function test_a_candidate_tool_the_registry_does_not_know_is_discarded(): void
    {
        // Candidate names originate from a model classification, so an
        // unrecognized one must not survive into the offered toolset.
        $scope = app(CopilotToolScope::class)->resolve(
            $this->decisionFor(CopilotIntent::MetricQuery, ['payroll.exfiltrate']),
        );

        $this->assertNotContains('payroll.exfiltrate', $scope);
        $this->assertContains('financial_metrics.query', $scope);
    }

    // ---------- Registry narrowing ----------

    public function test_narrowing_removes_irrelevant_tools_from_the_permitted_set(): void
    {
        $context = $this->contextFor([
            'ai.use', 'ai.chat', 'ai.search', 'ai.financial_queries',
            'reports.financial.view', 'inventory.report.view',
        ]);

        $registry = app(CopilotToolRegistry::class);

        $everything = $registry->visibleFor($context);
        $narrowed = $registry->visibleFor($context, ['financial_metrics.query']);

        $this->assertArrayHasKey('inventory.position', $everything);
        $this->assertSame(['financial_metrics.query'], array_keys($narrowed));
    }

    public function test_narrowing_can_never_reveal_an_unpermitted_tool(): void
    {
        // A user with no financial permission asks for the financial tool by
        // name: narrowing must not become a way around authorization.
        $context = $this->contextFor(['ai.use', 'ai.chat', 'ai.search']);

        $narrowed = app(CopilotToolRegistry::class)
            ->visibleFor($context, ['financial_metrics.query', 'customers.balance']);

        $this->assertArrayNotHasKey('financial_metrics.query', $narrowed);
        $this->assertArrayNotHasKey('customers.balance', $narrowed);
    }

    public function test_a_scope_matching_nothing_permitted_falls_back_rather_than_disarming_the_agent(): void
    {
        // An agent with zero tools answers data questions from model memory,
        // which is worse than offering a slightly wider set.
        $context = $this->contextFor([
            'ai.use', 'ai.chat', 'ai.search', 'ai.financial_queries', 'reports.financial.view',
        ]);

        $narrowed = app(CopilotToolRegistry::class)
            ->visibleFor($context, ['nothing.here']);

        $this->assertNotEmpty($narrowed);
    }

    public function test_an_explicitly_empty_scope_is_honoured(): void
    {
        $context = $this->contextFor(['ai.use', 'ai.chat', 'ai.search', 'ai.financial_queries', 'reports.financial.view']);

        $this->assertSame([], app(CopilotToolRegistry::class)->visibleFor($context, []));
    }

    // ---------- Router candidate names ----------

    public function test_every_router_candidate_name_exists_in_the_registry(): void
    {
        // A candidate name that does not match a registry key silently narrows
        // to nothing and falls back to the full set, defeating the feature.
        $known = array_keys(app(CopilotToolRegistry::class)->all());
        $scopeClass = new \ReflectionClass(CopilotToolScope::class);
        $declared = $scopeClass->getConstant('INTENT_TOOLS');

        foreach ($declared as $intent => $tools) {
            foreach ($tools as $tool) {
                $this->assertContains($tool, $known, "Intent {$intent} names unknown tool {$tool}");
            }
        }
    }
}
