<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\CopilotResponseComposer;
use App\Services\AI\Copilot\CopilotResponseType;
use App\Services\AI\Copilot\CopilotRoutingDecision;
use App\Services\AI\Copilot\Knowledge\ParentDocumentExpander;
use App\Services\AI\Copilot\Knowledge\ReciprocalRankFusion;
use App\Services\AI\Copilot\Tools\CopilotToolResult;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

/**
 * Plan-driven execution, response composition, RRF and parent expansion.
 */
class CopilotPlanExecutionTest extends TestCase
{
    use RefreshDatabase;

    private function decision(array $filters = []): CopilotRoutingDecision
    {
        return new CopilotRoutingDecision(
            intent: CopilotIntent::MetricQuery,
            confidence: 0.95,
            requiresLiveData: true,
            requiresKnowledge: false,
            candidateTools: ['financial_metrics.query'],
            entities: [],
            filters: $filters,
            missingFields: [],
            reason: null,
            decidedBy: 'model_classification',
            sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
        );
    }

    // ---------- Response composition ----------

    public function test_composer_builds_verified_cards_and_tables_from_a_tool_result(): void
    {
        $result = new CopilotToolResult(
            tool: 'financial_metrics.query',
            verified: true,
            dataSource: 'live_database',
            rows: [
                ['customer' => 'ABC Trading', 'balance' => 12500.5],
                ['customer' => 'XYZ Limited', 'balance' => 8300.0],
            ],
            metrics: ['total' => 20800.5],
            appliedFilters: ['metric' => 'accounts_receivable'],
            currency: 'AED',
            dateFrom: '2026-08-01',
            dateTo: '2026-08-31',
            branchScope: 'All permitted branches',
            calculationDefinition: 'Total outstanding owed by customers.',
            asOf: Carbon::parse('2026-08-03T10:00:00Z'),
        );

        $response = app(CopilotResponseComposer::class)
            ->fromToolResult($result, $this->decision(), 'Accounts receivable');

        $this->assertSame(CopilotResponseType::VerifiedToolAnswer, $response->type);
        $this->assertTrue($response->verified);
        $this->assertSame('AED', $response->currency);
        $this->assertSame(['financial_metrics.query'], $response->toolsUsed);

        // Card from the metric.
        $this->assertSame('Total', $response->cards[0]['label']);
        $this->assertSame(20800.5, $response->cards[0]['value']);
        $this->assertSame('AED', $response->cards[0]['currency']);

        // Table from the rows.
        $this->assertCount(2, $response->tables[0]['rows']);
        $this->assertSame(['customer', 'balance'], array_column($response->tables[0]['columns'], 'key'));

        $envelope = $response->toArray('conv', 'req');
        $this->assertSame('tool_query', $envelope['mode']);
        $this->assertTrue($envelope['evidence']['verified']);
        $this->assertNotNull($envelope['evidence']['as_of']);
    }

    public function test_composer_never_invents_a_figure_when_the_result_is_empty(): void
    {
        $result = new CopilotToolResult(
            tool: 'financial_metrics.query',
            verified: true,
            dataSource: 'live_database',
            currency: 'AED',
        );

        $response = app(CopilotResponseComposer::class)
            ->fromToolResult($result, $this->decision(), 'Accounts receivable');

        $this->assertSame([], $response->cards);
        $this->assertSame([], $response->tables);
        $this->assertStringContainsString('no matching records', $response->message);
    }

    public function test_model_narration_never_replaces_the_verified_numbers(): void
    {
        $result = new CopilotToolResult(
            tool: 'financial_metrics.query',
            verified: true,
            dataSource: 'live_database',
            metrics: ['total' => 999.0],
            currency: 'AED',
        );

        $response = app(CopilotResponseComposer::class)->fromToolResult(
            $result,
            $this->decision(),
            'Accounts receivable',
            'Receivables are healthy this month.',
        );

        // Narration becomes the prose, but the card still carries the computed value.
        $this->assertSame('Receivables are healthy this month.', $response->message);
        $this->assertSame(999.0, $response->cards[0]['value']);
    }

    // ---------- Reciprocal Rank Fusion ----------

    public function test_rrf_ranks_a_result_both_retrievers_liked_above_a_single_list_winner(): void
    {
        $both = ['source_type' => 'documentation', 'source_key' => 'both', 'content' => 'b'];
        $keywordOnly = ['source_type' => 'documentation', 'source_key' => 'kw', 'content' => 'k'];
        $vectorOnly = ['source_type' => 'documentation', 'source_key' => 'vec', 'content' => 'v'];

        $fused = app(ReciprocalRankFusion::class)->fuse([
            'keyword' => [$keywordOnly, $both],
            'vector' => [$vectorOnly, $both],
        ]);

        $this->assertSame('both', $fused[0]['source_key'], 'Agreement across retrievers must win.');
        $this->assertSame(2, $fused[0]['retriever_agreement']);
        $this->assertArrayHasKey('rrf_score', $fused[0]);
    }

    public function test_rrf_is_scale_free_and_ignores_raw_score_magnitude(): void
    {
        // A huge keyword score must not dominate; only rank matters.
        $a = ['source_type' => 'documentation', 'source_key' => 'a', 'keyword_score' => 9999.0];
        $b = ['source_type' => 'documentation', 'source_key' => 'b', 'keyword_score' => 0.1];

        $fused = app(ReciprocalRankFusion::class)->fuse([
            'keyword' => [$a, $b],
            'vector' => [$b, $a],
        ]);

        $this->assertEqualsWithDelta($fused[0]['rrf_score'], $fused[1]['rrf_score'], 0.000001);
    }

    public function test_rrf_deduplicates_the_same_source_across_lists(): void
    {
        $doc = ['source_type' => 'documentation', 'source_key' => 'same', 'content' => 'c'];

        $fused = app(ReciprocalRankFusion::class)->fuse([
            'keyword' => [$doc],
            'vector' => [$doc],
        ]);

        $this->assertCount(1, $fused);
    }

    // ---------- Parent-document expansion ----------

    public function test_expansion_leaves_long_chunks_alone(): void
    {
        $long = [
            'source_type' => 'documentation',
            'source_key' => 'doc:invoicing#2',
            'content' => str_repeat('a', 500),
        ];

        $result = app(ParentDocumentExpander::class)->expand([$long], fn () => true);

        $this->assertSame(0, $result['expanded']);
        $this->assertCount(1, $result['candidates']);
    }

    public function test_expansion_never_widens_business_record_exposure(): void
    {
        $narrowInvoice = [
            'source_type' => 'invoice',
            'source_key' => 'invoice:1',
            'content' => 'short',
        ];

        $result = app(ParentDocumentExpander::class)->expand([$narrowInvoice], fn () => true);

        $this->assertSame(0, $result['expanded'], 'Record chunks must not pull in siblings.');
    }
}
