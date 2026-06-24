<?php

namespace Tests\Feature\Ai;

use App\Models\AiEmbedding;
use App\Services\AI\AiProviderManager;
use App\Services\AI\Rag\AiRagRetriever;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Tests\TestCase;

/**
 * The RAG retriever enriches vector hits into citable source cards, enforces
 * branch scope, and never leaks raw vectors. Provider embedding is mocked so the
 * test is deterministic and provider-independent.
 */
class AiRagRetrieverTest extends TestCase
{
    use RefreshDatabase;

    public function test_returns_branch_scoped_source_cards_without_raw_vectors(): void
    {
        $branch = $this->branch('MAIN');
        $otherBranch = $this->branch('OTHER');

        $invoiceId = $this->invoice($branch, 'INV-9001');

        // Same-branch hit (aligned vector) + other-branch hit (also aligned but
        // out of scope) -> only the same-branch one should come back.
        $this->embedding('invoice', $invoiceId, $branch, [1.0, 0.0, 0.0], 'Invoice for warranty repair parts');
        $this->embedding('invoice', (string) Str::uuid(), $otherBranch, [1.0, 0.0, 0.0], 'Other branch invoice');

        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldReceive('embedOne')->andReturn([1.0, 0.0, 0.0]);
        });

        $sources = app(AiRagRetriever::class)->retrieve(null, 'warranty repair', ['branch_id' => $branch]);

        $this->assertCount(1, $sources);

        $card = $sources[0];
        $this->assertSame('invoice', $card['source_type']);
        $this->assertSame($invoiceId, $card['source_public_id']);
        $this->assertSame('Sales', $card['module']);
        $this->assertStringContainsString('INV-9001', $card['title']);
        $this->assertStringContainsString('/payment-in/invoices/' . $invoiceId, $card['metadata']['route']);

        // No raw vector / embedding / hash leaks into the card.
        $this->assertArrayNotHasKey('vector', $card);
        $this->assertArrayNotHasKey('embedding', $card);
        $this->assertArrayNotHasKey('content_hash', $card);
    }

    private function branch(string $code): string
    {
        $id = (string) Str::uuid();
        DB::table('branches')->insert([
            'id' => $id,
            'code' => $code . '-' . substr($id, 0, 4),
            'name' => $code . ' Branch',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function invoice(string $branch, string $no): string
    {
        $id = (string) Str::uuid();
        DB::table('invoices')->insert([
            'id' => $id,
            'branch_id' => $branch,
            'invoice_no' => $no,
            'invoice_date' => now()->toDateString(),
            'contact_id' => $this->contact(),
            'status' => 'draft',
            'active' => true,
            'approved' => false,
            'void' => false,
            'total' => 100,
            'balance_due' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function contact(): string
    {
        $id = (string) Str::uuid();
        DB::table('contacts')->insert([
            'id' => $id,
            'name' => 'Cust ' . substr($id, 0, 4),
            'contact_type' => 'customer',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function embedding(string $type, string $sourceId, string $branch, array $vector, string $content): void
    {
        AiEmbedding::create([
            'source_type' => $type,
            'source_id' => $sourceId,
            'branch_id' => $branch,
            'content' => $content,
            'content_hash' => hash('sha256', $content),
            'vector' => $vector,
            'dims' => count($vector),
            'provider' => 'openai',
            'model' => 'text-embedding-3-small',
        ]);
    }
}
