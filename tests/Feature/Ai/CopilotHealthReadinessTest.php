<?php

namespace Tests\Feature\Ai;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
    }

    public function test_health_exposes_the_fields_the_frontend_readiness_check_uses(): void
    {
        $this->actingAs($this->userWith(['ai.use']))
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonStructure(['ok', 'ai_enabled', 'copilot_enabled', 'ready', 'provider_configured']);
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
