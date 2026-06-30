<?php

namespace Tests\Feature\Reports;

use App\Models\Permission;
use App\Models\User;
use App\Services\AI\AiPermissionService;
use App\Services\Reports\ReportAiSummaryService;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\ReportSoftQueryService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Spatie\Permission\PermissionRegistrar;
use Tests\TestCase;

class ReportMatrixTest extends TestCase
{
    use RefreshDatabase;

    private const CATEGORY_PERMISSIONS = [
        'accounting' => 'reports.financial.view',
        'receivable' => 'reports.financial.view',
        'payable' => 'reports.financial.view',
        'sales' => 'reports.sales.view',
        'purchase' => 'reports.purchase.view',
        'tax' => 'reports.tax.view',
        'inventory' => 'reports.inventory.view',
        'production' => 'reports.inventory.view',
        'hr' => 'reports.hrm.view',
        'system' => 'reports.system.view',
        'analytics' => 'reports.analytics.view',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        foreach (array_unique([
            ...array_values(self::CATEGORY_PERMISSIONS),
            'reports.view',
            'reports.export',
            'branches.view-all',
            ...AiPermissionService::ALL,
        ]) as $permission) {
            Permission::findOrCreate($permission, 'web');
        }

        app(PermissionRegistrar::class)->forgetCachedPermissions();
    }

    public function test_registry_and_empty_api_contract_cover_every_report(): void
    {
        $categories = ReportRegistry::categories();
        $this->assertCount(11, $categories);
        $this->assertSame(63, collect($categories)->sum(fn (array $category) => count($category['reports'])));

        $user = $this->userWith(['reports.view']);
        $this->actingAs($user);

        foreach ($categories as $category => $categoryMeta) {
            foreach ($categoryMeta['reports'] as $key => $reportMeta) {
                $resolved = ReportRegistry::resolve($category, $key);
                $this->assertSame($key, $resolved['report_key']);
                $this->assertSame("/reports/{$category}/{$key}", $resolved['route_path']);

                foreach ($reportMeta['filter_schema'] ?? [] as $filter) {
                    $this->assertContains($filter['type'], ['dateRange', 'date', 'branch', 'select', 'status', 'groupBy', 'checkbox']);
                    $this->assertNotEmpty($filter['key']);
                }

                $response = $this->getJson("/api/reports/{$category}/{$key}?date_from=2026-01-01&date_to=2026-12-31&as_of_date=2026-12-31&ageing_as_of_date=2026-12-31");
                $response->assertOk()->assertJsonStructure([
                    'title', 'category', 'report_key', 'period', 'filters',
                    'summary', 'columns', 'rows', 'totals', 'generated_at', 'company',
                ]);

                $payload = $response->json();
                $this->assertSame(str_replace('-', '_', $key), $payload['report_key']);
                $this->assertIsArray($payload['rows']);
                $this->assertIsArray($payload['totals']);
                foreach ($payload['columns'] as $column) {
                    $this->assertNotEmpty($column['title'] ?? null);
                    $this->assertNotEmpty($column['key'] ?? null);
                }
            }
        }
    }

    public function test_every_title_and_alias_resolves_to_its_canonical_report(): void
    {
        $resolver = app(ReportSoftQueryService::class);

        foreach (ReportRegistry::categories() as $category => $categoryMeta) {
            foreach ($categoryMeta['reports'] as $key => $report) {
                foreach (array_unique([$report['title'], ...($report['aliases'] ?? [])]) as $phrase) {
                    $resolved = $resolver->resolve($phrase);
                    $this->assertTrue($resolved['matched'] ?? false, "Report phrase did not resolve: {$phrase}");
                    $this->assertSame($category, $resolved['category'], "Wrong category for: {$phrase}");
                    $this->assertSame($key, $resolved['report_key'], "Wrong report for: {$phrase}");
                }
            }
        }
    }

