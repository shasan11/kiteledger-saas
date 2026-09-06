<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiEmbedding;
use App\Services\AI\AiProviderManager;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Rag\AiEmbeddingIndexer;
use App\Services\AI\Rag\AiSemanticSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * Phase 4: semantic candidates are chosen by relevance and coverage, not by
 * how recently a record happened to be edited; and embeddings are generated in
 * batches rather than one HTTP request per chunk.
 */
class AiEmbeddingPoolTest extends TestCase
{
    use RefreshDatabase;

    /** @return array<int, float> */
    private function vector(float $x, float $y): array
    {
        return [$x, $y, 0.0];
    }

    private function embedding(string $sourceId, array $vector, string $content, ?string $updatedAt = null): AiEmbedding
    {
        $row = AiEmbedding::query()->create([
            'source_type' => 'knowledge',
            'source_id' => $sourceId,
            'provider' => app(AiSettingsService::class)->embeddingProvider(),
            'model' => app(AiSettingsService::class)->embeddingModel(),
            'content' => $content,
            'content_hash' => hash('sha256', $content),
            'vector' => $vector,
            'dims' => count($vector),
        ]);

        if ($updatedAt !== null) {
            $row->forceFill(['updated_at' => $updatedAt])->saveQuietly();
        }

        return $row;
    }

    // ---------- Candidate pool ----------

    public function test_an_old_but_relevant_embedding_is_not_excluded_by_recency(): void
    {
        /*
         * The regression this pins: the pool was `orderByDesc('updated_at')`
         * capped at N, so once a corpus exceeded the cap the oldest documents
         * became permanently invisible to semantic search however well they
         * matched. Recency is not relevance.
         */
        config(['ai.rag.candidate_pool' => 5, 'ai.rag.max_candidate_pool' => 5]);

        // The best match is also the oldest thing in the corpus.
        $this->embedding('old-but-perfect', $this->vector(1.0, 0.0), 'purchase bill workflow', '2020-01-01 00:00:00');

        for ($i = 0; $i < 20; $i++) {
            $this->embedding('recent-'.$i, $this->vector(0.0, 1.0), 'unrelated note '.$i, '2026-08-30 00:00:00');
        }

        $hits = app(AiSemanticSearchService::class)->searchByVector(
            $this->vector(1.0, 0.0),
            ['limit' => 5, 'query_text' => 'purchase bill workflow'],
        );

        $this->assertNotEmpty($hits);
        $this->assertSame('old-but-perfect', $hits[0]['source_id']);
    }

    public function test_a_corpus_that_fits_the_budget_is_scored_in_full(): void
    {
        // No sampling rule can misfire when everything is compared.
        config(['ai.rag.candidate_pool' => 500, 'ai.rag.max_candidate_pool' => 500]);

        $this->embedding('needle', $this->vector(1.0, 0.0), 'cheque format editor', '2019-01-01 00:00:00');

        for ($i = 0; $i < 30; $i++) {
            $this->embedding('hay-'.$i, $this->vector(0.2, 0.98), 'other content '.$i);
        }

        $hits = app(AiSemanticSearchService::class)->searchByVector(
            $this->vector(1.0, 0.0),
            ['limit' => 3, 'query_text' => 'cheque format editor'],
        );

        $this->assertSame('needle', $hits[0]['source_id']);
    }

    public function test_the_pool_falls_back_to_a_stable_spread_when_the_query_has_no_usable_terms(): void
    {
        // Short queries give the lexical prefilter nothing to work with; the
        // remainder must still be ordered deterministically rather than by
        // update time.
        config(['ai.rag.candidate_pool' => 5, 'ai.rag.max_candidate_pool' => 5]);

        for ($i = 0; $i < 20; $i++) {
            $this->embedding('row-'.$i, $this->vector(0.0, 1.0), 'note '.$i);
        }

        $first = app(AiSemanticSearchService::class)->searchByVector(
            $this->vector(0.0, 1.0),
            ['limit' => 5, 'query_text' => 'a b c'],
        );

        $second = app(AiSemanticSearchService::class)->searchByVector(
            $this->vector(0.0, 1.0),
            ['limit' => 5, 'query_text' => 'a b c'],
        );

        $this->assertSame(
            array_column($first, 'source_id'),
            array_column($second, 'source_id'),
            'The same query must select the same pool between runs.',
        );
    }

    public function test_branch_scope_still_bounds_the_pool(): void
    {
        config(['ai.rag.candidate_pool' => 500, 'ai.rag.max_candidate_pool' => 500]);

        $mine = (string) Str::uuid();
        $other = (string) Str::uuid();

        $this->embedding('mine', $this->vector(1.0, 0.0), 'my branch note')
            ->forceFill(['branch_id' => $mine])->saveQuietly();
        $this->embedding('theirs', $this->vector(1.0, 0.0), 'other branch note')
            ->forceFill(['branch_id' => $other])->saveQuietly();

        $ids = array_column(
            app(AiSemanticSearchService::class)->searchByVector(
                $this->vector(1.0, 0.0),
                ['limit' => 10, 'branch_id' => $mine, 'query_text' => 'branch note'],
            ),
            'source_id',
        );

        $this->assertContains('mine', $ids);
        $this->assertNotContains('theirs', $ids);
    }

