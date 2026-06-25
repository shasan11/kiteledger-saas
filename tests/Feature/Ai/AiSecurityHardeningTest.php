<?php

namespace Tests\Feature\Ai;

use App\Models\AiConversation;
use App\Models\AiPendingAction;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * P0 security hardening guarantees for the AI Copilot:
 *  - ai.settings.update (config) does NOT grant org-wide data visibility.
 *  - ai.manage does.
 *  - Normal users only ever see their own conversations/actions.
 *  - Write actions are OFF by default.
 *  - Provider/model are hidden from non-admin users.
 *
 * Note: this suite intentionally does NOT enable ai_write_actions_enabled, so it
 * verifies the secure default.
 */
class AiSecurityHardeningTest extends TestCase
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

    private function userWith(array $permissions): User
    {
        $user = User::factory()->create();
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }

        return $user->fresh();
    }

    private function pendingActionFor(User $owner): AiPendingAction
    {
        return AiPendingAction::create([
            'user_id' => $owner->id,
            'action_type' => 'create_invoice_draft',
            'module' => 'sales',
            'title' => 'Draft invoice',
            'status' => 'pending',
            'risk_level' => 'medium',
        ]);
    }

    public function test_settings_update_permission_cannot_view_other_users_actions(): void
    {
        $owner = $this->userWith(['ai.chat']);
        $action = $this->pendingActionFor($owner);

        $settingsUser = $this->userWith(['ai.chat', 'ai.settings.update', 'ai.actions.view']);

        $this->actingAs($settingsUser)
            ->getJson("/api/ai/actions/{$action->id}")
            ->assertStatus(403);

        $this->actingAs($settingsUser)
            ->getJson('/api/ai/actions')
            ->assertOk()
            ->assertJsonCount(0, 'actions');
    }

    public function test_ai_manage_permission_can_view_other_users_actions(): void
    {
        $owner = $this->userWith(['ai.chat']);
        $action = $this->pendingActionFor($owner);

        $manager = $this->userWith(['ai.manage']);

        $this->actingAs($manager)
            ->getJson("/api/ai/actions/{$action->id}")
            ->assertOk()
            ->assertJsonPath('action.id', $action->id);

        $this->actingAs($manager)
            ->getJson('/api/ai/actions')
            ->assertOk()
            ->assertJsonCount(1, 'actions');
    }

    public function test_settings_update_permission_cannot_view_other_users_conversations(): void
    {
        $owner = $this->userWith(['ai.chat']);
        $conversation = AiConversation::create([
            'user_id' => $owner->id,
            'title' => 'Owner private chat',
        ]);

        $settingsUser = $this->userWith(['ai.chat', 'ai.settings.update', 'ai.conversations.view']);

        $this->actingAs($settingsUser)
            ->getJson("/api/ai/conversations/{$conversation->id}")
            ->assertStatus(403);

        $this->actingAs($settingsUser)
            ->getJson('/api/ai/conversations')
            ->assertOk()
            ->assertJsonCount(0, 'conversations');
    }

    public function test_write_actions_are_disabled_by_default(): void
    {
        $user = $this->userWith(['ai.chat']);

        $this->actingAs($user)
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonPath('write_actions_enabled', false);
    }

    public function test_write_request_creates_no_draft_when_disabled_by_default(): void
    {
        $user = $this->userWith(['ai.chat', 'ai.actions.execute', 'ai.actions.view']);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Acme for 10,000'])
            ->assertOk();

        // No draft action and no invoice may be created while writes are off.
        $this->assertDatabaseCount('ai_pending_actions', 0);
        $this->assertDatabaseCount('invoices', 0);
    }

    public function test_provider_and_model_hidden_from_non_admin(): void
    {
        $user = $this->userWith(['ai.chat']);

        $this->actingAs($user)
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonMissingPath('provider')
            ->assertJsonMissingPath('model');
    }

    public function test_provider_visible_to_settings_viewer(): void
    {
        $admin = $this->userWith(['ai.chat', 'ai.settings.view']);

        $this->actingAs($admin)
            ->getJson('/api/ai/health')
            ->assertOk()
            ->assertJsonPath('provider', 'openai');
    }
}
