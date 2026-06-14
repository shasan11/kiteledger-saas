<?php

namespace Tests\Feature;

use App\Models\Account;
use App\Models\Branch;
use App\Models\ChequeFormatConfiguration;
use App\Models\ChequeRegister;
use App\Models\User;
use App\Services\ChequePrintService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ChequePrintTest extends TestCase
{
    use RefreshDatabase;

    public function test_issued_cheque_prints_with_configured_format(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $bank = $this->account('Bank', '1010', 'bank');
        $supplier = $this->account('Supplier ABC', '2010', 'coa');

        $cheque = ChequeRegister::query()->create([
            'cheque_no' => 'CHQ-001',
            'cheque_date' => '2026-06-14',
            'issued_date' => '2026-06-14',
            'payee_name' => 'John Doe Traders',
            'direction' => 'issued',
            'account_id' => $bank->id,
            'related_account_id' => $supplier->id,
            'amount' => 1250.50,
            'status' => 'pending',
            'active' => true,
        ]);

        $response = $this->get("/api/cheque-registers/{$cheque->id}/print");
        $response->assertOk();
        $html = $response->getContent();

        $this->assertStringContainsString('John Doe Traders', $html);
        $this->assertStringContainsString('1,250.50', $html);
        $this->assertStringContainsString('One Thousand Two Hundred Fifty and Fifty Paisa Only', $html);

        // A default format was auto-seeded on first print.
        $this->assertDatabaseHas('cheque_format_configurations', ['active' => true]);
    }

    public function test_issued_cheque_pdf_endpoint_returns_pdf(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $cheque = ChequeRegister::query()->create([
            'cheque_no' => 'CHQ-002',
            'cheque_date' => '2026-06-14',
            'issued_date' => '2026-06-14',
            'payee_name' => 'Acme Pvt Ltd',
            'direction' => 'issued',
            'account_id' => $this->account('Bank', '1010', 'bank')->id,
            'related_account_id' => $this->account('Vendor', '2010', 'coa')->id,
            'amount' => 500,
            'status' => 'pending',
            'active' => true,
        ]);

        $response = $this->get("/api/cheque-registers/{$cheque->id}/print-pdf");
        $response->assertOk();
        $this->assertSame('application/pdf', $response->headers->get('content-type'));
    }

    public function test_received_cheque_cannot_be_printed(): void
    {
        $branch = Branch::factory()->create(['active' => true]);
        $this->actingAs(User::factory()->create(['branch_id' => $branch->id]));

        $cheque = ChequeRegister::query()->create([
            'cheque_no' => 'CHQ-003',
            'cheque_date' => '2026-06-14',
            'issued_date' => '2026-06-14',
            'received_date' => '2026-06-14',
            'payee_name' => 'Customer XYZ',
            'direction' => 'received',
            'account_id' => $this->account('Bank', '1010', 'bank')->id,
            'related_account_id' => $this->account('Customer', '1200', 'coa')->id,
            'amount' => 999,
            'status' => 'pending',
            'active' => true,
        ]);

        $this->get("/api/cheque-registers/{$cheque->id}/print")->assertStatus(422);
    }

    public function test_amount_to_words(): void
    {
        $service = app(ChequePrintService::class);

        $this->assertSame('One Thousand Two Hundred Fifty and Fifty Paisa Only', $service->amountToWords(1250.50));
        $this->assertSame('Five Hundred Only', $service->amountToWords(500));
        $this->assertSame('Zero Only', $service->amountToWords(0));
        $this->assertSame('One Million Only', $service->amountToWords(1000000));
    }

    protected function account(string $name, string $code, string $nature): Account
    {
        return Account::query()->create([
            'name' => $name, 'code' => $code, 'nature' => $nature,
            'dr_amount' => 0, 'cr_amount' => 0, 'balance' => 0,
            'active' => true, 'is_system_generated' => false,
        ]);
    }
}
