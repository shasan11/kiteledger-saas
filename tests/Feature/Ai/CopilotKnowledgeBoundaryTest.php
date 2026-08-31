<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\Knowledge\CopilotKnowledgePolicy;
use App\Services\AI\Copilot\Knowledge\KnowledgeSourceClass;
use App\Services\AI\Rag\AiCandidateGenerator;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Milestone 4: RAG is bounded to knowledge, never to live figures, and the
 * retrieval authorization holes fail closed.
 */
class CopilotKnowledgeBoundaryTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (['sales.invoice.view', 'master.contact.view'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function candidate(string $sourceType, float $score, string $key = 'k1', string $content = 'text'): array
    {
        return [
            'source_type' => $sourceType,
            'source_key' => $key,
            'content' => $content,
            'final_score' => $score,
        ];
    }

    // ---------- Source classification ----------

    public static function sourceTypes(): array
    {
        return [
            'documentation' => ['documentation', KnowledgeSourceClass::ApplicationKnowledge, true],
            'app help' => ['app_help', KnowledgeSourceClass::ApplicationKnowledge, true],
            'route' => ['route', KnowledgeSourceClass::ApplicationKnowledge, true],
            'knowledge chunk' => ['knowledge', KnowledgeSourceClass::ApplicationKnowledge, true],
            'tenant doc' => ['tenant_document', KnowledgeSourceClass::TenantDocument, true],
            'invoice' => ['invoice', KnowledgeSourceClass::BusinessRecord, false],
            'contact' => ['contact', KnowledgeSourceClass::BusinessRecord, false],
            'product' => ['product', KnowledgeSourceClass::BusinessRecord, false],
        ];
    }

    #[DataProvider('sourceTypes')]
    public function test_source_types_are_classified_and_business_records_are_never_authoritative(
        string $sourceType,
        KnowledgeSourceClass $expected,
        bool $authoritative,
    ): void {
        $class = KnowledgeSourceClass::classify($sourceType);

        $this->assertSame($expected, $class);
        $this->assertSame($authoritative, $class->isAuthoritative());
    }

    public function test_business_records_face_a_higher_relevance_bar_than_documentation(): void
    {
        $this->assertGreaterThan(
            KnowledgeSourceClass::ApplicationKnowledge->minRelevanceScore(),
            KnowledgeSourceClass::BusinessRecord->minRelevanceScore(),
        );
    }

    // ---------- The core boundary ----------

    public function test_live_data_questions_receive_no_knowledge_evidence_at_all(): void
    {
        $policy = app(CopilotKnowledgePolicy::class);

        $this->assertFalse($policy->allowsRetrieval(AnswerSourcePolicy::LiveToolRequired));

        $result = $policy->admit([
            $this->candidate('documentation', 0.99),
            $this->candidate('invoice', 0.99, 'inv-1'),
        ], AnswerSourcePolicy::LiveToolRequired);

        $this->assertSame([], $result['evidence'], 'A balance question must not be grounded on indexed text.');
        $this->assertSame(2, $result['rejected']['live_policy']);
    }

    public function test_metric_intent_maps_to_the_live_only_policy(): void
    {
        // Ties the router's intent vocabulary to the retrieval boundary.
        $this->assertSame(
            AnswerSourcePolicy::LiveToolRequired,
            CopilotIntent::MetricQuery->sourcePolicy(),
        );
        $this->assertSame(
            AnswerSourcePolicy::LiveToolRequired,
            CopilotIntent::RecordLookup->sourcePolicy(),
        );
        $this->assertTrue(CopilotIntent::AppHelp->sourcePolicy()->allowsKnowledgeRetrieval());
    }

    public function test_documentation_questions_admit_documentation_but_drop_record_snapshots(): void
    {
        $result = app(CopilotKnowledgePolicy::class)->admit([
            $this->candidate('documentation', 0.80, 'doc-1'),
            $this->candidate('invoice', 0.95, 'inv-1'),
        ], AnswerSourcePolicy::KnowledgeRetrievalAllowed);

        $types = array_column($result['evidence'], 'source_type');

        $this->assertContains('documentation', $types);
        $this->assertNotContains('invoice', $types, 'Record snapshots must not ground a help answer.');
        $this->assertSame(1, $result['rejected']['non_authoritative']);
    }

    public function test_weak_matches_are_rejected_rather_than_grounded(): void
    {
        // 0.05 is a reasonable candidate-generation score but far too weak to
        // ground an answer on.
        $result = app(CopilotKnowledgePolicy::class)->admit([
            $this->candidate('documentation', 0.05),
        ], AnswerSourcePolicy::KnowledgeRetrievalAllowed);

        $this->assertSame([], $result['evidence']);
        $this->assertSame(1, $result['rejected']['below_threshold']);
        $this->assertFalse(app(CopilotKnowledgePolicy::class)->hasSufficientEvidence($result['evidence']));
    }

    public function test_duplicate_sources_are_collapsed(): void
    {
        $result = app(CopilotKnowledgePolicy::class)->admit([
            $this->candidate('documentation', 0.80, 'doc-1'),
            $this->candidate('documentation', 0.75, 'doc-1'),
        ], AnswerSourcePolicy::KnowledgeRetrievalAllowed);

        $this->assertCount(1, $result['evidence']);
        $this->assertSame(1, $result['rejected']['duplicate']);
    }

    public function test_admitted_evidence_is_labelled_with_its_authority(): void
    {
        $result = app(CopilotKnowledgePolicy::class)->admit([
            $this->candidate('documentation', 0.80),
        ], AnswerSourcePolicy::KnowledgeRetrievalAllowed);

        $this->assertTrue($result['evidence'][0]['authoritative']);
        $this->assertSame('KiteLedger documentation', $result['evidence'][0]['evidence_label']);
        $this->assertSame('application_knowledge', $result['evidence'][0]['source_class']);
    }

    // ---------- Authorization holes ----------

    public function test_a_permissioned_chunk_is_not_released_to_a_null_user(): void
    {
        $generator = app(AiCandidateGenerator::class);

        $permitted = (new \ReflectionMethod($generator, 'permitted'));

        // Null user + a required permission must fail closed.
        $this->assertFalse($permitted->invoke($generator, null, 'sales.invoice.view'));

        // Chunks with no permission requirement stay public.
        $this->assertTrue($permitted->invoke($generator, null, null));
    }

    public function test_business_record_vector_hits_require_their_domain_permission(): void
    {
        $generator = app(AiCandidateGenerator::class);
        $fromVectorHit = new \ReflectionMethod($generator, 'fromVectorHit');

        $hit = ['source_type' => 'invoice', 'source_id' => 'abc', 'snippet' => 'INV-1', 'score' => 0.9];

        $withoutPermission = User::factory()->create();
        $this->assertNull(
            $fromVectorHit->invoke($generator, $hit, $withoutPermission->fresh(), []),
            'An invoice vector hit must be dropped without sales.invoice.view.',
        );

        $withPermission = User::factory()->create();
        $withPermission->givePermissionTo('sales.invoice.view');

        $candidate = $fromVectorHit->invoke($generator, $hit, $withPermission->fresh(), []);
        $this->assertNotNull($candidate);
        $this->assertSame('sales.invoice.view', $candidate['permission']);
    }

    public function test_unmapped_business_record_types_are_treated_as_unauthorized(): void
    {
        $generator = app(AiCandidateGenerator::class);
        $fromVectorHit = new \ReflectionMethod($generator, 'fromVectorHit');

        $user = User::factory()->create();

        $this->assertTrue(KnowledgeSourceClass::isUnmappedBusinessRecord('secret_ledger'));
        $this->assertNull($fromVectorHit->invoke($generator, [
            'source_type' => 'secret_ledger', 'source_id' => 'x', 'snippet' => 's', 'score' => 0.9,
        ], $user->fresh(), []));
    }
}
