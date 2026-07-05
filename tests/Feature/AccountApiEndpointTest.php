<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountApiEndpointTest extends TestCase
{
    use RefreshDatabase;

    public function test_accounts_endpoint_returns_searchable_account_options_for_fk_dropdowns(): void
    {
        $this->actingAs(User::factory()->create());

        Account::query()->create([
            'name' => 'Cash Main',
            'code' => '1000',
            'nature' => 'cash',
            'dr_amount' => 0,
            'cr_amount' => 0,
            'balance' => 0,
            'active' => true,
            'is_system_generated' => false,
        ]);

        $this->getJson('/api/accounts?search=cash&page_size=10')
            ->assertOk()
            ->assertJsonPath('count', 1)
            ->assertJsonPath('results.0.name', 'Cash Main')
            ->assertJsonPath('results.0.code', '1000');
    }
}
