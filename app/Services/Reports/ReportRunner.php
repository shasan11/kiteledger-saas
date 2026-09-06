<?php

declare(strict_types=1);

namespace App\Services\Reports;

use Illuminate\Http\Request;
use InvalidArgumentException;

/**
 * The one way to execute a report from server-side code.
 *
 * Previously the category-to-service map lived only inside ReportController,
 * so anything else that needed report data — the AI summarizer above all — had
 * to be handed rows by the browser instead. That made the client the source of
 * financial truth. This class exposes the same canonical engine the HTTP
 * endpoint uses, so a report means the same thing however it is reached.
 *
 * Not final: it is the seam where tests substitute report output, the same
 * convention NeuronProviderFactory follows for AI providers. Executing a real
 * report in a test means seeding a full chart of accounts and postings, which
 * belongs in the report tests rather than in every summarizer test.
 */
class ReportRunner
{
    public function __construct(
        private readonly ReportFilterService $filters,
    ) {}

    /**
     * Report metadata, or null when the category/key pair is unknown.
     *
     * @return array<string, mixed>|null
     */
    public function resolve(string $category, string $reportKey): ?array
    {
        return ReportRegistry::resolve($category, $reportKey);
    }

    /**
     * Whether the user may read this report.
     *
     * Mirrors ReportController::authorizePermission exactly: the blanket
     * `reports.view` grant, or the report's own permission.
     */
    public function authorizes(Request $request, array $meta): bool
    {
        $user = $request->user();

        if (! $user) {
            return false;
        }

        return $user->can('reports.view') || $user->can($meta['permission'] ?? 'reports.view');
    }

    /**
     * Executes the report and returns the engine's own payload.
     *
     * `$filterOverrides` are applied as query parameters on a copy of the
     * request, because ReportFilterService reads filters from the query string.
     * Normalization still runs afterwards, so branch scope, fiscal defaults and
     * the "can this user see all branches" rule are enforced on the server — a
     * caller cannot widen its own scope by passing a branch_id.
     *
     * @param  array<string, mixed>  $filterOverrides
     * @return array<string, mixed>
     */
    public function run(Request $request, string $category, string $reportKey, array $filterOverrides = []): array
    {
        $meta = $this->resolve($category, $reportKey);

        if (! $meta) {
            throw new InvalidArgumentException('Report not found.');
        }

        return $this->serviceFor($category)->build(
            $reportKey,
            $this->filters->normalize($this->requestWithFilters($request, $filterOverrides)),
            $meta,
        );
    }

    /**
     * @param  array<string, mixed>  $overrides
     */
    private function requestWithFilters(Request $request, array $overrides): Request
    {
        if ($overrides === []) {
            return $request;
        }

        $scalar = [];

        foreach ($overrides as $key => $value) {
            // Only scalars are meaningful as report filters; anything else is
            // dropped rather than passed into the query builder.
            if (is_scalar($value) || $value === null) {
                $scalar[(string) $key] = $value === null ? null : (string) $value;
            }
        }

        $copy = Request::create(
            $request->url(),
            'GET',
            $scalar,
            [],
            [],
            $request->server->all(),
        );

        // The report services and the branch-scope check both need the
        // authenticated user, which Request::create() does not carry over.
        $copy->setUserResolver($request->getUserResolver());

        return $copy;
    }

    private function serviceFor(string $category): BaseReportService
    {
        $class = match ($category) {
            'accounting' => AccountingReportService::class,
            'receivable' => ReceivableReportService::class,
            'payable' => PayableReportService::class,
            'sales' => SalesReportService::class,
            'purchase' => PurchaseReportService::class,
            'tax' => TaxReportService::class,
            'inventory' => InventoryReportService::class,
            'production' => ProductionReportService::class,
            'hr' => HrReportService::class,
            'system' => SystemReportService::class,
            'analytics' => AnalyticsReportService::class,
            default => throw new InvalidArgumentException('Unknown report category.'),
        };

        return app($class);
    }
}
