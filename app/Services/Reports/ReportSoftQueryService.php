<?php

namespace App\Services\Reports;

use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\FiscalYear;
use App\Models\Product;
use App\Models\Warehouse;
use App\Services\BranchScopeService;
use Carbon\Carbon;
use Illuminate\Http\Request;

/**
 * Resolve fuzzy natural-language report queries to a canonical
 * category/report_key + filters using the whitelisted ReportRegistry.
 *
 * Never executes arbitrary SQL. Never lets AI invent report URLs.
 */
class ReportSoftQueryService
{
    public function __construct(private readonly BranchScopeService $branchScope) {}

    public function resolve(string $query, ?Request $request = null): array
    {
        $query = trim($query);
        if ($query === '') {
            return $this->miss('Empty query.');
        }

        $lower = mb_strtolower($query);
        $request ??= request();

        $match = $this->matchReport($lower);
        if (! $match) {
            return $this->miss('No matching report found.', $this->suggestions($lower));
        }

        $meta = ReportRegistry::resolve($match['category'], $match['report_key']);
        if (! $meta) {
            return $this->miss('Matched report no longer exists.');
        }

        $period = $this->detectPeriod($lower);
        $filters = $this->buildFilters($meta, $period, $lower, $request);
        $url = $this->buildOpenUrl($meta['route_path'], $filters);

        return [
            'matched' => true,
            'confidence' => $match['confidence'],
            'category' => $meta['category'],
            'category_label' => $meta['category_label'],
            'report_key' => $meta['report_key'],
            'title' => $meta['title'],
            'description' => $meta['description'] ?? '',
            'filters' => $filters,
            'open_url' => $url,
            'reason' => $match['reason'],
        ];
    }

    public function suggestions(string $lower, int $limit = 5): array
    {
        $scored = [];
        foreach (ReportRegistry::categories() as $catKey => $cat) {
            foreach ($cat['reports'] as $key => $report) {
                $score = $this->similarity($lower, $report);
                if ($score > 0) {
                    $scored[] = [
                        'category' => $catKey,
                        'report_key' => $key,
                        'title' => $report['title'],
                        'score' => $score,
                        'route_path' => "/reports/{$catKey}/{$key}",
                    ];
                }
            }
        }
        usort($scored, fn ($a, $b) => $b['score'] <=> $a['score']);

        return array_slice($scored, 0, $limit);
    }

    protected function matchReport(string $lower): ?array
    {
        $best = null;

        foreach (ReportRegistry::categories() as $catKey => $cat) {
            foreach ($cat['reports'] as $key => $report) {
                [$score, $reason] = $this->scoreReport($lower, $catKey, $key, $report);
                if ($score <= 0) {
                    continue;
                }
                if ($best === null || $score > $best['score']) {
                    $best = [
                        'category' => $catKey,
                        'report_key' => $key,
                        'score' => $score,
                        'reason' => $reason,
                    ];
                }
            }
        }

        if (! $best || $best['score'] < 0.45) {
            return null;
        }

        return [
            'category' => $best['category'],
            'report_key' => $best['report_key'],
            'confidence' => min(1.0, round($best['score'], 2)),
            'reason' => $best['reason'],
        ];
    }

