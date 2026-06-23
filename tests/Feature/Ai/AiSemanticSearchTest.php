<?php

namespace Tests\Feature\Ai;

use App\Models\AiEmbedding;
use App\Services\AI\Rag\AiSemanticSearchService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Exercises the retrieval core of the RAG slice without any AI provider — the
 * ranking/filtering is pure PHP over stored vectors, so it is fully testable.
 */
class AiSemanticSearchTest extends TestCase
{
    use RefreshDatabase;

    private function embed(array $attrs): AiEmbedding
    {
        return AiEmbedding::query()->create(array_merge([
            'source_type' => 'invoice',
            'source_id' => (string) fake()->uuid(),
            'branch_id' => null,
            'content' => 'snippet',
            'content_hash' => hash('sha256', (string) fake()->uuid()),
            'dims' => 3,
            'provider' => 'openai',
            'model' => 'text-embedding-3-small',
        ], $attrs));
    }

    private function service(): AiSemanticSearchService
    {
        return app(AiSemanticSearchService::class);
    }

    public function test_cosine_helper_is_correct(): void
    {
        $this->assertEqualsWithDelta(1.0, AiSemanticSearchService::cosine([1, 0, 0], [1, 0, 0]), 1e-9);
        $this->assertEqualsWithDelta(0.0, AiSemanticSearchService::cosine([1, 0, 0], [0, 1, 0]), 1e-9);
        $this->assertEqualsWithDelta(1.0, AiSemanticSearchService::cosine([1, 0, 0], [5, 0, 0]), 1e-9); // direction, not magnitude
        $this->assertSame(0.0, AiSemanticSearchService::cosine([], [1, 2, 3]));
    }

    public function test_ranks_most_similar_record_first(): void
    {
        $near = $this->embed(['vector' => [0.9, 0.1, 0.0], 'content' => 'rush delivery surcharge']);
        $exact = $this->embed(['vector' => [1.0, 0.0, 0.0], 'content' => 'office rent payment']);
        $orthogonal = $this->embed(['vector' => [0.0, 1.0, 0.0], 'content' => 'unrelated note']);

        $results = $this->service()->searchByVector([1.0, 0.0, 0.0], ['limit' => 5, 'min_score' => 0.0001]);

        $this->assertNotEmpty($results);
        $this->assertSame($exact->source_id, $results[0]['source_id']);   // cosine 1.0
        $this->assertSame($near->source_id, $results[1]['source_id']);    // ~0.994
        // orthogonal (score 0) is excluded by min_score
        $ids = array_column($results, 'source_id');
        $this->assertNotContains($orthogonal->source_id, $ids);
    }

    public function test_filters_out_dimension_mismatches(): void
    {
        $this->embed(['vector' => [1.0, 0.0], 'dims' => 2, 'content' => 'wrong dims']);
        $match = $this->embed(['vector' => [1.0, 0.0, 0.0], 'dims' => 3, 'content' => 'right dims']);

        $results = $this->service()->searchByVector([1.0, 0.0, 0.0], ['limit' => 5]);

        $this->assertCount(1, $results);
        $this->assertSame($match->source_id, $results[0]['source_id']);
    }

    public function test_branch_scope_includes_own_branch_and_global_excludes_others(): void
    {
        $mine = $this->embed(['vector' => [1.0, 0.0, 0.0], 'branch_id' => 'branch-1', 'content' => 'mine']);
        $global = $this->embed(['vector' => [0.8, 0.2, 0.0], 'branch_id' => null, 'content' => 'global']);
        $other = $this->embed(['vector' => [1.0, 0.0, 0.0], 'branch_id' => 'branch-2', 'content' => 'other']);

        $results = $this->service()->searchByVector([1.0, 0.0, 0.0], ['limit' => 5, 'branch_id' => 'branch-1', 'min_score' => 0.0001]);

        $ids = array_column($results, 'source_id');
        $this->assertContains($mine->source_id, $ids);
        $this->assertContains($global->source_id, $ids);
        $this->assertNotContains($other->source_id, $ids);
    }
}
