<?php

namespace Tests\Unit;

use App\Neuron\VectorStore\MySqlVectorStore;
use PHPUnit\Framework\TestCase;

class MySqlVectorStoreTest extends TestCase
{
    public function test_cosine_similarity_and_ranking_math_are_correct(): void
    {
        $this->assertEqualsWithDelta(1.0, MySqlVectorStore::cosineSimilarity([1, 0], [5, 0]), 0.000001);
        $this->assertEqualsWithDelta(0.0, MySqlVectorStore::cosineSimilarity([1, 0], [0, 1]), 0.000001);
        $this->assertLessThan(
            MySqlVectorStore::cosineSimilarity([1, 0], [1, 0]),
            MySqlVectorStore::cosineSimilarity([1, 0], [0.9, 0.1]),
        );
    }

    public function test_empty_zero_mismatched_and_non_numeric_vectors_are_rejected(): void
    {
        $this->assertSame(0.0, MySqlVectorStore::cosineSimilarity([], []));
        $this->assertSame(0.0, MySqlVectorStore::cosineSimilarity([0, 0], [0, 0]));
        $this->assertSame(0.0, MySqlVectorStore::cosineSimilarity([1, 0], [1, 0, 0]));
        $this->assertSame(0.0, MySqlVectorStore::cosineSimilarity([1, 'bad'], [1, 0]));
    }
}
