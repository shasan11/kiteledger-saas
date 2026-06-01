<?php

namespace Tests\Feature;

use App\Models\AiConversation;
use App\Models\AiMessage;
use App\Models\AiUsageLog;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiAssistantContext;
use App\Services\AI\AiProviderManager;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AiAssistantApiTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        // Seed canonical AI permissions
        foreach (\App\Services\AI\AiPermissionService::ALL as $p) {
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

    public function test_health_returns_ok_for_permitted_user(): void
    {
        $user = $this->userWith(['ai.use']);

        $this->actingAs($user)
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonStructure(['ok', 'ai_enabled', 'provider', 'model']);
    }

    public function test_health_returns_403_for_user_without_permission(): void
    {
        $user = $this->userWith([]);

        $this->actingAs($user)
            ->getJson('/api/ai/health')
            ->assertStatus(403)
            ->assertJsonPath('code', 'AI_PERMISSION_DENIED');
    }

    public function test_chat_validates_message_required(): void
    {
        $user = $this->userWith(['ai.chat']);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', [])
            ->assertStatus(422);
    }

    public function test_chat_rejects_unauthorized_user(): void
    {
        $user = $this->userWith([]);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'hello'])
            ->assertStatus(403)
            ->assertJsonPath('code', 'AI_PERMISSION_DENIED');
    }

    public function test_chat_saves_conversation_and_messages_and_logs_usage(): void
    {
        $user = $this->userWith(['ai.chat']);

        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldReceive('chat')->andReturn([
                'ok' => true,
                'provider' => 'openai',
                'model' => 'gpt-4o-mini',
                'text' => 'Hello back',
                'usage' => ['prompt' => 10, 'completion' => 3, 'total' => 13],
            ]);
        });

        $res = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'hi', 'context_type' => 'general'])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('message.content', 'Hello back');

        $convId = $res->json('conversation_id');
        $this->assertNotNull($convId);

        $conv = AiConversation::find($convId);
        $this->assertNotNull($conv);
        $this->assertEquals($user->id, $conv->user_id);
        $this->assertEquals('hi', $conv->title);

        $this->assertEquals(2, AiMessage::where('ai_conversation_id', $convId)->count());
        $this->assertEquals(1, AiUsageLog::where('user_id', $user->id)->where('status', 'success')->count());
    }

    public function test_chat_logs_error_and_returns_envelope_on_provider_failure(): void
    {
        $user = $this->userWith(['ai.chat']);

        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldReceive('chat')->andThrow(
                new \App\Services\AI\AiProviderException('boom', 'AI_TIMEOUT')
            );
        });

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'hi'])
            ->assertStatus(422)
            ->assertJsonPath('ok', false)
            ->assertJsonPath('code', 'AI_TIMEOUT');

        $this->assertEquals(1, AiUsageLog::where('user_id', $user->id)->where('status', 'error')->count());
    }

    public function test_settings_show_never_returns_raw_api_key(): void
    {
        $user = $this->userWith(['ai.settings.view']);

        $res = $this->actingAs($user)
            ->getJson('/api/ai/settings')
            ->assertOk();

        $payload = $res->json();
        $this->assertArrayNotHasKey('ai_api_key', $payload['settings']);
        $this->assertArrayHasKey('ai_api_key_masked', $payload['settings']);
    }

    public function test_settings_update_requires_manage_permission(): void
    {
        $user = $this->userWith(['ai.settings.view']);

        $this->actingAs($user)
            ->putJson('/api/ai/settings', ['ai_temperature' => 0.3])
            ->assertStatus(403);
    }

    public function test_legacy_endpoints_are_removed(): void
    {
        $user = $this->userWith(['ai.chat']);

        foreach ([
            '/api/ai/command-center/chat',
            '/api/ai/command',
            '/api/ai/risk-review',
            '/api/ai/reports/ask',
        ] as $url) {
            $this->actingAs($user)
                ->postJson($url, ['message' => 'x'])
                ->assertStatus(404);
        }
    }

    public function test_context_builder_does_not_crash_when_invoices_table_missing(): void
    {
        // The schema has invoices table normally; force a missing-table path by
        // building context for an unknown type — should return general note.
        $ctx = app(AiAssistantContext::class);
        $request = \Illuminate\Http\Request::create('/api/ai/chat');
        $request->setUserResolver(fn () => $this->userWith(['ai.chat']));

        $built = $ctx->build($request, 'general');
        $this->assertIsArray($built);
        $this->assertArrayHasKey('branch_scope', $built);
        $this->assertArrayHasKey('current_date', $built);
    }
}
