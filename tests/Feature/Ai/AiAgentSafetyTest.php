<?php

namespace Tests\Feature\Ai;

use App\Models\AiPendingAction;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Covers the safety guarantees of the AI agent loop: execute endpoint + audit
 * trail, high/critical typed-confirmation gate, graceful blocking of dangerous
 * actions, tool-call logging, and resource (no-leak) shaping.
 */
class AiAgentSafetyTest extends TestCase
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

    public function test_execute_endpoint_creates_draft_and_writes_audit_log(): void
    {
        [$branch] = $this->branch();
        $user = $this->userWith(['ai.chat', 'ai.actions.execute', 'ai.actions.view'], $branch);
        $this->contact('Sachin');

        $actionId = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Sachin for 51,000'])
            ->assertOk()
            ->assertJsonPath('mode', 'pending_action')
            ->json('actions.0.id');

        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$actionId}/execute")
            ->assertOk()
            ->assertJsonPath('status', 'executed');

        $this->assertDatabaseHas('invoices', ['status' => 'draft', 'approved' => false]);
        $this->assertDatabaseHas('ai_action_audit_logs', [
            'ai_pending_action_id' => $actionId,
            'action_type' => 'create_invoice_draft',
            'status' => 'executed',
        ]);
    }

    public function test_high_risk_action_requires_typed_confirmation(): void
    {
        [$branch] = $this->branch();
        $user = $this->userWith(['ai.actions.approve', 'ai.actions.view'], $branch);
        $contact = $this->contact('Acme');
        $action = $this->highRiskInvoiceAction($user, $branch, $contact);

        // No confirmation -> blocked.
        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$action->id}/approve")
            ->assertStatus(422)
            ->assertJsonPath('code', 'AI_CONFIRMATION_REQUIRED');

        // Wrong confirmation -> still blocked.
        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$action->id}/approve", ['confirmation_text' => 'yes please'])
            ->assertStatus(422)
            ->assertJsonPath('code', 'AI_CONFIRMATION_REQUIRED');

        $this->assertDatabaseCount('invoices', 0);

        // Correct confirmation -> executes.
        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$action->id}/approve", ['confirmation_text' => 'CONFIRM INVOICE'])
            ->assertOk()
            ->assertJsonPath('status', 'executed');

        $this->assertDatabaseHas('invoices', ['contact_id' => $contact, 'status' => 'draft']);
    }

    public function test_dangerous_delete_request_is_blocked_without_a_pending_action(): void
    {
        [$branch] = $this->branch();
        $user = $this->userWith(['ai.chat'], $branch);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Delete invoice INV-0023'])
            ->assertOk()
            ->assertJsonPath('ok', true)
            ->assertJsonPath('mode', 'chat');

        $this->assertDatabaseCount('ai_pending_actions', 0);
    }

    public function test_action_resource_does_not_leak_internal_fields(): void
    {
        [$branch] = $this->branch();
        $user = $this->userWith(['ai.chat', 'ai.actions.view'], $branch);
        $this->contact('Sachin');

        $actionId = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Sachin for 51,000'])
            ->json('actions.0.id');

        $action = $this->actingAs($user)
            ->getJson("/api/ai/actions/{$actionId}")
            ->assertOk()
            ->json('action');

        foreach (['branch_id', 'user_id', 'approved_by', 'metadata', 'target_id', 'payload'] as $leaky) {
            $this->assertArrayNotHasKey($leaky, $action, "Resource leaked '{$leaky}'.");
        }

        $this->assertArrayHasKey('id', $action);
        $this->assertArrayHasKey('risk_level', $action);
    }

    public function test_audit_endpoint_lists_logs_after_execution(): void
    {
        [$branch] = $this->branch();
        $user = $this->userWith(['ai.chat', 'ai.actions.approve', 'ai.actions.view'], $branch);
        $this->contact('Sachin');

        $actionId = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Sachin for 51,000'])
            ->json('actions.0.id');

        $this->actingAs($user)->postJson("/api/ai/actions/{$actionId}/approve")->assertOk();

        $this->actingAs($user)
            ->getJson("/api/ai/actions/{$actionId}/audit")
            ->assertOk()
            ->assertJsonPath('audit_logs.0.action_type', 'create_invoice_draft')
            ->assertJsonPath('audit_logs.0.status', 'executed');
    }

    public function test_query_logs_a_tool_call(): void
    {
        $user = $this->userWith(['ai.chat']);
        $this->insertProduct('iPhone 15 Pro', 185000);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Which product is most expensive?'])
            ->assertOk();

        $this->assertDatabaseHas('ai_tool_calls', ['tool_name' => 'product.most_expensive', 'status' => 'completed']);
    }

    // --- helpers -----------------------------------------------------------

    private function userWith(array $permissions = [], ?string $branchId = null): User
    {
        $user = User::factory()->create(['branch_id' => $branchId]);
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }

        return $user->fresh();
    }

    private function branch(string $code = 'MAIN'): array
    {
        $branchId = (string) Str::uuid();
        DB::table('branches')->insert([
            'id' => $branchId,
            'code' => $code . '-' . substr($branchId, 0, 4),
            'name' => $code . ' Branch',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return [$branchId];
    }

    private function contact(string $name): string
    {
        $id = (string) Str::uuid();
        DB::table('contacts')->insert([
            'id' => $id,
            'name' => $name,
            'contact_type' => 'customer',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function insertProduct(string $name, float $sellingPrice): string
    {
        $id = (string) Str::uuid();
        DB::table('products')->insert([
            'id' => $id,
            'name' => $name,
            'code' => strtoupper(substr(md5($id), 0, 8)),
            'selling_price' => $sellingPrice,
            'purchase_price' => max($sellingPrice - 100, 1),
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function highRiskInvoiceAction(User $user, string $branch, string $contactId): AiPendingAction
    {
        return AiPendingAction::create([
            'user_id' => $user->id,
            'branch_id' => $branch,
            'action_type' => 'create_invoice_draft',
            'module' => 'invoices',
            'target_type' => 'invoices',
            'title' => 'Create draft invoice',
            'summary' => 'Create a draft invoice.',
            'payload' => ['contact_id' => $contactId, 'total' => 5000, 'balance_due' => 5000],
            'risk_level' => 'high',
            'risk_reasons' => ['High-risk financial action.'],
            'status' => 'pending',
            'metadata' => [
                'missing_fields' => [],
                'requires_confirmation' => true,
                'confirmation_text' => 'CONFIRM INVOICE',
            ],
        ]);
    }
}
