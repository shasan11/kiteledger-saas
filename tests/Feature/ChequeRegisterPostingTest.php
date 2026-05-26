<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ChequeRegister;
use App\Models\DocumentNumbering;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChequeRegisterPostingTest extends TestCase
{
    use RefreshDatabase;

    public function test_clearing_received_cheque_updates_account_balances(): void
    {
        $branch = Branch::factory()->create();
        DocumentNumbering::factory()->create([
            'document_type' => 'journal_voucher',
            'prefix' => 'JV',
            'next_number' => 1,
            'type_of_account' => 'auto_numbering',
            'active' => true,
        ]);

        $bank = $this->account('Bank', '1120', 'bank');
        $customer = $this->account('Customer', '1130', 'actor');

        $cheque = ChequeRegister::query()->create([
            'branch_id' => $branch->id,
            'cheque_no' => 'CHK-001',
            'cheque_date' => now()->toDateString(),
            'issued_date' => now()->toDateString(),
            'received_date' => now()->toDateString(),
            'payee_name' => 'Customer',
            'direction' => 'received',
            'account_id' => $bank->id,
            'related_account_id' => $customer->id,
            'amount' => 500,
            'status' => 'pending',
            'active' => true,
            'approved' => false,
            'void' => false,
            'exchange_rate' => 1,
        ]);

        $cheque->update([
            'status' => 'cleared',
            'cleared_date' => now()->toDateString(),
        ]);

        $this->assertSame(500.0, (float) $bank->refresh()->dr_amount);
        $this->assertSame(0.0, (float) $bank->cr_amount);
        $this->assertSame(500.0, (float) $bank->balance);

        $this->assertSame(0.0, (float) $customer->refresh()->dr_amount);
        $this->assertSame(500.0, (float) $customer->cr_amount);
        $this->assertSame(-500.0, (float) $customer->balance);

        $this->assertTrue((bool) $cheque->refresh()->approved);
        $this->assertNotNull($cheque->journal_voucher_id);
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
