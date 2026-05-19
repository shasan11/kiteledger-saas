<?php

namespace Tests\Feature;

use App\Models\Branch;
use App\Models\DocumentNumbering;
use App\Models\PosTerminal;
use App\Models\User;
use App\Services\Pos\PosCartCalculatorService;
use App\Services\Pos\PosShiftService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Str;
use InvalidArgumentException;
use Tests\TestCase;

class PosBusinessRulesTest extends TestCase
{
    use RefreshDatabase;

    public function test_pos_credit_payment_is_not_counted_as_money_received(): void
    {
        $totals = app(PosCartCalculatorService::class)->calculate(
            [
                [
                    'product_name' => 'Credit item',
                    'qty' => 1,
                    'unit_price' => 100,
                    'discount_percent' => 0,
                ],
            ],
            [
                [
                    'payment_method' => 'credit',
                    'amount' => 100,
                ],
            ],
        );

        $this->assertSame(0.0, $totals['paid_total']);
        $this->assertSame(100.0, $totals['balance_due']);
        $this->assertSame('unpaid', $totals['payment_status']);
    }

    public function test_pos_cashier_cannot_open_multiple_shifts_without_manager_permission(): void
    {
        $user = User::factory()->create();
        $branch = Branch::factory()->create(['active' => true]);
        DocumentNumbering::factory()->create([
            'document_type' => 'pos_shift',
            'prefix' => 'SHIFT-',
            'next_number' => 1,
            'type_of_account' => 'auto_numbering',
            'active' => true,
        ]);

        $firstTerminal = PosTerminal::query()->create([
            'id' => (string) Str::uuid(),
            'branch_id' => $branch->id,
            'name' => 'Counter 1',
            'code' => 'POS-T1',
            'active' => true,
            'user_add_id' => $user->id,
        ]);

        $secondTerminal = PosTerminal::query()->create([
            'id' => (string) Str::uuid(),
            'branch_id' => $branch->id,
            'name' => 'Counter 2',
            'code' => 'POS-T2',
            'active' => true,
            'user_add_id' => $user->id,
        ]);

        $this->actingAs($user);

        app(PosShiftService::class)->openShift([
            'pos_terminal_id' => $firstTerminal->id,
            'opening_cash' => 100,
        ]);

        $this->expectException(InvalidArgumentException::class);
        $this->expectExceptionMessage('This cashier already has an open shift.');

        app(PosShiftService::class)->openShift([
            'pos_terminal_id' => $secondTerminal->id,
            'opening_cash' => 50,
        ]);
    }
}
