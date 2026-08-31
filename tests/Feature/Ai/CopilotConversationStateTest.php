<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiConversation;
use App\Models\User;
use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotConversationState;
use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\CopilotRoutingDecision;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

/**
 * Milestone 5: follow-ups resolve from structured state, and that state is
 * discarded whenever the trusted scope changes.
 */
class CopilotConversationStateTest extends TestCase
{
    use RefreshDatabase;

    private function context(User $user, ?string $branchId = null, ?string $fiscalYearId = null): CopilotContext
    {
        return new CopilotContext(
            user: $user,
            tenantId: 'tenant-1',
            tenantConnection: 'tenant',
            branchId: $branchId,
            allowedBranchIds: [],
            fiscalYearId: $fiscalYearId,
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

    private function conversation(User $user): AiConversation
    {
        return AiConversation::create([
            'user_id' => $user->id,
            'module' => 'sales',
            'title' => 'Sales talk',
            'status' => 'active',
        ]);
    }

    private function decision(array $filters = [], array $entities = [], CopilotIntent $intent = CopilotIntent::MetricQuery): CopilotRoutingDecision
    {
        return new CopilotRoutingDecision(
            intent: $intent,
            confidence: 0.9,
            requiresLiveData: true,
            requiresKnowledge: false,
            candidateTools: ['financial_metrics.query'],
            entities: $entities,
            filters: $filters,
            missingFields: [],
            reason: null,
            decidedBy: 'model_classification',
            sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
        );
    }

    public function test_follow_up_inherits_entity_and_metric_from_the_previous_turn(): void
    {
        $user = User::factory()->create();
        $context = $this->context($user);
        $conversation = $this->conversation($user);

        // Turn 1: "Show sales for ABC Trading this month."
        CopilotConversationState::empty()
            ->rememberFrom($this->decision(
                ['metric' => 'net_sales', 'module' => 'sales', 'date_range' => ['from' => '2026-08-01', 'to' => '2026-08-31', 'preset' => 'this_month']],
                ['ABC Trading'],
            ), $context)
            ->persist($conversation);

        // Turn 2: "Compare it with last month." — no entity, no metric.
        $state = CopilotConversationState::load($conversation->fresh(), $context);
        $resolved = $state->applyTo($this->decision([
            'comparison_range' => ['from' => '2026-07-01', 'to' => '2026-07-31', 'preset' => 'last_month'],
        ]));

        $this->assertSame('net_sales', $resolved->filters['metric']);
        $this->assertContains('ABC Trading', $resolved->entities);
        $this->assertTrue($resolved->filters['inherited_entity']);
        $this->assertSame('last_month', $resolved->filters['comparison_range']['preset']);
    }

    public function test_a_restated_value_wins_over_remembered_context(): void
    {
        $user = User::factory()->create();
        $context = $this->context($user);
        $conversation = $this->conversation($user);

        CopilotConversationState::empty()
            ->rememberFrom($this->decision(['metric' => 'net_sales'], ['ABC Trading']), $context)
            ->persist($conversation);

        $resolved = CopilotConversationState::load($conversation->fresh(), $context)
            ->applyTo($this->decision(['metric' => 'accounts_receivable'], ['XYZ Limited']));

        $this->assertSame('accounts_receivable', $resolved->filters['metric'], 'Current turn must win.');
        $this->assertContains('XYZ Limited', $resolved->entities);
        $this->assertNotContains('ABC Trading', $resolved->entities);
    }

    public function test_state_is_discarded_when_the_branch_changes(): void
    {
        $user = User::factory()->create();
        $conversation = $this->conversation($user);

        CopilotConversationState::empty()
            ->rememberFrom($this->decision(['metric' => 'net_sales'], ['ABC Trading']), $this->context($user, 'branch-a'))
            ->persist($conversation);

        // Same conversation, different branch scope.
        $state = CopilotConversationState::load($conversation->fresh(), $this->context($user, 'branch-b'));

        $this->assertTrue($state->isEmpty(), 'Remembered scope must not leak across branches.');
    }

    public function test_state_is_discarded_when_the_fiscal_year_changes(): void
    {
        $user = User::factory()->create();
        $conversation = $this->conversation($user);

        CopilotConversationState::empty()
            ->rememberFrom($this->decision(['metric' => 'net_sales']), $this->context($user, 'branch-a', 'fy-2025'))
            ->persist($conversation);

        $state = CopilotConversationState::load($conversation->fresh(), $this->context($user, 'branch-a', 'fy-2026'));

        $this->assertTrue($state->isEmpty());
    }

    public function test_state_is_not_reused_across_users(): void
    {
        $owner = User::factory()->create();
        $other = User::factory()->create();
        $conversation = $this->conversation($owner);

        CopilotConversationState::empty()
            ->rememberFrom($this->decision(['metric' => 'net_sales'], ['ABC Trading']), $this->context($owner))
            ->persist($conversation);

        $state = CopilotConversationState::load($conversation->fresh(), $this->context($other));

        $this->assertTrue($state->isEmpty(), 'A different user must never inherit resolved entities.');
    }

    public function test_pending_clarification_is_stored_and_cleared(): void
    {
        $user = User::factory()->create();
        $context = $this->context($user);
        $conversation = $this->conversation($user);

        $clarify = CopilotRoutingDecision::clarification(['customer'], 'Which customer?', 'confidence_gate');

        CopilotConversationState::empty()->rememberFrom($clarify, $context)->persist($conversation);

        $state = CopilotConversationState::load($conversation->fresh(), $context);
        $this->assertSame(['customer'], $state->pendingClarification);

        // A successful turn clears it.
        $state->rememberFrom($this->decision(['metric' => 'net_sales']), $context)->persist($conversation);
        $this->assertSame([], CopilotConversationState::load($conversation->fresh(), $context)->pendingClarification);
    }

    public function test_state_never_stores_or_exposes_internal_identifiers(): void
    {
        $user = User::factory()->create();
        $context = $this->context($user);
        $conversation = $this->conversation($user);

        // An id-shaped entity must be refused on load.
        $conversation->forceFill(['metadata' => ['copilot_state' => [
            'entities' => ['customer' => '019fc60b-8de9-738f-a82e-9f9df222505b'],
            'scope_fingerprint' => hash('sha256', implode('|', [
                (string) $user->id, '', '', 'tenant-1',
            ])),
        ]]])->save();

        $state = CopilotConversationState::load($conversation->fresh(), $context);

        $this->assertSame([], $state->entities, 'UUID-shaped values must never enter state.');

        $encoded = json_encode($state->promptSummary());
        $this->assertStringNotContainsString('019fc60b', (string) $encoded);
    }

    public function test_blocked_decisions_do_not_pollute_state(): void
    {
        $user = User::factory()->create();
        $context = $this->context($user);

        $before = CopilotConversationState::empty()
            ->rememberFrom($this->decision(['metric' => 'net_sales']), $context);

        $after = $before->rememberFrom(
            CopilotRoutingDecision::blocked('drop table attempt'),
            $context,
        );

        $this->assertSame('net_sales', $after->filters['metric']);
    }
}
