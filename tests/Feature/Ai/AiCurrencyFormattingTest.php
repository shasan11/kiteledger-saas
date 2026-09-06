<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\Currency;
use App\Services\AI\Copilot\AnswerSourcePolicy;
use App\Services\AI\Copilot\CopilotIntent;
use App\Services\AI\Copilot\CopilotResponseComposer;
use App\Services\AI\Copilot\CopilotRoutingDecision;
use App\Services\AI\Copilot\Tools\CopilotToolResult;
use App\Services\Reports\Intelligence\ReportInsightEngine;
use App\Support\Money\CurrencyFormatter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Amounts produced by the AI surfaces are shown as money.
 *
 * Before this, a Copilot card rendered "20800.5", the report drawer wrote the
 * currency code in front of every figure including counts, and the React
 * components hard-coded "NPR" — so a tenant on any other currency was shown
 * the wrong label on a real balance.
 */
class AiCurrencyFormattingTest extends TestCase
{
    use RefreshDatabase;

    private function baseCurrency(string $code = 'AED', string $symbol = 'د.إ', int $decimals = 2): Currency
    {
        return Currency::query()->create([
            'code' => $code,
            'name' => $code,
            'symbol' => $symbol,
            'decimal_places' => $decimals,
            'exchange_rate' => 1,
            'is_base' => true,
            'active' => true,
        ]);
    }

    private function decision(): CopilotRoutingDecision
    {
        return new CopilotRoutingDecision(
            intent: CopilotIntent::MetricQuery,
            confidence: 0.95,
            requiresLiveData: true,
            requiresKnowledge: false,
            candidateTools: ['financial_metrics.query'],
            entities: [],
            filters: [],
            missingFields: [],
            reason: null,
            decidedBy: 'model_classification',
            sourcePolicy: AnswerSourcePolicy::LiveToolRequired,
        );
    }

    // ---------- The formatter itself ----------

    public function test_the_base_currency_comes_from_the_tenant_not_from_a_constant(): void
    {
        $this->baseCurrency();

        $formatter = app(CurrencyFormatter::class);

        $this->assertSame('AED', $formatter->base()->code);
        $this->assertSame('د.إ 20,800.50', $formatter->format(20800.5));
    }

    public function test_an_unknown_currency_code_still_labels_the_amount(): void
    {
        $this->baseCurrency();

        // A document may state a currency the tenant has never configured; the
        // amount is still labelled, with the code standing in for the symbol.
        $this->assertSame('JPY 1,200.00', app(CurrencyFormatter::class)->format(1200, 'JPY'));
    }

    public function test_counts_are_not_dressed_up_as_money(): void
    {
        $this->assertTrue(CurrencyFormatter::looksMonetary('balance_due'));
        $this->assertTrue(CurrencyFormatter::looksMonetary('Total sales'));
        $this->assertFalse(CurrencyFormatter::looksMonetary('invoice_count'));
        $this->assertFalse(CurrencyFormatter::looksMonetary('total_quantity'));
        $this->assertSame('12', app(CurrencyFormatter::class)->plain(12));
    }

    // ---------- Copilot ----------

    public function test_copilot_cards_and_columns_carry_the_rendered_amount(): void
    {
        $this->baseCurrency('USD', '$');

        $result = new CopilotToolResult(
            tool: 'financial_metrics.query',
            verified: true,
            dataSource: 'live_database',
            rows: [['customer' => 'ABC Trading', 'balance' => 12500.5]],
            metrics: ['total' => 20800.5, 'invoice_count' => 12],
            currency: 'USD',
        );

        $response = app(CopilotResponseComposer::class)->fromToolResult(
            $result,
            $this->decision(),
            'Accounts receivable',
        );

        $cards = collect($response->cards)->keyBy('label');

        $this->assertSame('$ 20,800.50', $cards['Total']['formatted']);
        $this->assertSame('money', $cards['Total']['format']);

        // The count travelling alongside the balance is still a count.
        $this->assertSame('12', $cards['Invoice Count']['formatted']);
        $this->assertSame('number', $cards['Invoice Count']['format']);

        // Only the money column is marked for money rendering.
        $columns = collect($response->tables[0]['columns'])->keyBy('key');
        $this->assertSame('money', $columns['balance']['format']);
        $this->assertArrayNotHasKey('format', $columns['customer']);

        // The client is told how to write amounts rather than assuming.
        $this->assertSame(
            ['code' => 'USD', 'symbol' => '$', 'decimal_places' => 2],
            $response->toArray('conv', 'req')['currency'],
        );
    }

    public function test_the_fallback_answer_states_the_figure_with_its_currency(): void
    {
        $this->baseCurrency('USD', '$');

        $result = new CopilotToolResult(
            tool: 'financial_metrics.query',
            verified: true,
            dataSource: 'live_database',
            metrics: ['total' => 20800.5],
            currency: 'USD',
        );

        $response = app(CopilotResponseComposer::class)->fromToolResult(
            $result,
            $this->decision(),
            'Accounts receivable',
        );

        $this->assertStringContainsString('$ 20,800.50', $response->message);
    }

    // ---------- Report summary ----------

    public function test_report_key_numbers_are_rendered_in_the_tenant_currency(): void
    {
        $this->baseCurrency('USD', '$');

        $analytics = app(ReportInsightEngine::class)->analyze([
            'report_key' => 'sales_by_customer',
            'title' => 'Sales by customer',
            'columns' => [
                ['title' => 'Customer', 'key' => 'customer'],
                ['title' => 'Sales Total', 'key' => 'sales_total'],
                ['title' => 'Invoice Count', 'key' => 'invoice_count'],
            ],
            'rows' => [
                ['customer' => 'ABC Trading', 'sales_total' => 1500.25, 'invoice_count' => 3],
                ['customer' => 'XYZ Limited', 'sales_total' => 2500.75, 'invoice_count' => 5],
            ],
        ], []);

        $numbers = collect($analytics->keyNumbers)->keyBy('key');

        $this->assertSame('$ 4,001.00', $numbers['sales_total']['formatted']);
        $this->assertSame('money', $numbers['sales_total']['measure']);

        $this->assertSame('8', $numbers['invoice_count']['formatted']);
        $this->assertSame('number', $numbers['invoice_count']['measure']);
        $this->assertNull($numbers['invoice_count']['currency']);
    }
}