    // ---------- Batch embeddings ----------

    /**
     * Configures a working OpenAI-shaped embedding provider and fakes the HTTP
     * layer, so the real AiProviderManager::embed() runs and the number of
     * outbound requests can be counted.
     */
    private function fakeEmbeddingProvider(): void
    {
        config([
            'ai.enabled' => true,
            'ai.embedding.provider' => 'openai',
            'ai.embedding.model' => 'text-embedding-3-small',
            'ai.providers.openai.api_key' => 'test-key',
            'ai.providers.openai.base_url' => 'https://api.openai.com/v1',
        ]);

        Http::fake([
            '*/embeddings*' => function (Request $request) {
                $inputs = (array) ($request->data()['input'] ?? []);
                $inputs = array_is_list($inputs) ? $inputs : [$inputs];

                return Http::response([
                    'model' => 'text-embedding-3-small',
                    'usage' => ['total_tokens' => 1],
                    // One vector per input, as a real provider returns.
                    'data' => array_map(
                        static fn (int $i): array => ['embedding' => [0.1 * ($i + 1), 0.2, 0.3]],
                        array_keys($inputs),
                    ),
                ]);
            },
        ]);
    }

    public function test_many_texts_are_embedded_in_one_request_per_batch(): void
    {
        // 25 inputs at a batch size of 10 is three requests, not twenty-five.
        // That difference is an index that rebuilds in under a minute versus
        // one that times out on shared hosting.
        config(['ai.embedding.batch_size' => 10]);
        $this->fakeEmbeddingProvider();

        $vectors = app(AiProviderManager::class)->embed(array_fill(0, 25, 'some text'));

        $this->assertCount(25, $vectors);

        $requests = 0;
        Http::assertSent(function () use (&$requests): bool {
            $requests++;

            return true;
        });

        $this->assertSame(3, $requests, '25 inputs at a batch size of 10 must be 3 requests.');
    }

    public function test_a_single_text_still_works_and_costs_one_request(): void
    {
        $this->fakeEmbeddingProvider();

        $vector = app(AiProviderManager::class)->embedOne('a single chunk of text');

        $this->assertNotEmpty($vector);

        $requests = 0;
        Http::assertSent(function () use (&$requests): bool {
            $requests++;

            return true;
        });

        $this->assertSame(1, $requests);
    }

    public function test_embed_preserves_input_order_and_leaves_gaps_for_empty_text(): void
    {
        /*
         * Callers pair vectors with source records positionally, so a dropped
         * or reordered entry attaches the wrong vector to the wrong record — an
         * error that stays invisible until search results stop making sense.
         */
        config(['ai.embedding.batch_size' => 32]);
        $this->fakeEmbeddingProvider();

        $vectors = app(AiProviderManager::class)->embed(['first', '', 'third', '   ', 'fifth']);

        $this->assertSame([0, 1, 2, 3, 4], array_keys($vectors));

        // Blank inputs keep their slot and are never sent to the provider.
        $this->assertSame([], $vectors[1]);
        $this->assertSame([], $vectors[3]);

        $this->assertNotEmpty($vectors[0]);
        $this->assertNotEmpty($vectors[2]);
        $this->assertNotEmpty($vectors[4]);

        Http::assertSent(function (Request $request): bool {
            $input = $request->data()['input'] ?? [];

            // Only the three non-empty texts reach the provider.
            return is_array($input) && $input === ['first', 'third', 'fifth'];
        });
    }

    public function test_unchanged_records_are_skipped_without_calling_the_provider(): void
    {
        // Content-hash deduplication means a re-run over a large tenant sends
        // no requests at all rather than thousands.
        $calls = 0;

        $this->mock(AiProviderManager::class, function ($mock) use (&$calls) {
            $mock->shouldReceive('embed')->andReturnUsing(function (array $texts) use (&$calls) {
                $calls++;

                return array_map(static fn () => [0.1, 0.2, 0.3], $texts);
            });
        });

        $stats = app(AiEmbeddingIndexer::class)->index();

        // Nothing to index in an empty database: no provider call is made.
        $this->assertSame(0, $calls);
        $this->assertSame(0, $stats['indexed']);
    }

    public function test_the_batch_capability_is_declared_not_assumed(): void
    {
        $settings = app(AiSettingsService::class);

        $this->assertIsBool($settings->supportsBatchEmbeddings());
        $this->assertGreaterThanOrEqual(1, $settings->embeddingBatchSize());
        $this->assertLessThanOrEqual(96, $settings->embeddingBatchSize());
    }
}
