<?php

namespace Tests\Feature\Ai;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiReadinessService;
use App\Services\AI\AiSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * The Copilot page derives its entire enabled/disabled state from this payload.
 * These tests pin the contract the frontend relies on: `ready` is authoritative
 * and is never true while a prerequisite is missing.
 */
class CopilotHealthReadinessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (AiPermissionService::ALL as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }
        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function userWith(array $permissions = []): User
    {
        $user = User::factory()->create();

        foreach ($permissions as $p) {
            $user->givePermissionTo($p);
        }

        return $user->fresh();
    }

    /**
     * Toggle the three factors that feed `ready`, isolating one at a time.
     */
    private function configureAi(bool $enabled, bool $copilot, bool $withKey): void
    {
        $settings = app(AiSettingsService::class);

        $settings->setMany([
            'ai_enabled' => $enabled,
            'ai_copilot_enabled' => $copilot,
            'ai_provider' => 'openai',
        ]);

        $settings->setApiKey($withKey ? 'sk-test-key-for-readiness' : '');

        if ($withKey) {
            app(AiReadinessService::class)->recordProviderVerification(true);
        }
    }

    public function test_health_exposes_the_fields_the_frontend_readiness_check_uses(): void
    {
        $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonStructure([
                'ok', 'ai_enabled', 'copilot_enabled', 'ready', 'provider_configured',
                'provider_connection_verified', 'selected_model_valid',
                'chat_capability_available', 'tool_calling_available',
                'document_vision_capability_available', 'embedding_provider_configured',
                'rag_index_ready', 'rag_last_indexed_at', 'queue_configured',
                'queue_worker_healthy', 'queue_retry_after_safe', 'document_scanning_available',
                'financial_tools_available', 'write_proposals_available',
                'action_execution_available', 'operational_ready', 'issues',
            ]);
    }

    public function test_ready_is_true_only_when_every_prerequisite_is_satisfied(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertTrue($response->json('ready'), 'Positive control: a fully configured Copilot must report ready.');
    }

    public function test_ready_is_false_when_ai_is_disabled(): void
    {
        // Provider is configured and Copilot is on, so ai_enabled is the only
        // factor under test.
        $this->configureAi(enabled: false, copilot: true, withKey: true);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertFalse($response->json('ai_enabled'));
        $this->assertFalse($response->json('ready'));
    }

    public function test_ready_is_false_when_copilot_is_disabled(): void
    {
        $this->configureAi(enabled: true, copilot: false, withKey: true);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertFalse($response->json('copilot_enabled'));
        $this->assertFalse($response->json('ready'));
    }

    /**
     * The frontend previously enabled the composer from ai_enabled +
     * provider_configured alone. Whenever `ready` is false the UI must stay
     * disabled, so no combination may report ready without a usable provider.
     */
    public function test_ready_is_false_without_a_configured_provider(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: false);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertFalse($response->json('provider_configured'));
        $this->assertFalse($response->json('ready'));
    }

    public function test_api_key_alone_never_reports_provider_or_copilot_ready(): void
    {
        $settings = app(AiSettingsService::class);
        $settings->setMany([
            'ai_enabled' => true,
            'ai_copilot_enabled' => true,
            'ai_provider' => 'openai',
            'ai_model' => 'gpt-4o-mini',
        ]);
        $settings->setApiKey('sk-configured-but-never-tested');

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertTrue($response->json('provider_configured'));
        $this->assertFalse($response->json('provider_connection_verified'));
        $this->assertFalse($response->json('selected_model_valid'));
        $this->assertFalse($response->json('ready'));
    }

    public function test_changing_the_model_invalidates_a_previous_connection_test(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);
        app(AiSettingsService::class)->setMany(['ai_model' => 'gpt-4.1-mini']);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertFalse($response->json('provider_connection_verified'));
        $this->assertFalse($response->json('ready'));
    }

    public function test_sync_queue_is_never_reported_as_document_ready(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);
        config(['documents.queue_connection' => 'sync']);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertFalse($response->json('queue_configured'));
        $this->assertFalse($response->json('document_scanning_available'));
        $this->assertFalse($response->json('operational_ready'));
        $this->assertContains('AI_QUEUE_NOT_CONFIGURED', collect($response->json('issues'))->pluck('code')->all());
    }

    public function test_fresh_queue_heartbeat_is_reported_separately(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);
        $central = config('tenancy.database.central_connection');
        DB::connection($central)->table('saas_heartbeats')->updateOrInsert(
            ['name' => 'queue'],
            ['last_seen_at' => now()],
        );

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertTrue($response->json('queue_configured'));
        $this->assertTrue($response->json('queue_worker_healthy'));
        $this->assertNotNull($response->json('queue_worker_last_seen_at'));
    }

    public function test_queue_retry_window_must_exceed_the_effective_document_timeout(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);
        config(['queue.connections.central.retry_after' => 120]);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertTrue($response->json('queue_configured'));
        $this->assertFalse($response->json('queue_retry_after_safe'));
        $this->assertFalse($response->json('document_scanning_available'));
        $this->assertContains('AI_QUEUE_RETRY_WINDOW_UNSAFE', collect($response->json('issues'))->pluck('code')->all());
    }

    public function test_rag_readiness_requires_both_chunks_and_embeddings_and_reports_last_index_time(): void
    {
        $this->configureAi(enabled: true, copilot: true, withKey: true);
        $chunk = AiKnowledgeChunk::create([
            'source_type' => 'help',
            'source_id' => 'help:test',
            'module' => 'help',
            'title' => 'Test help',
            'content' => 'How to use a feature.',
            'content_hash' => hash('sha256', 'How to use a feature.'),
        ]);

        $withoutEmbedding = $this->actingAs($this->userWith(['ai.use']))->getJson('/api/ai/health')->assertOk();
        $this->assertFalse($withoutEmbedding->json('rag_index_ready'));

        AiEmbedding::create([
            'source_type' => 'help',
            'source_id' => 'help:test',
            'knowledge_chunk_id' => $chunk->id,
            'content' => $chunk->content,
            'content_hash' => $chunk->content_hash,
            'vector' => [0.1, 0.2],
            'dims' => 2,
            'provider' => 'openai',
            'model' => 'text-embedding-3-small',
        ]);

        $ready = $this->actingAs($this->userWith(['ai.use']))->getJson('/api/ai/health')->assertOk();
        $this->assertTrue($ready->json('rag_index_ready'));
        $this->assertNotNull($ready->json('rag_last_indexed_at'));
        $this->assertSame(1, $ready->json('rag_chunks'));
        $this->assertSame(1, $ready->json('rag_embeddings'));
    }

    public function test_text_only_model_never_advertises_document_or_tool_capability(): void
    {
        $settings = app(AiSettingsService::class);
        $settings->setMany([
            'ai_enabled' => true,
            'ai_copilot_enabled' => true,
            'ai_provider' => 'openai',
            'ai_model' => 'gpt-3.5-turbo',
        ]);
        $settings->setApiKey('sk-text-only-model');
        app(AiReadinessService::class)->recordProviderVerification(true);

        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertTrue($response->json('chat_capability_available'));
        $this->assertFalse($response->json('tool_calling_available'));
        $this->assertFalse($response->json('financial_tools_available'));
        $this->assertFalse($response->json('write_proposals_available'));
        $this->assertFalse($response->json('document_vision_capability_available'));
        $this->assertFalse($response->json('document_scanning_available'));
    }

    public function test_health_is_denied_without_permission(): void
    {
        $this->actingAs($this->userWith([]))
            ->getJson('/api/ai/health')
            ->assertStatus(403)
            ->assertJson(['code' => 'AI_PERMISSION_DENIED']);
    }

    public function test_health_never_leaks_provider_details_to_normal_users(): void
    {
        $response = $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk();

        $this->assertNull($response->json('provider'));
        $this->assertNull($response->json('model'));
        $this->assertNull($response->json('api_key'));
        $this->assertNull($response->json('base_url'));
    }
}