    protected function scoreReport(string $lower, string $catKey, string $key, array $report): array
    {
        $title = mb_strtolower($report['title']);
        $aliases = array_map('mb_strtolower', $report['aliases'] ?? []);
        $keywords = array_map('mb_strtolower', $report['keywords'] ?? []);

        // Exact title or alias match wins.
        if ($lower === $title) {
            return [1.0, "Exact match on title '{$report['title']}'."];
        }
        foreach ($aliases as $alias) {
            if ($lower === $alias) {
                return [0.98, "Exact match on alias '{$alias}'."];
            }
        }

        // Title contained in query, or query contained in title.
        $score = 0.0;
        $reason = '';

        if (str_contains($lower, $title)) {
            $score = max($score, 0.9);
            $reason = "Query contains report title '{$report['title']}'.";
        } elseif (str_contains($title, $lower) && mb_strlen($lower) >= 4) {
            $score = max($score, 0.7);
            $reason = 'Report title contains query phrase.';
        }

        foreach ($aliases as $alias) {
            if ($alias === '') {
                continue;
            }
            if (str_contains($lower, $alias)) {
                $aliasScore = 0.85 + min(0.1, mb_strlen($alias) / 100);
                if ($aliasScore > $score) {
                    $score = $aliasScore;
                    $reason = "Matched alias '{$alias}' to {$report['title']}.";
                }
            }
        }

        // Keyword coverage.
        $kwHits = 0;
        $kwTotal = max(1, count($keywords));
        foreach ($keywords as $kw) {
            if ($kw !== '' && str_contains($lower, $kw)) {
                $kwHits++;
            }
        }
        if ($kwHits > 0) {
            $kwScore = 0.45 + ($kwHits / $kwTotal) * 0.3;
            if ($kwScore > $score) {
                $score = $kwScore;
                $reason = "Matched {$kwHits} keyword(s) for {$report['title']}.";
            }
        }

        return [$score, $reason];
    }

    protected function similarity(string $lower, array $report): float
    {
        $title = mb_strtolower($report['title']);
        $aliases = array_map('mb_strtolower', $report['aliases'] ?? []);

        $best = 0.0;
        similar_text($lower, $title, $pct);
        $best = max($best, $pct / 100);

        foreach ($aliases as $alias) {
            similar_text($lower, $alias, $pct);
            $best = max($best, $pct / 100);
        }

        return round($best, 3);
    }

    public function detectPeriod(string $lower): array
    {
        $today = Carbon::now();
        $period = ['date_from' => null, 'date_to' => null, 'as_of' => null];

        if (preg_match('/from\s+(\d{4}-\d{2}-\d{2})\s+to\s+(\d{4}-\d{2}-\d{2})/', $lower, $m)) {
            return ['date_from' => $m[1], 'date_to' => $m[2], 'as_of' => $m[2]];
        }

        if (str_contains($lower, 'today')) {
            $d = $today->toDateString();

            return ['date_from' => $d, 'date_to' => $d, 'as_of' => $d];
        }

        if (str_contains($lower, 'yesterday')) {
            $d = $today->copy()->subDay()->toDateString();

            return ['date_from' => $d, 'date_to' => $d, 'as_of' => $d];
        }

        if (str_contains($lower, 'last week')) {
            $start = $today->copy()->subWeek()->startOfWeek();
            $end = $today->copy()->subWeek()->endOfWeek();

            return ['date_from' => $start->toDateString(), 'date_to' => $end->toDateString(), 'as_of' => $end->toDateString()];
        }

        if (str_contains($lower, 'this week')) {
            return [
                'date_from' => $today->copy()->startOfWeek()->toDateString(),
                'date_to' => $today->toDateString(),
                'as_of' => $today->toDateString(),
            ];
        }

        if (str_contains($lower, 'last month')) {
            $ref = $today->copy()->subMonthNoOverflow();

            return [
                'date_from' => $ref->copy()->startOfMonth()->toDateString(),
                'date_to' => $ref->copy()->endOfMonth()->toDateString(),
                'as_of' => $ref->copy()->endOfMonth()->toDateString(),
            ];
        }

        if (str_contains($lower, 'this month')) {
            return [
                'date_from' => $today->copy()->startOfMonth()->toDateString(),
                'date_to' => $today->toDateString(),
                'as_of' => $today->toDateString(),
            ];
        }

        if (str_contains($lower, 'last quarter')) {
            $ref = $today->copy()->subQuarterNoOverflow();

            return [
                'date_from' => $ref->copy()->startOfQuarter()->toDateString(),
                'date_to' => $ref->copy()->endOfQuarter()->toDateString(),
                'as_of' => $ref->copy()->endOfQuarter()->toDateString(),
            ];
        }

        if (str_contains($lower, 'this quarter')) {
            return [
                'date_from' => $today->copy()->startOfQuarter()->toDateString(),
                'date_to' => $today->toDateString(),
                'as_of' => $today->toDateString(),
            ];
        }

        if (str_contains($lower, 'this year') || str_contains($lower, 'ytd')) {
            return [
                'date_from' => $today->copy()->startOfYear()->toDateString(),
                'date_to' => $today->toDateString(),
                'as_of' => $today->toDateString(),
            ];
        }

        if (str_contains($lower, 'last year')) {
            $ref = $today->copy()->subYear();

            return [
                'date_from' => $ref->copy()->startOfYear()->toDateString(),
                'date_to' => $ref->copy()->endOfYear()->toDateString(),
                'as_of' => $ref->copy()->endOfYear()->toDateString(),
            ];
        }

        // Default = current fiscal year up to today.
        $fy = FiscalYear::query()->where('is_current', true)->first();
        $from = $fy?->start_date?->toDateString() ?? $today->copy()->startOfMonth()->toDateString();
        $to = $today->toDateString();
        if ($fy && $fy->end_date && $today->gt($fy->end_date)) {
            $to = $fy->end_date->toDateString();
        }

        $asOf = $to;
        if (str_contains($lower, 'as of today') || str_contains($lower, 'as at today')) {
            $asOf = $today->toDateString();
        }
        if (str_contains($lower, 'as of yesterday') || str_contains($lower, 'as at yesterday')) {
            $asOf = $today->copy()->subDay()->toDateString();
        }

        return ['date_from' => $from, 'date_to' => $to, 'as_of' => $asOf];
    }

