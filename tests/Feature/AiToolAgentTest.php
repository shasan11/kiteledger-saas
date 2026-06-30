<?php

namespace Tests\Feature;

use App\Models\AiPendingAction;
use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiSettingsService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class AiToolAgentTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (AiPermissionService::ALL as $permission) {
            Permission::firstOrCreate(['name' => $permission, 'guard_name' => 'web']);
        }
        Permission::firstOrCreate(['name' => 'reports.financial.view', 'guard_name' => 'web']);

        app(PermissionRegistrar::class)->forgetCachedPermissions();

        // Write actions are disabled by default now; this suite exercises the
        // draft pipeline, so opt in explicitly.
        app(AiSettingsService::class)->setMany(['ai_write_actions_enabled' => true]);
    }

    public function test_cheapest_product_query_returns_a_clean_non_technical_answer(): void
    {
        $user = $this->userWith(['ai.chat']);
        $cheapestId = $this->insertProduct('Medium Packaging Box', 55);
        $this->insertProduct('Premium Packaging Box', 185);

        $response = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'What is the cheapest product?'])
            ->assertOk()
            ->assertJsonPath('mode', 'tool_query')
            ->assertJsonPath('answer.headline', 'Cheapest product')
            ->assertJsonPath('answer.body', 'Medium Packaging Box is the cheapest product with selling price 55.00.')
            ->assertJsonPath('message.content', 'Medium Packaging Box is the cheapest product with selling price 55.00.')
            ->assertJsonMissingPath('intent')
            ->assertJsonMissingPath('results');

        $publicJson = $response->getContent();
        $this->assertStringNotContainsString('Filters:', $publicJson);
        $this->assertStringNotContainsString('fiscal_year_id', $publicJson);
        $this->assertStringNotContainsString('Open:', $publicJson);
        $this->assertStringNotContainsString($cheapestId, $publicJson);
    }

    public function test_product_most_expensive_returns_empty_result_if_no_products_exist(): void
    {
        $user = $this->userWith(['ai.chat', 'ai.debug.view']);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Most expensive product'])
            ->assertOk()
            ->assertJsonPath('mode', 'tool_query')
            ->assertJsonPath('results.0.records', [])
            ->assertJsonPath('results.0.source', 'database');
    }

    public function test_bank_account_most_transactions_uses_journal_voucher_lines(): void
    {
        [$branch, $currency] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.chat', 'ai.debug.view'], $branch);
        [$bankOne] = $this->bankAccountWithJournalLines($branch, $currency, 'Nabil Bank', 3);
        $this->bankAccountWithJournalLines($branch, $currency, 'Everest Bank', 1);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Which bank account has the most transactions?'])
            ->assertOk()
            ->assertJsonPath('intent.tool', 'bank_account.most_transactions')
            ->assertJsonPath('results.0.records.0.bank_account_id', $bankOne)
            ->assertJsonPath('results.0.records.0.transaction_count', 3);
    }

    public function test_cash_balance_uses_approved_non_void_journal_voucher_lines(): void
    {
        [$branch, $currency] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.chat', 'ai.debug.view'], $branch);
        $account = $this->account('Cash in Hand', 'cash');
        $coa = $this->chartOfAccount($account, $branch);
        $this->journalVoucher($branch, $currency, $account, $coa, 100, 20, true, false);
        $this->journalVoucher($branch, $currency, $account, $coa, 1000, 0, false, false);
        $this->journalVoucher($branch, $currency, $account, $coa, 1000, 0, true, true);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'What is my cash balance?'])
            ->assertOk()
            ->assertJsonPath('intent.tool', 'journal_voucher.cash_balance')
            ->assertJsonPath('results.0.records.0.balance', 80);
    }

    public function test_report_resolver_returns_correct_report_url(): void
    {
        [$branch] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.chat', 'ai.debug.view', 'ai.report_summary', 'reports.financial.view'], $branch);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Show trial balance'])
            ->assertOk()
            ->assertJsonPath('mode', 'report')
            ->assertJsonPath('results.0.report_key', 'trial_balance')
            ->assertJsonPath('results.0.open_url', fn ($url) => str_contains($url, '/reports/accounting/trial-balance'));
    }

    public function test_create_invoice_request_creates_pending_action_only(): void
    {
        [$branch] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.chat'], $branch);
        $contact = $this->contact('Sachin');

        $response = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Sachin for 51,000'])
            ->assertOk()
            ->assertJsonPath('mode', 'pending_action')
            ->assertJsonPath('actions.0.action_type', 'create_invoice_draft')
            ->assertJsonPath('actions.0.payload.contact_id', $contact)
            ->json();

        $this->assertDatabaseCount('invoices', 0);
        $this->assertDatabaseHas('ai_pending_actions', ['id' => $response['actions'][0]['id'], 'status' => 'pending']);
    }

    public function test_pending_action_approval_creates_draft_invoice(): void
    {
        [$branch] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.chat', 'ai.actions.approve'], $branch);
        $this->contact('Sachin');

        $actionId = $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Create invoice for Sachin for 51,000'])
            ->json('actions.0.id');

        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$actionId}/approve")
            ->assertOk()
            ->assertJsonPath('status', 'executed');

        $this->assertDatabaseHas('invoices', [
            'contact_id' => DB::table('contacts')->where('name', 'Sachin')->value('id'),
            'status' => 'draft',
            'approved' => false,
            'void' => false,
        ]);
    }

    public function test_update_approved_record_is_blocked(): void
    {
        [$branch] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.actions.approve'], $branch);
        $invoice = $this->invoice($branch, approved: true, void: false);
        $action = $this->pendingUpdateInvoice($user, $branch, $invoice);

        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$action->id}/approve")
            ->assertStatus(422)
            ->assertJsonPath('status', 'failed');
    }

    public function test_voided_record_update_is_blocked(): void
    {
        [$branch] = $this->branchAndCurrency();
        $user = $this->userWith(['ai.actions.approve'], $branch);
        $invoice = $this->invoice($branch, approved: false, void: true);
        $action = $this->pendingUpdateInvoice($user, $branch, $invoice);

        $this->actingAs($user)
            ->postJson("/api/ai/actions/{$action->id}/approve")
            ->assertStatus(422)
            ->assertJsonPath('status', 'failed');
    }

    public function test_unauthorized_user_cannot_run_query_tool(): void
    {
        $user = $this->userWith([]);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Which product is most expensive?'])
            ->assertStatus(403);
    }

    public function test_branch_limited_user_cannot_see_other_branch_data(): void
    {
        [$ownBranch, $currency] = $this->branchAndCurrency('OWN');
        [$otherBranch] = $this->branchAndCurrency('OTHER');
        $user = $this->userWith(['ai.chat', 'ai.debug.view'], $ownBranch);
        $this->bankAccountWithJournalLines($otherBranch, $currency, 'Other Branch Bank', 2);

        $this->actingAs($user)
            ->postJson('/api/ai/chat', ['message' => 'Which bank account has the most transactions?'])
            ->assertOk()
            ->assertJsonPath('results.0.records', []);
    }

    private function userWith(array $permissions = [], ?string $branchId = null): User
    {
        $user = User::factory()->create(['branch_id' => $branchId]);
        foreach ($permissions as $permission) {
            $user->givePermissionTo($permission);
        }

        return $user->fresh();
    }

    private function branchAndCurrency(string $code = 'MAIN'): array
    {
        $branchId = (string) Str::uuid();
        DB::table('branches')->insert([
            'id' => $branchId,
            'code' => $code.'-'.substr($branchId, 0, 4),
            'name' => $code.' Branch',
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $currencyId = DB::table('currencies')->value('id') ?: (string) Str::uuid();
        if (! DB::table('currencies')->where('id', $currencyId)->exists()) {
            DB::table('currencies')->insert([
                'id' => $currencyId,
                'code' => 'NPR'.substr($currencyId, 0, 2),
                'name' => 'Nepalese Rupee',
                'symbol' => 'NPR',
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return [$branchId, $currencyId];
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

    private function account(string $name, string $nature = 'bank'): string
    {
        $id = (string) Str::uuid();
        DB::table('accounts')->insert(['id' => $id, 'name' => $name, 'nature' => $nature, 'active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    private function chartOfAccount(string $account, string $branch): string
    {
        $id = (string) Str::uuid();
        DB::table('chart_of_accounts')->insert(['id' => $id, 'account_id' => $account, 'branch_id' => $branch, 'name' => 'COA '.substr($id, 0, 4), 'active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    private function bankAccountWithJournalLines(string $branch, string $currency, string $name, int $count): array
    {
        $account = $this->account($name, 'bank');
        $coa = $this->chartOfAccount($account, $branch);
        $bank = (string) Str::uuid();
        DB::table('bank_accounts')->insert([
            'id' => $bank,
            'branch_id' => $branch,
            'type' => 'bank',
            'display_name' => $name,
            'code' => strtoupper(substr($bank, 0, 6)),
            'currency_id' => $currency,
            'account_id' => $account,
            'active' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        for ($i = 0; $i < $count; $i++) {
            $this->journalVoucher($branch, $currency, $account, $coa, 100 + $i, 0, true, false);
        }

        return [$bank, $account];
    }

    private function journalVoucher(string $branch, string $currency, string $account, string $coa, float $debit, float $credit, bool $approved, bool $void): void
    {
        $jv = (string) Str::uuid();
        DB::table('journal_vouchers')->insert([
            'id' => $jv,
            'branch_id' => $branch,
            'voucher_no' => 'JV-'.substr($jv, 0, 8),
            'voucher_date' => now()->toDateString(),
            'currency_id' => $currency,
            'status' => 'posted',
            'active' => true,
            'approved' => $approved,
            'void' => $void,
            'total' => $debit + $credit,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
        DB::table('journal_voucher_lines')->insert([
            'id' => (string) Str::uuid(),
            'journal_voucher_id' => $jv,
            'account_id' => $account,
            'chart_of_account_id' => $coa,
            'debit' => $debit,
            'credit' => $credit,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function contact(string $name): string
    {
        $id = (string) Str::uuid();
        DB::table('contacts')->insert(['id' => $id, 'name' => $name, 'contact_type' => 'customer', 'active' => true, 'created_at' => now(), 'updated_at' => now()]);

        return $id;
    }

    private function invoice(string $branch, bool $approved, bool $void): string
    {
        $id = (string) Str::uuid();
        DB::table('invoices')->insert([
            'id' => $id,
            'branch_id' => $branch,
            'invoice_no' => 'INV-'.substr($id, 0, 8),
            'invoice_date' => now()->toDateString(),
            'contact_id' => $this->contact('Customer '.substr($id, 0, 4)),
            'status' => $approved ? 'posted' : 'draft',
            'active' => true,
            'approved' => $approved,
            'void' => $void,
            'total' => 100,
            'balance_due' => 100,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return $id;
    }

    private function pendingUpdateInvoice(User $user, string $branch, string $invoice): AiPendingAction
    {
        return AiPendingAction::create([
            'user_id' => $user->id,
            'branch_id' => $branch,
            'action_type' => 'update_invoice_draft',
            'module' => 'invoices',
            'target_type' => 'invoices',
            'target_id' => $invoice,
            'title' => 'Update invoice',
            'summary' => 'Update invoice due date.',
            'payload' => ['target_id' => $invoice, 'context_payload' => ['changes' => ['due_date' => now()->addDay()->toDateString()]]],
            'risk_level' => 'medium',
            'risk_reasons' => ['Updates a draft transaction.'],
            'status' => 'pending',
            'metadata' => ['missing_fields' => []],
        ]);
    }
}
