<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\BankAccount;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AccountingAccountSyncTest extends TestCase
{
    use RefreshDatabase;

    public function test_coa_create_sets_auto_code_and_forces_linked_account_coa_flags(): void
    {
        $branch = Branch::factory()->create();
        $currency = Currency::factory()->create();

        $coa = ChartOfAccount::create([
            'branch_id' => $branch->id,
            'name' => 'Receivables',
            'currency_id' => $currency->id,
            'is_system_generated' => false,
            'active' => true,
        ]);

        $coa->refresh();

        $this->assertNotNull($coa->code);
        $this->assertNotNull($coa->account_id);

        $account = Account::findOrFail($coa->account_id);
        $this->assertSame('coa', $account->nature);
        $this->assertTrue((bool) $account->is_system_generated);
        $this->assertSame($coa->name, $account->name);
        $this->assertSame($coa->code, $account->code);
    }

    public function test_coa_update_propagates_name_code_currency_and_active_to_account(): void
    {
        $branch = Branch::factory()->create();
        $currencyA = Currency::factory()->create();
        $currencyB = Currency::factory()->create();

        $coa = ChartOfAccount::create([
            'branch_id' => $branch->id,
            'name' => 'Inventory',
            'currency_id' => $currencyA->id,
            'active' => true,
        ]);

        $coa->update([
            'name' => 'Inventory Assets',
            'code' => 'COA-INV-001',
            'currency_id' => $currencyB->id,
            'active' => false,
        ]);

        $account = Account::findOrFail($coa->account_id);

        $this->assertSame('Inventory Assets', $account->name);
        $this->assertSame('COA-INV-001', $account->code);
        $this->assertSame($currencyB->id, $account->currency_id);
        $this->assertFalse((bool) $account->active);
    }

    public function test_bank_create_sets_type_prefix_code_and_forces_linked_account_bank_flags(): void
    {
        $branch = Branch::factory()->create();
        $currency = Currency::factory()->create();

        $bank = BankAccount::create([
            'branch_id' => $branch->id,
            'type' => 'bank',
            'display_name' => 'Main Bank',
            'currency_id' => $currency->id,
            'is_system_generated' => false,
            'active' => true,
        ]);

        $cash = BankAccount::create([
            'branch_id' => $branch->id,
            'type' => 'cash',
            'display_name' => 'Petty Cash',
            'currency_id' => $currency->id,
            'is_system_generated' => false,
            'active' => true,
        ]);

        $bank->refresh();
        $cash->refresh();

        $this->assertStringStartsWith('BA', $bank->code);
        $this->assertStringStartsWith('BC', $cash->code);

        $linkedAccount = Account::findOrFail($bank->account_id);
        $this->assertSame('bank', $linkedAccount->nature);
        $this->assertTrue((bool) $linkedAccount->is_system_generated);

        $linkedCashAccount = Account::findOrFail($cash->account_id);
        $this->assertSame('cash', $linkedCashAccount->nature);
        $this->assertTrue((bool) $linkedCashAccount->is_system_generated);
    }

    public function test_bank_update_is_idempotent_and_keeps_single_linked_account(): void
    {
        $branch = Branch::factory()->create();
        $currency = Currency::factory()->create();

        $bank = BankAccount::create([
            'branch_id' => $branch->id,
            'type' => 'bank',
            'display_name' => 'Salary Account',
            'currency_id' => $currency->id,
            'active' => true,
        ]);

        $firstAccountId = $bank->account_id;

        $bank->update([
            'display_name' => 'Salary Account Updated',
            'active' => false,
        ]);

        $bank->refresh();

        $this->assertSame($firstAccountId, $bank->account_id);
        $this->assertSame(1, Account::query()->whereKey($firstAccountId)->count());
    }

    public function test_deleting_coa_or_bank_deactivates_linked_account_without_hard_delete(): void
    {
        $branch = Branch::factory()->create();
        $currency = Currency::factory()->create();

        $coa = ChartOfAccount::create([
            'branch_id' => $branch->id,
            'name' => 'Temp COA',
            'currency_id' => $currency->id,
            'active' => true,
        ]);

        $bank = BankAccount::create([
            'branch_id' => $branch->id,
            'type' => 'bank',
            'display_name' => 'Temp Bank',
            'currency_id' => $currency->id,
            'active' => true,
        ]);

        $coaAccountId = $coa->account_id;
        $bankAccountId = $bank->account_id;

        $coa->delete();
        $bank->delete();

        $this->assertDatabaseHas('accounts', [
            'id' => $coaAccountId,
            'active' => false,
        ]);

        $this->assertDatabaseHas('accounts', [
            'id' => $bankAccountId,
            'active' => false,
        ]);
    }
}