    protected function buildFilters(array $meta, array $period, string $lower, Request $request): array
    {
        $filters = [];
        $mode = $meta['default_date_mode'] ?? ReportRegistry::DATE_MODE_PERIOD;
        if ($mode === ReportRegistry::DATE_MODE_PERIOD) {
            if ($period['date_from']) {
                $filters['date_from'] = $period['date_from'];
            }
            if ($period['date_to']) {
                $filters['date_to'] = $period['date_to'];
            }
        } elseif ($mode === ReportRegistry::DATE_MODE_AS_OF) {
            if ($period['as_of']) {
                $filters['as_of_date'] = $period['as_of'];
            }
        } elseif ($mode === ReportRegistry::DATE_MODE_AGEING) {
            if ($period['as_of']) {
                $filters['ageing_as_of_date'] = $period['as_of'];
            }
        }

        $schema = $meta['filter_schema'] ?? [];
        $keys = array_column($schema, 'key');

        $branchId = $this->detectBranch($lower, $request, in_array('branch_id', $keys, true));
        if ($branchId) {
            $filters['branch_id'] = $branchId;
        }

        if (in_array('customer_id', $keys, true)) {
            $id = $this->detectContact($lower, 'customer');
            if ($id) {
                $filters['customer_id'] = $id;
            }
        }

        if (in_array('supplier_id', $keys, true)) {
            $id = $this->detectContact($lower, 'supplier');
            if ($id) {
                $filters['supplier_id'] = $id;
            }
        }

        if (in_array('product_id', $keys, true)) {
            $id = $this->detectProduct($lower);
            if ($id) {
                $filters['product_id'] = $id;
            }
        }

        if (in_array('warehouse_id', $keys, true)) {
            $id = $this->detectWarehouse($lower);
            if ($id) {
                $filters['warehouse_id'] = $id;
            }
        }

        if (in_array('chart_of_account_id', $keys, true)) {
            $id = $this->detectAccount($lower);
            if ($id) {
                $filters['chart_of_account_id'] = $id;
            }
        }

        if (in_array('group_by', $keys, true)) {
            $groupBy = $this->detectGroupBy($lower, $meta['category']);
            if ($groupBy) {
                $filters['group_by'] = $groupBy;
            }
        }

        return $filters;
    }