    public function test_category_view_export_and_branch_permissions_are_enforced(): void
    {
        [$ownBranch, $otherBranch] = $this->branches();
        $user = $this->userWith(['reports.financial.view'], $ownBranch);

        $this->actingAs($user)
            ->getJson('/api/reports/accounting/trial-balance?branch_id='.$otherBranch)
            ->assertOk()
            ->assertJsonPath('filters.branch_id', $ownBranch);

        $this->actingAs($user)
            ->getJson('/api/reports/sales/sales-summary')
            ->assertForbidden();

        $this->actingAs($user)
            ->get('/api/reports/accounting/trial-balance/export?format=csv')
            ->assertForbidden();

        $user->givePermissionTo('reports.export');
        $this->actingAs($user->fresh())
            ->get('/api/reports/accounting/trial-balance/export?format=csv')
            ->assertOk();

        $user->givePermissionTo('branches.view-all');
        $this->actingAs($user->fresh())
            ->getJson('/api/reports/accounting/trial-balance?branch_id='.$otherBranch)
            ->assertOk()
            ->assertJsonPath('filters.branch_id', $otherBranch);
    }

    public function test_all_report_exports_support_csv_xlsx_and_pdf(): void
    {
        ini_set('memory_limit', '1024M');
        $user = $this->userWith(['reports.view', 'reports.export']);
        $this->actingAs($user);

        foreach (ReportRegistry::categories() as $category => $categoryMeta) {
            foreach ($categoryMeta['reports'] as $key => $report) {
                foreach (['csv', 'xlsx', 'pdf'] as $format) {
                    $response = $this->get("/api/reports/{$category}/{$key}/export?format={$format}&date_from=2026-01-01&date_to=2026-12-31");
                    $response->assertOk();
                    $this->assertStringContainsString(
                        match ($format) {
                            'csv' => 'text/csv',
                            'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                            'pdf' => 'application/pdf',
                        },
                        (string) $response->headers->get('content-type'),
                        "Wrong {$format} content type for {$category}/{$key}",
                    );
                    unset($response);
                    gc_collect_cycles();
                }
            }
        }
    }

    public function test_report_summary_endpoint_is_isolated_from_the_removed_assistant(): void
    {
        $this->mock(ReportAiSummaryService::class)
            ->shouldReceive('summarize')
            ->once()
            ->andReturn([
                'summary' => [
                    'executive_summary' => 'The trial balance is balanced.',
                    'key_numbers' => ['Total debit and credit are 100.'],
                    'trends' => [],
                    'risks' => [],
                    'recommended_actions' => [],
                    'disclaimer' => 'AI-generated.',
                ],
                'meta' => [
                    'report_key' => 'trial-balance',
                    'report_title' => 'Trial Balance',
                ],
            ]);

        $viewer = $this->userWith(['reports.financial.view']);
        $this->actingAs($viewer)
            ->postJson('/api/ai/chat', ['message' => 'Show trial balance'])
            ->assertNotFound();

        $this->actingAs($viewer)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', [
                'summary_cards' => [['label' => 'Balance', 'value' => 100]],
            ])
            ->assertForbidden()
            ->assertJsonPath('success', false);

        $user = $this->userWith(['reports.ai_summary', 'reports.financial.view']);
        $this->actingAs($user)
            ->postJson('/api/reports/accounting/trial-balance/ai-summary', [
                'summary_cards' => [['label' => 'Balance', 'value' => 100]],
            ])
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.meta.report_key', 'trial-balance')
            ->assertJsonPath('data.summary.executive_summary', 'The trial balance is balanced.');
    }

    private function userWith(array $permissions, ?string $branchId = null): User
    {
        $user = User::factory()->create(['branch_id' => $branchId]);
        $user->givePermissionTo($permissions);

        return $user->fresh();
    }

    private function branches(): array
    {
        $ids = [(string) Str::uuid(), (string) Str::uuid()];
        foreach ($ids as $index => $id) {
            DB::table('branches')->insert([
                'id' => $id,
                'code' => 'RPT-'.($index + 1),
                'name' => 'Report Branch '.($index + 1),
                'active' => true,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }

        return $ids;
    }
}
