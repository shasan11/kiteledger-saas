<?php

namespace Tests\Feature\Ai;

use App\Models\AiKnowledgeChunk;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderManager;
use App\Services\AI\Knowledge\AppKnowledgeIndexer;
use App\Services\AI\Knowledge\BusinessKnowledgeIndexer;
use App\Services\AI\Rag\AiHybridRetriever;
use App\Services\AI\Rag\AiQueryNormalizer;
use App\Services\AI\Rag\AiQueryUnderstandingService;
use App\Services\AI\Rag\AiSourceSanitizer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AiRagRetrieverTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        foreach (AiPermissionService::ALL as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_app_help_question_retrieves_indexed_kiteledger_knowledge(): void
    {
        app(AppKnowledgeIndexer::class)->index(false);

        $result = app(AiHybridRetriever::class)->retrieve(null, 'How do I create an invoice?');

        $this->assertSame('app_help', $result['understanding']['intent']);
        $this->assertNotEmpty($result['sources']);
        $this->assertStringContainsString('Invoice', $result['sources'][0]['label']);
        $this->assertArrayNotHasKey('source_id', $result['sources'][0]);
    }

    public function test_exact_invoice_number_ranks_first(): void
    {
        $this->chunk('invoice', 'invoice:1', 'Sales', 'Invoice INV-1004 - ABC Trading', 'Invoice INV-1004 for ABC Trading. Status: unpaid. VAT pending.');
        $this->chunk('invoice', 'invoice:2', 'Sales', 'Invoice INV-2000 - Other Customer', 'A different paid invoice.');

        $result = app(AiHybridRetriever::class)->retrieve(null, 'Why is invoice INV-1004 unpaid?');

        $this->assertSame('Invoice INV-1004 - ABC Trading', $result['sources'][0]['label']);
        $this->assertContains($result['sources'][0]['match_label'], ['High match', 'Good match']);
    }

    public function test_branch_scope_prevents_cross_branch_leakage(): void
    {
        $mine = (string) Str::uuid();
        $other = (string) Str::uuid();
        $this->chunk('contact', 'contact:mine', 'Contacts', 'Customer ABC Trading', 'ABC Trading customer notes.', $mine);
        $this->chunk('contact', 'contact:other', 'Contacts', 'Customer ABC Secret', 'ABC Secret customer notes.', $other);

        $result = app(AiHybridRetriever::class)->retrieve(null, 'Explain ABC customer', ['branch_id' => $mine]);

        $labels = collect($result['sources'])->pluck('label')->implode(' ');
        $this->assertStringContainsString('ABC Trading', $labels);
        $this->assertStringNotContainsString('ABC Secret', $labels);
    }

    public function test_business_indexer_creates_readable_customer_chunk(): void
    {
        DB::table('contacts')->insert([
            'id' => (string) Str::uuid(), 'code' => 'ABC-001', 'name' => 'ABC Trading',
            'contact_type' => 'customer', 'active' => true,
            'created_at' => now(), 'updated_at' => now(),
        ]);

        $stats = app(BusinessKnowledgeIndexer::class)->index('contact', false);
        $result = app(AiHybridRetriever::class)->retrieve(null, 'Explain customer ABC Trading');

        $this->assertGreaterThan(0, $stats['created']);
        $this->assertSame('Contact ABC-001', $result['sources'][0]['label']);
        $this->assertStringContainsString('ABC Trading', $result['sources'][0]['snippet']);
    }

    public function test_exact_customer_name_ranks_first(): void
    {
        $this->chunk('contact', 'contact:abc', 'Contacts', 'Customer ABC Trading', 'Customer ABC Trading account and notes.');
        $this->chunk('contact', 'contact:xyz', 'Contacts', 'Customer XYZ Limited', 'Customer XYZ Limited account.');

        $result = app(AiHybridRetriever::class)->retrieve(null, 'Summarize ABC Trading customer');
        $this->assertSame('Customer ABC Trading', $result['sources'][0]['label']);
    }

    public function test_index_commands_work_without_external_embeddings(): void
    {
        $this->artisan('ai:index-app', ['--no-embeddings' => true])->assertExitCode(0);
        $this->artisan('ai:index-status')->assertExitCode(0);
    }

    public function test_low_confidence_does_not_claim_an_answer(): void
    {
        $result = app(AiHybridRetriever::class)->retrieve(null, 'Explain an unknown frobnicator setting');
        $this->assertSame('low', $result['confidence']['level']);
        $this->assertSame([], $result['sources']);
    }

    public function test_normal_business_question_is_marked_for_retrieval(): void
    {
        $query = app(AiQueryNormalizer::class)->normalize('Why is cash balance different?');
        $understanding = app(AiQueryUnderstandingService::class)->understand($query);
        $this->assertTrue($understanding['use_retrieval']);
        $this->assertSame('business_data', $understanding['intent']);
    }

    public function test_source_sanitizer_hides_ids_and_raw_scores(): void
    {
        $uuid = (string) Str::uuid();
        $sources = app(AiSourceSanitizer::class)->sanitize([[
            'source_type' => 'invoice', 'source_id' => $uuid, 'title' => 'Invoice INV-1',
            'module' => 'Sales', 'content' => "Internal {$uuid}", 'route' => "/invoices/{$uuid}",
            'metadata' => [], 'final_score' => .8,
        ]]);

        $this->assertArrayNotHasKey('source_id', $sources[0]);
        $this->assertArrayNotHasKey('score', $sources[0]);
        $this->assertArrayNotHasKey('route', $sources[0]);
        $this->assertStringNotContainsString($uuid, $sources[0]['snippet']);
        $this->assertSame('High match', $sources[0]['match_label']);

        $legacy = "Medium Packaging Box is cheapest. Filters: fiscal_year_id={$uuid}, active=1. Open: /inventory/products/{$uuid}";
        $clean = app(AiSourceSanitizer::class)->sanitizeText($legacy);
        $this->assertSame('Medium Packaging Box is cheapest.', $clean);
    }

    public function test_chat_response_is_structured_and_hides_technical_details(): void
    {
        app(AppKnowledgeIndexer::class)->index(false);
        $user = User::factory()->create();
        $user->givePermissionTo('ai.chat');

        $this->mock(AiProviderManager::class, function ($mock): void {
            $mock->shouldReceive('embedOne')->andThrow(new \RuntimeException('embeddings unavailable'));
            $mock->shouldReceive('chat')->andReturn([
                'provider' => 'openai', 'model' => 'hidden-model',
                'text' => json_encode([
                    'headline' => 'Create an invoice from Sales > Invoices.',
                    'body' => 'Open the invoice page and select New Invoice.',
                    'bullets' => ['Select the customer.', 'Add products.'],
                    'limitations' => [], 'followups' => ['Which permission is required?'],
                ]),
                'usage' => [],
            ]);
        });

        $response = $this->actingAs($user)->postJson('/api/ai/chat', ['message' => 'How do I create an invoice?'])
            ->assertOk()
            ->assertJsonPath('answer.headline', 'Create an invoice from Sales > Invoices.')
            ->assertJsonPath('debug', null);

        $json = json_encode($response->json());
        $this->assertStringNotContainsString('hidden-model', $json);
        $this->assertStringNotContainsString('openai', $json);
        $this->assertDoesNotMatchRegularExpression('/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/i', $json);
    }

    public function test_admin_debug_permission_can_receive_retrieval_details(): void
    {
        app(AppKnowledgeIndexer::class)->index(false);
        $user = User::factory()->create();
        $user->givePermissionTo(['ai.chat', 'ai.debug.view']);

        $this->mock(AiProviderManager::class, function ($mock): void {
            $mock->shouldReceive('embedOne')->andThrow(new \RuntimeException('skip vectors'));
            $mock->shouldReceive('chat')->andReturn([
                'provider' => 'openai', 'model' => 'debug-model',
                'text' => json_encode(['headline' => 'Invoice help', 'body' => 'Use Sales > Invoices.', 'bullets' => [], 'limitations' => [], 'followups' => []]),
                'usage' => [],
            ]);
        });

        $this->actingAs($user)->postJson('/api/ai/chat', ['message' => 'How do I create an invoice?'])
            ->assertOk()
            ->assertJsonPath('debug.provider', 'openai')
            ->assertJsonPath('debug.model', 'gpt-4o-mini')
            ->assertJsonStructure(['debug' => ['query_plan', 'retrieval_ms', 'candidates']]);
    }

    private function chunk(string $type, string $sourceId, string $module, string $title, string $content, ?string $branch = null): void
    {
        AiKnowledgeChunk::create([
            'source_type' => $type, 'source_id' => $sourceId, 'module' => $module,
            'title' => $title, 'content' => $content, 'branch_id' => $branch,
            'keywords' => [], 'metadata' => [], 'content_hash' => hash('sha256', $content),
        ]);
    }
}