    protected function detectBranch(string $lower, Request $request, bool $branchAllowed): ?string
    {
        if (! $branchAllowed) {
            return null;
        }

        $user = $request->user();
        $canAll = $this->branchScope->canViewAllBranches($user);

        // Mentions "all branches" – only honour if user is allowed.
        if (str_contains($lower, 'all branches') || str_contains($lower, 'every branch')) {
            return $canAll ? 'all' : ($user->current_branch_id ?? $user->branch_id ?? null);
        }

        // Try named match.
        $branches = Branch::query()->where('active', true)->get(['id', 'name', 'code']);
        foreach ($branches as $b) {
            $name = mb_strtolower($b->name);
            $code = $b->code ? mb_strtolower($b->code) : null;
            if ($name && $name !== '' && str_contains($lower, $name)) {
                if (! $canAll && $user && (string) ($user->current_branch_id ?? $user->branch_id) !== (string) $b->id) {
                    // user not allowed to switch — fall through to default
                    break;
                }

                return (string) $b->id;
            }
            if ($code && str_contains($lower, $code)) {
                if (! $canAll && $user && (string) ($user->current_branch_id ?? $user->branch_id) !== (string) $b->id) {
                    break;
                }

                return (string) $b->id;
            }
        }

        // Default = current branch
        if ($user && ! empty($user->current_branch_id)) {
            return (string) $user->current_branch_id;
        }
        if ($user && ! empty($user->branch_id)) {
            return (string) $user->branch_id;
        }

        return null;
    }

    protected function detectContact(string $lower, string $type): ?string
    {
        // Look for "for <name>" or "of <name>" hints. Otherwise scan top contacts.
        $contacts = Contact::query()
            ->where('contact_type', $type)
            ->where('active', true)
            ->limit(500)
            ->get(['id', 'name', 'code']);

        foreach ($contacts as $c) {
            $name = mb_strtolower($c->name);
            if ($name && str_contains($lower, $name)) {
                return (string) $c->id;
            }
        }

        return null;
    }

    protected function detectProduct(string $lower): ?string
    {
        $products = Product::query()->where('active', true)->limit(500)->get(['id', 'name', 'code', 'sku']);
        foreach ($products as $p) {
            $name = mb_strtolower($p->name);
            if ($name && str_contains($lower, $name)) {
                return (string) $p->id;
            }
        }

        return null;
    }

    protected function detectWarehouse(string $lower): ?string
    {
        $list = Warehouse::query()->where('active', true)->limit(200)->get(['id', 'name', 'code']);
        foreach ($list as $w) {
            $name = mb_strtolower($w->name);
            if ($name && str_contains($lower, $name)) {
                return (string) $w->id;
            }
        }

        return null;
    }

    protected function detectAccount(string $lower): ?string
    {
        $list = ChartOfAccount::query()->limit(500)->get(['id', 'name', 'code']);
        foreach ($list as $a) {
            $name = mb_strtolower($a->name);
            if ($name && (str_contains($lower, $name) || ($a->code && str_contains($lower, mb_strtolower($a->code))))) {
                return (string) $a->id;
            }
        }

        return null;
    }

    protected function detectGroupBy(string $lower, string $category): ?string
    {
        if (str_contains($lower, 'by customer')) {
            return 'customer';
        }
        if (str_contains($lower, 'by supplier')) {
            return 'supplier';
        }
        if (str_contains($lower, 'by branch')) {
            return 'branch';
        }
        if (str_contains($lower, 'by month') || str_contains($lower, 'monthly')) {
            return 'month';
        }
        if (str_contains($lower, 'by week') || str_contains($lower, 'weekly')) {
            return 'week';
        }
        if (str_contains($lower, 'by day') || str_contains($lower, 'daily')) {
            return 'day';
        }

        return null;
    }

    protected function buildOpenUrl(string $routePath, array $filters): string
    {
        if (empty($filters)) {
            return $routePath;
        }

        return $routePath.'?'.http_build_query($filters);
    }

    protected function miss(string $message, array $suggestions = []): array
    {
        return [
            'matched' => false,
            'confidence' => 0,
            'message' => $message,
            'suggestions' => $suggestions,
        ];
    }
}
