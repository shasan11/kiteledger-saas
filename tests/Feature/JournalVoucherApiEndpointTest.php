<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Branch;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class JournalVoucherApiEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_journal_voucher_api_creates_and_updates_lines_with_account_id(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $cash = $this->account('Cash Main', '1000', 'cash');
        $capital = $this->account('Capital', '3000', 'coa');

        $created = $this->postJson('/api/journal-vouchers', [
            'branch_id' => $branch->id,
            'voucher_date' => '2026-05-22',
            'exchange_rate' => 1,
            'reference' => 'JV API test',
            'items' => [
                [
                    'account_id' => $cash->id,
                    'description' => 'Debit cash',
                    'debit' => 100,
                    'credit' => 0,
                ],
                [
                    'account_id' => $capital->id,
                    'description' => 'Credit capital',
                    'debit' => 0,
                    'credit' => 100,
                ],
            ],
        ])->assertCreated();

        $voucherId = $created->json('id');
        $this->assertNotEmpty($voucherId);
        $created->assertJsonPath('items.0.account_id', $cash->id);

        $this->patchJson("/api/journal-vouchers/{$voucherId}", [
            'voucher_date' => '2026-05-22',
            'exchange_rate' => 1,
            'items' => [
                [
                    'account_id' => $cash->id,
                    'description' => 'Debit cash updated',
                    'debit' => 150,
                    'credit' => 0,
                ],
                [
                    'account_id' => $capital->id,
                    'description' => 'Credit capital updated',
                    'debit' => 0,
                    'credit' => 150,
                ],
            ],
        ])
            ->assertOk()
            ->assertJsonPath('items.0.account_id', $cash->id)
            ->assertJsonPath('items.1.account_id', $capital->id)
            ->assertJsonPath('total', '150.000000');
    }

    protected function account(string $name, string $code, string $nature): Account
    {
        return Account::query()->create([
            'name' => $name,
            'code' => $code,
            'nature' => $nature,
            'dr_amount' => 0,
            'cr_amount' => 0,
            'balance' => 0,
            'active' => true,
            'is_system_generated' => false,
        ]);
    }
}
