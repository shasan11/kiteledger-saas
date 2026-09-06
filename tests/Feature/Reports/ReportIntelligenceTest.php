<?php

declare(strict_types=1);

namespace Tests\Feature\Reports;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\AiProviderManager;
use App\Services\Reports\Intelligence\ReportAccessDeniedException;
use App\Services\Reports\Intelligence\ReportInsightEngine;
use App\Services\Reports\Intelligence\ReportIntelligenceService;
use App\Services\Reports\ReportRunner;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use InvalidArgumentException;
use Mockery;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Phase 2: the report summary is computed from server-executed report data.
 *
 * The defect being closed is a trust bug, not a formatting one: the endpoint
 * accepted `rows`, `totals` and `row_count` in the request body and fed them to
 * the model as fact, so an edited request could change what the AI reported
 * about the company's financial position.
 */
class ReportIntelligenceTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (array_unique([
            'reports.view',
            'reports.financial.view',
            ...AiPermissionService::ALL,
        ]) as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    /** @param string[] $permissions */
    private function userWith(array $permissions): User
    {
        $user = User::factory()->create();
        $user->givePermissionTo($permissions);

        return $user->fresh();
    }

    // ---------- The trust boundary ----------

    public function test_a_manipulated_request_body_cannot_change_the_financial_figures(): void
    {
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        // A report the server will execute for real, returning a known total.
        $this->mock(ReportRunner::class, function ($mock) {
            $mock->shouldReceive('resolve')->andReturn([
                'title' => 'Trial Balance',
                'permission' => 'reports.financial.view',
                'category_label' => 'Accounting',
            ]);
            $mock->shouldReceive('authorizes')->andReturn(true);
            $mock->shouldReceive('run')->andReturn([
                'title' => 'Trial Balance',
                'report_key' => 'trial_balance',
                'columns' => [
                    ['key' => 'account', 'title' => 'Account'],
                    ['key' => 'debit', 'title' => 'Debit'],
                ],
                'rows' => [
                    ['account' => 'Cash', 'debit' => 400.0],
                    ['account' => 'Bank', 'debit' => 600.0],
                ],
                'totals' => [],
                'summary' => [],
                'currency' => ['code' => 'AED'],
                'period' => ['from' => '2026-08-01', 'to' => '2026-08-31'],
                'generated_at' => '2026-09-01 10:00:00',
            ]);
        });

        $this->fakeProviderReturning([
            'executive_summary' => 'Two accounts carry the balance.',
            'trends' => [],
            'risks' => [],
            'recommended_actions' => [],
        ]);

        // The request claims a wildly different figure and row count.
        $response = $this->actingAs($user)->postJson(
            '/api/reports/accounting/trial-balance/ai-summary',
            [
                'filters' => [],
                'rows' => [['account' => 'Fraud', 'debit' => 9_999_999]],
                'totals' => ['debit' => 9_999_999],
                'summary_cards' => [['label' => 'Balance', 'value' => 9_999_999]],
                'metadata' => ['row_count' => 5000],
            ],
        )->assertOk();

        $body = $response->json('data');

        $this->assertSame(2, $body['meta']['row_count'], 'Row count must come from the executed report.');

        // Cast because JSON drops a zero fraction: 1000.0 comes back as 1000.
        $values = array_map('floatval', array_column($body['key_numbers'], 'value'));
        $this->assertContains(1000.0, $values, 'The server-computed total must be present.');
        $this->assertNotContains(9999999.0, $values, 'A client-supplied figure must never become a key number.');

        $this->assertStringNotContainsString('9999999', json_encode($body));
    }

    public function test_the_endpoint_no_longer_requires_report_rows_to_produce_a_summary(): void
    {
        // The browser now sends filters only; a summary must still be possible.
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        $this->mockRunnerReturning([
            ['account' => 'Cash', 'amount' => 120.0],
        ]);

        $this->fakeProviderReturning([
            'executive_summary' => 'One account holds the balance.',
            'trends' => [],
            'risks' => [],
            'recommended_actions' => [],
        ]);

        $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', ['filters' => []])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.row_count', 1);
    }

    public function test_report_permission_is_enforced_separately_from_the_ai_permission(): void
    {
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        $this->mock(ReportRunner::class, function ($mock) {
            $mock->shouldReceive('resolve')->andReturn(['permission' => 'reports.financial.view']);
            $mock->shouldReceive('authorizes')->andReturn(false);
            $mock->shouldNotReceive('run');
        });

        $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', ['filters' => []])
            ->assertStatus(403)
            ->assertJsonPath('success', false);
    }

    public function test_a_provider_failure_is_not_reported_as_a_permission_failure(): void
    {
        // AiProviderException extends RuntimeException, so a catch ordered
        // above it would send an administrator hunting a permission problem
        // when the real cause is a missing API key.
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        $this->mockRunnerReturning([['account' => 'Cash', 'amount' => 10.0]]);

        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldReceive('chat')->andThrow(
                new \App\Services\AI\AiProviderException('no key', 'AI_API_KEY_MISSING')
            );
        });

        $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', ['filters' => []])
            ->assertStatus(422);
    }

    public function test_an_empty_report_is_refused_rather_than_narrated(): void
    {
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        $this->mockRunnerReturning([]);

        $this->expectsNoProviderCall();

        $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', ['filters' => []])
            ->assertStatus(422);
    }

    public function test_unreadable_model_output_still_returns_the_verified_figures(): void
    {
        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);

        $this->mockRunnerReturning([
            ['account' => 'Cash', 'amount' => 250.0],
            ['account' => 'Bank', 'amount' => 750.0],
        ]);

        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldReceive('chat')->andReturn(['text' => 'I am not JSON at all.']);
        });

        $body = $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', ['filters' => []])
            ->assertOk()
            ->json('data');

        // The narrative degrades; the numbers do not.
        $this->assertContains(1000.0, array_map('floatval', array_column($body['key_numbers'], 'value')));
    }

    // ---------- Deterministic analytics ----------

    public function test_statistics_are_computed_without_a_model(): void
    {
        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Customer Balances',
            'report_key' => 'customer_balances',
            'columns' => [
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'balance', 'title' => 'Balance'],
            ],
            'rows' => [
                ['customer' => 'ABC Trading', 'balance' => 5000],
                ['customer' => 'XYZ Limited', 'balance' => 3000],
                ['customer' => 'Acme Co', 'balance' => 2000],
            ],
        ], ['currency' => 'AED']);

        $this->assertSame(3, $analytics->rowCount);

        $stats = $analytics->columnStats['Balance'];
        $this->assertSame(10000.0, $stats['total']);
        $this->assertEqualsWithDelta(3333.33, $stats['average'], 0.01);
        $this->assertSame(3000.0, $stats['median']);
        $this->assertSame(5000.0, $stats['max']);
        $this->assertSame(2000.0, $stats['min']);
    }

    public function test_concentration_identifies_the_largest_contributors(): void
    {
        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Receivables',
            'report_key' => 'receivables',
            'columns' => [
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'amount', 'title' => 'Amount'],
            ],
            'rows' => [
                ['customer' => 'Dominant Co', 'amount' => 8000],
                ['customer' => 'Small A', 'amount' => 1000],
                ['customer' => 'Small B', 'amount' => 1000],
            ],
        ], ['currency' => 'AED']);

        $this->assertSame('Dominant Co', $analytics->concentration[0]['label']);
        $this->assertSame(80.0, $analytics->concentration[0]['share_percent']);

        $codes = array_column($analytics->anomalies, 'code');
        $this->assertContains('HIGH_CONCENTRATION', $codes);
    }

    public function test_ageing_exposure_is_detected_from_bucket_columns(): void
    {
        $rows = [];

        foreach (range(1, 4) as $i) {
            $rows[] = ['customer' => "Old {$i}", 'bucket' => '120+', 'amount' => 1000];
        }

        foreach (range(1, 4) as $i) {
            $rows[] = ['customer' => "New {$i}", 'bucket' => '0-30', 'amount' => 1000];
        }

        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Receivable Ageing',
            'report_key' => 'receivable_ageing',
            'columns' => [
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'bucket', 'title' => 'Bucket'],
                ['key' => 'amount', 'title' => 'Amount'],
            ],
            'rows' => $rows,
        ], ['currency' => 'AED']);

        $aged = collect($analytics->anomalies)->firstWhere('code', 'AGED_EXPOSURE');

        $this->assertNotNull($aged);
        $this->assertStringContainsString('50.0%', $aged['message']);
        $this->assertSame('critical', $aged['severity']);
    }

    public function test_running_balance_columns_are_never_totalled(): void
    {
        // Summing a running balance produces a number that looks authoritative
        // and means nothing.
        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Ledger',
            'report_key' => 'ledger',
            'columns' => [
                ['key' => 'particulars', 'title' => 'Particulars'],
                ['key' => 'debit', 'title' => 'Debit'],
                ['key' => 'running_balance', 'title' => 'Running Balance'],
            ],
            'rows' => [
                ['particulars' => 'Opening', 'debit' => 100, 'running_balance' => 100],
                ['particulars' => 'Sale', 'debit' => 150, 'running_balance' => 250],
            ],
        ], ['currency' => 'AED']);

        $labels = array_column($analytics->keyNumbers, 'label');

        $this->assertContains('Total debit', $labels);
        $this->assertNotContains('Total running balance', $labels);
    }

    public function test_identifier_columns_are_not_treated_as_measures(): void
    {
        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Invoices',
            'report_key' => 'invoices',
            'columns' => [
                ['key' => 'reference', 'title' => 'Reference'],
                ['key' => 'contact_id', 'title' => 'Contact Id'],
                ['key' => 'amount', 'title' => 'Amount'],
            ],
            'rows' => [
                ['reference' => '1001', 'contact_id' => '77', 'amount' => 500],
                ['reference' => '1002', 'contact_id' => '78', 'amount' => 700],
            ],
        ], ['currency' => 'AED']);

        $this->assertArrayNotHasKey('Reference', $analytics->columnStats);
        $this->assertArrayNotHasKey('Contact Id', $analytics->columnStats);
        $this->assertArrayHasKey('Amount', $analytics->columnStats);
    }

    public function test_negative_values_are_surfaced_as_a_warning(): void
    {
        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Stock Value',
            'report_key' => 'stock_value',
            'columns' => [
                ['key' => 'product', 'title' => 'Product'],
                ['key' => 'quantity', 'title' => 'Quantity'],
            ],
            'rows' => [
                ['product' => 'Widget', 'quantity' => 10],
                ['product' => 'Gadget', 'quantity' => -4],
            ],
        ], ['currency' => 'AED']);

        $codes = array_column($analytics->anomalies, 'code');
        $this->assertContains('NEGATIVE_VALUES', $codes);
    }

    public function test_a_ten_thousand_row_report_is_analyzed_in_full(): void
    {
        $rows = [];

        for ($i = 1; $i <= 10000; $i++) {
            $rows[] = ['customer' => 'Customer '.$i, 'amount' => 10];
        }

        $analytics = app(ReportInsightEngine::class)->analyze([
            'title' => 'Large Report',
            'report_key' => 'large',
            'columns' => [
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'amount', 'title' => 'Amount'],
            ],
            'rows' => $rows,
        ], ['currency' => 'AED']);

        // Nothing is sampled away before the statistics are computed — that is
        // the point of moving the analysis server-side.
        $this->assertSame(10000, $analytics->rowCount);
        $this->assertSame(100000.0, $analytics->columnStats['Amount']['total']);
        $this->assertLessThanOrEqual(5, count($analytics->sampleRows));
    }

    public function test_the_prompt_context_carries_verified_numbers_not_raw_rows(): void
    {
        $rows = [];

        for ($i = 1; $i <= 200; $i++) {
            $rows[] = ['customer' => 'Customer '.$i, 'amount' => $i];
        }

        $context = app(ReportInsightEngine::class)->analyze([
            'title' => 'Big',
            'report_key' => 'big',
            'columns' => [
                ['key' => 'customer', 'title' => 'Customer'],
                ['key' => 'amount', 'title' => 'Amount'],
            ],
            'rows' => $rows,
        ], ['currency' => 'AED'])->toPromptContext();

        $this->assertArrayHasKey('verified_key_numbers', $context);
        $this->assertLessThanOrEqual(5, count($context['row_sample'] ?? []));
        $this->assertSame(200, $context['row_count']);
    }

    // ---------- Helpers ----------

    /** @param array<int, array<string, mixed>> $rows */
    private function mockRunnerReturning(array $rows): void
    {
        $this->mock(ReportRunner::class, function ($mock) use ($rows) {
            $mock->shouldReceive('resolve')->andReturn([
                'title' => 'Trial Balance',
                'permission' => 'reports.financial.view',
                'category_label' => 'Accounting',
            ]);
            $mock->shouldReceive('authorizes')->andReturn(true);
            $mock->shouldReceive('run')->andReturn([
                'title' => 'Trial Balance',
                'report_key' => 'trial_balance',
                'columns' => [
                    ['key' => 'account', 'title' => 'Account'],
                    ['key' => 'amount', 'title' => 'Amount'],
                ],
                'rows' => $rows,
                'totals' => [],
                'summary' => [],
                'currency' => ['code' => 'AED'],
                'period' => ['from' => '2026-08-01', 'to' => '2026-08-31'],
                'generated_at' => '2026-09-01 10:00:00',
            ]);
        });
    }

    /** @param array<string, mixed> $narrative */
    private function fakeProviderReturning(array $narrative): void
    {
        $this->mock(AiProviderManager::class, function ($mock) use ($narrative) {
            $mock->shouldReceive('chat')->andReturn([
                'text' => json_encode($narrative),
                'provider' => 'test',
                'model' => 'test',
                'usage' => ['prompt' => 1, 'completion' => 1, 'total' => 2],
            ]);
        });
    }

    private function expectsNoProviderCall(): void
    {
        $this->mock(AiProviderManager::class, function ($mock) {
            $mock->shouldNotReceive('chat');
        });
    }
}
