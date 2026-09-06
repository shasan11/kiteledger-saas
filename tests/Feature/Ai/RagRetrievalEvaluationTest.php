<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiKnowledgeChunk;
use App\Models\Permission;
use App\Services\AI\AiPermissionService;
use App\Services\AI\Knowledge\AppKnowledgeIndexer;
use App\Services\AI\Rag\AiHybridRetriever;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Phase 4: measured retrieval quality, not an assumed threshold.
 *
 * The previous position was that top-K, minimum score and fusion weights were
 * tuned by judgement with nothing to check them against, so a change that
 * improved one question could quietly ruin five others. This runs a fixed set of
 * realistic questions and reports Recall@1/3/5 and MRR, with floors that fail
 * the build on a regression.
 *
 * Runs without a provider: embeddings are unavailable in the suite, so this
 * measures the lexical and exact-match half of the pipeline. That is the half
 * that must never regress, because it is also the fallback whenever a tenant
 * has no embedding provider configured.
 */
class RagRetrievalEvaluationTest extends TestCase
{
    use RefreshDatabase;

    /**
     * Floors, not targets.
     *
     * Measured baseline on 2026-09-01, after the query normalizer stopped
     * counting question words as search terms: Recall@1 1.00, Recall@3 1.00,
     * Recall@5 1.00, MRR 1.00 over 13 cases. Before that change the same set
     * scored 0.85 across the board, with one question returning nothing at all.
     *
     * The floors sit just under the baseline so ordinary noise does not fail
     * the build while a real regression does. Raise them when retrieval
     * genuinely improves; never lower one to make a failing change pass —
     * the failure message names the questions that regressed.
     */
    private const MIN_RECALL_AT_1 = 0.85;

    private const MIN_RECALL_AT_3 = 0.92;

    private const MIN_RECALL_AT_5 = 0.92;

    private const MIN_MRR = 0.88;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (AiPermissionService::ALL as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @return array<int, array<string, mixed>> */
    private function cases(): array
    {
        $path = __DIR__.'/../../Evaluations/Rag/app_help_questions.json';

        $data = json_decode((string) file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);

        return $data['cases'] ?? [];
    }

    /**
     * Rank of the expected document in the retrieved list, or null if absent.
     *
     * @param  array<int, array<string, mixed>>  $sources
     */
    private function rankOf(array $sources, string $expectedTitle): ?int
    {
        foreach (array_values($sources) as $index => $source) {
            if (Str::lower((string) ($source['label'] ?? '')) === Str::lower($expectedTitle)) {
                return $index + 1;
            }
        }

        return null;
    }

    public function test_app_help_retrieval_meets_its_quality_floors(): void
    {
        app(AppKnowledgeIndexer::class)->index(false);

        $retriever = app(AiHybridRetriever::class);
        $cases = $this->cases();

        $this->assertNotEmpty($cases, 'The evaluation dataset must not be empty.');

        $ranks = [];
        $misses = [];

        foreach ($cases as $case) {
            $result = $retriever->retrieve(null, $case['question']);
            $rank = $this->rankOf($result['sources'] ?? [], $case['expected_title']);

            $ranks[$case['id']] = $rank;

            if ($rank === null || $rank > 5) {
                $misses[] = sprintf(
                    '[%s] "%s" expected "%s" but got: %s',
                    $case['id'],
                    $case['question'],
                    $case['expected_title'],
                    implode(', ', array_slice(array_column($result['sources'] ?? [], 'label'), 0, 5)) ?: '(nothing)',
                );
            }
        }

        $total = count($ranks);
        $recallAt = static fn (int $k): float => count(array_filter(
            $ranks,
            static fn (?int $rank): bool => $rank !== null && $rank <= $k,
        )) / $total;

        $mrr = array_sum(array_map(
            static fn (?int $rank): float => $rank === null ? 0.0 : 1 / $rank,
            $ranks,
        )) / $total;

        $report = sprintf(
            "Recall@1 %.2f  Recall@3 %.2f  Recall@5 %.2f  MRR %.2f over %d cases.\nMisses:\n%s",
            $recallAt(1),
            $recallAt(3),
            $recallAt(5),
            $mrr,
            $total,
            $misses === [] ? '  (none)' : '  '.implode("\n  ", $misses),
        );

        $this->assertGreaterThanOrEqual(self::MIN_RECALL_AT_1, $recallAt(1), $report);
        $this->assertGreaterThanOrEqual(self::MIN_RECALL_AT_3, $recallAt(3), $report);
        $this->assertGreaterThanOrEqual(self::MIN_RECALL_AT_5, $recallAt(5), $report);
        $this->assertGreaterThanOrEqual(self::MIN_MRR, $mrr, $report);
    }

    public function test_an_irrelevant_question_does_not_return_confident_help(): void
    {
        // Returning the closest available document for a question the knowledge
        // base cannot answer is how a user is told something confidently wrong.
        app(AppKnowledgeIndexer::class)->index(false);

        $result = app(AiHybridRetriever::class)->retrieve(
            null,
            'What is the weather forecast for Dubai next Tuesday?',
        );

        $confidence = $result['confidence']['level'] ?? $result['confidence']['label'] ?? null;

        $this->assertNotSame('high', Str::lower((string) $confidence));
    }

    public function test_an_old_document_is_still_retrievable(): void
    {
        /*
         * The regression this pins: the semantic candidate pool was ordered by
         * `updated_at`, so documentation that had not been touched recently fell
         * out of consideration entirely however well it matched. Recency is not
         * relevance — a help article written a year ago is exactly as correct as
         * one written yesterday.
         */
        app(AppKnowledgeIndexer::class)->index(false);

        // Age every chunk except the target, so the target is the *oldest*
        // thing in the corpus.
        AiKnowledgeChunk::query()->update(['updated_at' => now()]);
        AiKnowledgeChunk::query()
            ->where('title', 'Cheque Format Settings')
            ->update(['updated_at' => now()->subYears(3), 'created_at' => now()->subYears(3)]);

        $result = app(AiHybridRetriever::class)->retrieve(
            null,
            'How do I configure the cheque printing layout?',
        );

        $labels = array_column($result['sources'] ?? [], 'label');

        $this->assertContains(
            'Cheque Format Settings',
            $labels,
            'A three-year-old help article must still be retrievable.',
        );
    }

    public function test_the_dataset_names_only_documents_the_indexer_produces(): void
    {
        // A dataset that drifts from the corpus measures nothing: every case
        // would "miss" for a reason unrelated to retrieval quality.
        app(AppKnowledgeIndexer::class)->index(false);

        $titles = AiKnowledgeChunk::query()->pluck('title')->map(fn ($t) => Str::lower((string) $t))->all();

        foreach ($this->cases() as $case) {
            $this->assertContains(
                Str::lower($case['expected_title']),
                $titles,
                "[{$case['id']}] expects a document the indexer does not create.",
            );
        }
    }
}
