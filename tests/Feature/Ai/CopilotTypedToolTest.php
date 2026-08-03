<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Copilot\CopilotException;
use App\Services\AI\Copilot\Metrics\CopilotMetricCatalog;
use App\Services\AI\Copilot\Metrics\MetricQuery;
use App\Services\AI\Copilot\Tools\CopilotToolExecutor;
use App\Services\AI\Copilot\Tools\CopilotToolRegistry;
use App\Services\AI\Tools\Queries\ReceivableQueryTool;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

/**
 * Milestone 3: typed tools, registry visibility, execution-time authorization
 * and result sanitization.
 */
class CopilotTypedToolTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();

        foreach (AiPermissionService::ALL as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        foreach (['reports.financial.view', 'inventory.report.view'] as $p) {
            Permission::firstOrCreate(['name' => $p, 'guard_name' => 'web']);
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    private function contextFor(array $permissions): CopilotContext
    {
        $user = User::factory()->create();

        foreach ($permissions as $p) {
            $user->givePermissionTo($p);
        }

        return new CopilotContext(
            user: $user->fresh(),
            tenantId: null,
            tenantConnection: 'tenant',
            branchId: null,
            allowedBranchIds: [],
            fiscalYearId: null,
            allowedFiscalYearIds: [],
            permissions: $permissions,
            applicationUrl: 'https://tenant.test',
            module: 'general',
            conversationId: null,
            locale: 'en',
            baseCurrency: 'AED',
            timezone: 'UTC',
            request: Request::create('/api/ai/chat', 'POST'),
        );
    }

    // ---------- Metric catalog ----------

    public function test_catalog_resolves_metric_and_operation_to_a_deterministic_handler(): void
    {
        $definition = app(CopilotMetricCatalog::class)->resolve('accounts_receivable', 'rank');

        $this->assertSame('accounts_receivable', $definition->key);
        $this->assertSame(ReceivableQueryTool::class, $definition->handlerClass);
        $this->assertSame('highestCustomerBalance', $definition->handlerMethod);
        $this->assertTrue($definition->hasCurrency);
    }

    public function test_unknown_metric_fails_closed_instead_of_guessing(): void
    {
        $this->expectException(CopilotException::class);

        app(CopilotMetricCatalog::class)->resolve('vibes_per_quarter', 'summary');
    }

    public function test_unsupported_operation_for_a_known_metric_is_rejected(): void
    {
        $this->expectException(CopilotException::class);

        // cash_balance only supports summary.
        app(CopilotMetricCatalog::class)->resolve('cash_balance', 'ageing');
    }

    // ---------- Typed input validation ----------

    public function test_metric_query_normalizes_and_bounds_arguments(): void
    {
        $query = MetricQuery::fromArray([
            'metric' => '  Accounts_Receivable ',
            'operation' => 'RANK',
            'date_from' => '2026-01-01',
            'sort_direction' => 'sideways',
            'limit' => 9999,
            'statuses' => ['outstanding', 'partially paid', 12345],
        ]);

        $this->assertSame('accounts_receivable', $query->metric);
        $this->assertSame('rank', $query->operation);
        $this->assertSame('2026-01-01', $query->dateFrom);
        $this->assertSame('desc', $query->sortDirection, 'Invalid sort must fall back, not pass through.');
        $this->assertSame(200, $query->limit, 'Limit must be capped.');
        $this->assertSame(['outstanding', 'partially paid'], $query->statuses);
    }

    public function test_metric_query_rejects_injection_shaped_metric_keys(): void
    {
        $this->expectException(CopilotException::class);

        MetricQuery::fromArray(['metric' => 'invoices; DROP TABLE users']);
    }

    public function test_metric_query_rejects_unparseable_dates(): void
    {
        $this->expectException(CopilotException::class);

        MetricQuery::fromArray(['metric' => 'net_sales', 'date_from' => 'not-a-date']);
    }

    // ---------- Registry visibility ----------

    public function test_registry_hides_tools_the_user_cannot_use(): void
    {
        $registry = app(CopilotToolRegistry::class);

        $limited = $registry->visibleFor($this->contextFor(['ai.use']));

        $this->assertArrayNotHasKey('financial_metrics.query', $limited);
        $this->assertArrayNotHasKey('actions.propose', $limited);
    }

    public function test_registry_shows_financial_tool_only_with_both_ai_and_domain_permission(): void
    {
        $registry = app(CopilotToolRegistry::class);

        // AI permission but no domain permission over financial reports.
        $aiOnly = $registry->visibleFor($this->contextFor(['ai.use', 'ai.financial_queries']));
        $this->assertArrayNotHasKey('financial_metrics.query', $aiOnly);

        $full = $registry->visibleFor($this->contextFor([
            'ai.use', 'ai.financial_queries', 'reports.financial.view',
        ]));
        $this->assertArrayHasKey('financial_metrics.query', $full);
    }

    public function test_write_tool_is_hidden_when_the_feature_flag_is_off(): void
    {
        config(['ai.copilot.write_actions_enabled' => false]);

        $visible = app(CopilotToolRegistry::class)->visibleFor($this->contextFor([
            'ai.use', 'ai.action.propose',
        ]));

        $this->assertArrayNotHasKey('actions.propose', $visible);
    }

    public function test_propose_action_is_declared_as_a_write_requiring_approval(): void
    {
        $definition = app(CopilotToolRegistry::class)->find('actions.propose');

        $this->assertNotNull($definition);
        $this->assertFalse($definition->readOnly);
        $this->assertTrue($definition->requiresApproval);
        $this->assertSame('high', $definition->riskLevel);
        $this->assertFalse($definition->cacheable);
    }

    public function test_every_read_tool_is_declared_read_only_and_needs_no_approval(): void
    {
        foreach (app(CopilotToolRegistry::class)->all() as $name => $definition) {
            if ($name === 'actions.propose') {
                continue;
            }

            $this->assertTrue($definition->readOnly, "{$name} must be read-only");
            $this->assertFalse($definition->requiresApproval, "{$name} must not require approval");
        }
    }

    // ---------- Execution-time authorization ----------

    public function test_executor_rejects_a_user_without_tool_permission(): void
    {
        $this->expectException(CopilotException::class);
        $this->expectExceptionMessage('You do not have permission to use that Copilot capability.');

        app(CopilotToolExecutor::class)->executeMetric(
            $this->contextFor(['ai.use']),
            MetricQuery::fromArray(['metric' => 'accounts_receivable']),
        );
    }

    /**
     * Visibility is not authorization: a user holding the inventory domain
     * permission must still be refused a receivables figure.
     */
    public function test_executor_rejects_a_metric_outside_the_users_domain_permissions(): void
    {
        $context = $this->contextFor(['ai.use', 'ai.financial_queries', 'inventory.report.view']);

        // The tool itself is visible, because inventory satisfies the tool gate.
        $this->assertArrayHasKey(
            'financial_metrics.query',
            app(CopilotToolRegistry::class)->visibleFor($context),
        );

        // The specific metric is still refused.
        $this->expectException(CopilotException::class);
        $this->expectExceptionMessage('You do not have permission to view that figure.');

        app(CopilotToolExecutor::class)->executeMetric(
            $context,
            MetricQuery::fromArray(['metric' => 'accounts_receivable']),
        );
    }

    public function test_grouping_by_an_unsupported_dimension_is_rejected(): void
    {
        $this->expectException(CopilotException::class);

        app(CopilotToolExecutor::class)->executeMetric(
            $this->contextFor(['ai.use', 'ai.financial_queries', 'reports.financial.view']),
            MetricQuery::fromArray([
                'metric' => 'cash_balance',
                'group_by' => 'customer',
            ]),
        );
    }
}
