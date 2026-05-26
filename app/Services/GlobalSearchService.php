<?php

namespace App\Services;

use App\Models\Branch;
use App\Models\FiscalYear;
use App\Services\Search\GlobalSearchRegistry;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

class GlobalSearchService
{
    private array $columnCache = [];

    public function __construct(
        private readonly GlobalSearchRegistry $registry,
        private readonly AppContextService $contextService,
        private readonly BranchScopeService $branchScope,
    ) {
    }

    public function search(Request $request, array $filters): array
    {
        $user = $request->user();
        abort_unless($user, 401);

        $query = trim((string) ($filters['q'] ?? ''));
        $limit = min(max((int) ($filters['limit'] ?? 5), 1), 5);
        $modules = array_values(array_unique($filters['modules'] ?? []));
        $context = $this->searchContext($request, $filters);
        $groups = [];
        $total = 0;

        foreach ($this->groupPlan($filters) as $key => $plan) {
            $items = $plan['method']($query, [
                ...$filters,
                'limit' => $limit,
                'modules' => $modules,
                'context' => $context,
            ]);

            if ($items === []) {
                $groups[] = ['key' => $key, 'label' => $plan['label'], 'items' => []];
                continue;
            }

            $remaining = max(50 - $total, 0);
            $items = array_slice($items, 0, $remaining);
            $total += count($items);

            $groups[] = ['key' => $key, 'label' => $plan['label'], 'items' => $items];

            if ($total >= 50) {
                break;
            }
        }

        $existingKeys = collect($groups)->pluck('key')->all();

        foreach ([
            'pages' => 'Pages',
            'records' => 'Records',
            'settings' => 'Settings',
            'reports' => 'Reports',
            'actions' => 'Actions',
        ] as $key => $label) {
            if (!in_array($key, $existingKeys, true) && ($filters['include_' . $key] ?? true)) {
                $groups[] = ['key' => $key, 'label' => $label, 'items' => []];
            }
        }

        return [
            'query' => $query,
            'total' => $total,
            'context' => [
                'branch_id' => $context['branch_id'],
                'fiscal_year_id' => $context['fiscal_year_id'],
            ],
            'groups' => $groups,
        ];
    }

    public function searchPages(string $query, array $filters): array
    {
        return $this->searchStatic($this->registry->pages(), $query, $filters, 'page', 'Pages', true);
    }

    public function searchSettings(string $query, array $filters): array
    {
        return $this->searchStatic($this->registry->settings(), $query, $filters, 'setting', 'Settings');
    }

    public function searchReports(string $query, array $filters): array
    {
        return $this->searchStatic($this->registry->reports(), $query, $filters, 'report', 'Reports', true);
    }

    public function searchActions(string $query, array $filters): array
    {
        return $this->searchStatic($this->registry->actions(), $query, $filters, 'action', 'Actions', true);
    }

    public function searchRecords(string $query, array $filters): array
    {
        $items = [];

        foreach ($this->registry->records() as $definition) {
            if (!$this->moduleAllowed($definition, $filters) || !$this->canAccess($filters['context']['user'], $definition['permissions'] ?? [])) {
                continue;
            }

            try {
                array_push($items, ...$this->searchRecordDefinition($definition, $query, $filters));
            } catch (\Throwable $e) {
                if (config('app.debug')) {
                    Log::debug('Global search definition skipped.', [
                        'type' => $definition['type'] ?? null,
                        'model' => $definition['model'] ?? null,
                        'message' => $e->getMessage(),
                    ]);
                }
            }

            if (count($items) >= 50) {
                break;
            }
        }

        return array_slice($items, 0, 50);
    }

    private function groupPlan(array $filters): array
    {
        return array_filter([
            'pages' => [
                'label' => 'Pages',
                'method' => fn (string $query, array $searchFilters) => $this->searchPages($query, $searchFilters),
                'enabled' => $filters['include_pages'] ?? true,
            ],
            'records' => [
                'label' => 'Records',
                'method' => fn (string $query, array $searchFilters) => $this->searchRecords($query, $searchFilters),
                'enabled' => $filters['include_records'] ?? true,
            ],
            'settings' => [
                'label' => 'Settings',
                'method' => fn (string $query, array $searchFilters) => $this->searchSettings($query, $searchFilters),
                'enabled' => $filters['include_settings'] ?? true,
            ],
            'reports' => [
                'label' => 'Reports',
                'method' => fn (string $query, array $searchFilters) => $this->searchReports($query, $searchFilters),
                'enabled' => $filters['include_reports'] ?? true,
            ],
            'actions' => [
                'label' => 'Actions',
                'method' => fn (string $query, array $searchFilters) => $this->searchActions($query, $searchFilters),
                'enabled' => $filters['include_actions'] ?? true,
            ],
        ], fn (array $plan) => (bool) $plan['enabled']);
    }

    private function searchStatic(array $definitions, string $query, array $filters, string $kind, string $defaultModule, bool $withContext = false): array
    {
        $needle = Str::lower($query);

        return collect($definitions)
            ->filter(fn (array $item) => $this->moduleAllowed($item, $filters))
            ->filter(fn (array $item) => $this->canAccess($filters['context']['user'], array_filter([$item['permission'] ?? null])))
            ->filter(function (array $item) use ($needle) {
                $haystack = Str::lower(implode(' ', [
                    $item['title'] ?? '',
                    $item['subtitle'] ?? '',
                    $item['module'] ?? '',
                    implode(' ', $item['keywords'] ?? []),
                ]));

                return Str::contains($haystack, $needle);
            })
            ->take(10)
            ->map(fn (array $item) => [
                'kind' => $kind,
                'module' => $item['module'] ?? $defaultModule,
                'type' => $kind,
                'title' => $item['title'],
                'subtitle' => $item['subtitle'] ?? ($kind === 'action' ? 'Action' : $item['module'] ?? $defaultModule),
                'url' => $this->appendContextToUrl($item['url'], $filters['context'], $withContext),
                'status' => null,
                'date' => null,
                'branch' => null,
                'fiscal_year' => null,
                'icon' => $item['icon'] ?? null,
                'matched_by' => 'title',
                'permission' => $item['permission'] ?? null,
            ])
            ->values()
            ->all();
    }

    private function searchRecordDefinition(array $definition, string $term, array $filters): array
    {
        $modelClass = $definition['model'] ?? null;

        if (!$modelClass || !class_exists($modelClass)) {
            return [];
        }

        /** @var Model $model */
        $model = new $modelClass();
        $table = $model->getTable();

        if (!Schema::hasTable($table)) {
            return [];
        }

        $query = $modelClass::query();
        $this->applyEagerLoads($query, $model, $definition);
        $this->applyRecordBranchScope($query, $table, $definition, $filters['context']);
        $this->applyRecordFiscalYearScope($query, $table, $definition, $filters['context']);
        $this->applyRecordDateScope($query, $table, $definition, $filters);
        $this->applySearchConditions($query, $model, $term, $definition['search'] ?? []);
        $this->applyPriorityOrdering($query, $table, $term, $definition);

        return $query
            ->limit((int) ($filters['limit'] ?? 5))
            ->get()
            ->map(fn (Model $record) => $this->mapRecordResult($record, $definition, $filters['context'], $term))
            ->filter()
            ->values()
            ->all();
    }

    private function applyEagerLoads(Builder $query, Model $model, array $definition): void
    {
        $relations = collect($definition['with'] ?? [])
            ->filter(function (string $relation) use ($model) {
                $root = explode('.', $relation)[0];
                return method_exists($model, $root);
            })
            ->values()
            ->all();

        if ($relations !== []) {
            $query->with($relations);
        }
    }

    private function applyRecordBranchScope(Builder $query, string $table, array $definition, array $context): void
    {
        if (($definition['branch_aware'] ?? true) === false || !$this->hasColumn($table, 'branch_id')) {
            return;
        }

        $user = $context['user'] ?? null;
        $canViewAll = $this->branchScope->canViewAllBranches($user);

        // Above-branch users with explicit "all" selected get no filter.
        if ($canViewAll && ($context['branch_id'] ?? null) === 'all') {
            return;
        }

        // Above-branch users with a specific branch selected scope to it.
        if ($canViewAll && !empty($context['branch_id'])) {
            $query->where("{$table}.branch_id", $context['branch_id']);
            return;
        }

        // Branch-limited users are confined to their accessible set
        // regardless of what they pass in context.
        $accessible = $this->branchScope->accessibleBranchIds($user);

        if (empty($accessible)) {
            $query->whereRaw('1 = 0');
            return;
        }

        // If they have an explicit selection within their accessible set, honor it.
        if (!empty($context['branch_id'])
            && $context['branch_id'] !== 'all'
            && in_array((string) $context['branch_id'], $accessible, true)
        ) {
            $query->where("{$table}.branch_id", (string) $context['branch_id']);
            return;
        }

        $query->whereIn("{$table}.branch_id", $accessible);
    }

    private function applyRecordFiscalYearScope(Builder $query, string $table, array $definition, array $context): void
    {
        if (($definition['fiscal_year_aware'] ?? false) === false || empty($context['fiscal_year'])) {
            return;
        }

        $fiscalYear = $context['fiscal_year'];

        if ($this->hasColumn($table, 'fiscal_year_id')) {
            $query->where("{$table}.fiscal_year_id", $fiscalYear->id);
            return;
        }

        $dateColumn = $definition['business_date_column'] ?? null;

        if ($dateColumn && $this->hasColumn($table, $dateColumn)) {
            $query->whereDate("{$table}.{$dateColumn}", '>=', $fiscalYear->start_date)
                ->whereDate("{$table}.{$dateColumn}", '<=', $fiscalYear->end_date);
        }
    }

    private function applyRecordDateScope(Builder $query, string $table, array $definition, array $filters): void
    {
        $scope = $filters['date_scope'] ?? null;
        $from = $filters['date_from'] ?? null;
        $to = $filters['date_to'] ?? null;

        if (!$scope || (!$from && !$to)) {
            return;
        }

        $column = match ($scope) {
            'created_at', 'updated_at' => $scope,
            'business_date' => $definition['business_date_column'] ?? null,
            default => null,
        };

        if (!$column || !$this->hasColumn($table, $column)) {
            return;
        }

        if ($from) {
            $query->whereDate("{$table}.{$column}", '>=', $from);
        }

        if ($to) {
            $query->whereDate("{$table}.{$column}", '<=', $to);
        }
    }

    private function applySearchConditions(Builder $query, Model $model, string $term, array $fields): void
    {
        $needle = '%' . str_replace(' ', '%', trim($term)) . '%';
        $table = $model->getTable();

        $query->where(function (Builder $builder) use ($model, $table, $needle, $fields) {
            foreach ($fields as $field) {
                if (Str::contains($field, '.')) {
                    $segments = explode('.', $field);
                    $column = array_pop($segments);
                    $relation = implode('.', $segments);
                    $root = $segments[0] ?? null;

                    if ($root && method_exists($model, $root)) {
                        $builder->orWhereHas($relation, fn (Builder $relationQuery) => $relationQuery->where($column, 'like', $needle));
                    }

                    continue;
                }

                if ($this->hasColumn($table, $field)) {
                    $builder->orWhere("{$table}.{$field}", 'like', $needle);
                }
            }
        });
    }

    private function applyPriorityOrdering(Builder $query, string $table, string $term, array $definition): void
    {
        $normalized = Str::lower($term);

        foreach (array_unique($definition['priority'] ?? []) as $field) {
            if (Str::contains($field, '.') || !$this->hasColumn($table, $field)) {
                continue;
            }

            $query->orderByRaw(
                "case when lower({$table}.{$field}) = ? then 0 when lower({$table}.{$field}) like ? then 1 when lower({$table}.{$field}) like ? then 2 else 3 end",
                [$normalized, $normalized . '%', '%' . $normalized . '%']
            );
        }

        if ($this->hasColumn($table, 'created_at')) {
            $query->orderByDesc("{$table}.created_at");
        }
    }

    private function mapRecordResult(Model $record, array $definition, array $context, string $term): ?array
    {
        $title = trim((string) $this->fieldValue($record, $definition['title_field'] ?? 'id'));

        if ($title === '') {
            $title = (string) $record->getKey();
        }

        return [
            'kind' => 'record',
            'module' => $definition['module'],
            'type' => $definition['type'],
            'title' => $title,
            'subtitle' => $this->subtitle($record, $definition),
            'url' => $this->replaceUrlTokens($definition['url'], $record),
            'status' => $this->fieldValue($record, $definition['status_field'] ?? null),
            'date' => $this->dateValue($record, $definition['date_field'] ?? null),
            'branch' => $this->branchName($record),
            'fiscal_year' => $this->fiscalYearName($record, $context),
            'icon' => $definition['icon'] ?? null,
            'matched_by' => $this->matchedBy($record, $definition, $term),
            'permission' => $definition['permissions'][0] ?? null,
        ];
    }

    private function subtitle(Model $record, array $definition): string
    {
        $parts = [];

        foreach ($definition['subtitle_fields'] ?? [] as $field) {
            $value = $this->fieldValue($record, $field);

            if ($value === null || $value === '') {
                continue;
            }

            if (($definition['amount_field'] ?? null) === $field || Str::contains((string) $field, 'amount') || in_array($field, ['total', 'grand_total'], true)) {
                $value = 'Rs. ' . number_format((float) $value, 2);
            }

            $parts[] = Str::limit((string) $value, 70);
        }

        return implode(' - ', array_unique($parts));
    }

    private function searchContext(Request $request, array $filters): array
    {
        $appContext = $this->contextService->context($request);
        $user = $request->user();

        $requestedBranch = $filters['branch_id'] ?? null;

        if (in_array($requestedBranch, ['all', '*'], true)) {
            abort_unless($this->branchScope->canViewAllBranches($user), 403, 'You do not have access to all branches.');
            $branchId = 'all';
        } elseif (!empty($requestedBranch)) {
            $this->branchScope->assertCanAccessBranch($user, (string) $requestedBranch);
            $branchId = (string) $requestedBranch;
        } else {
            // No per-search override — use the saved app context as the source of truth.
            $branchId = $appContext['all_branches'] ?? false ? 'all' : ($appContext['current_branch_id'] ?? null);
        }

        $fiscalYearId = $filters['fiscal_year_id'] ?? $appContext['current_fiscal_year_id'] ?? null;
        $fiscalYear = $fiscalYearId ? FiscalYear::query()->whereKey($fiscalYearId)->where('active', true)->first() : null;

        return [
            'user' => $user,
            'branch_id' => $branchId,
            'fiscal_year_id' => $fiscalYear?->id,
            'fiscal_year' => $fiscalYear,
            'accessible_branch_ids' => $this->branchScope->accessibleBranchIds($user),
        ];
    }

    private function moduleAllowed(array $definition, array $filters): bool
    {
        $modules = $filters['modules'] ?? [];

        return $modules === [] || in_array($definition['module_key'] ?? null, $modules, true);
    }

    private function canAccess($user, array $permissions): bool
    {
        $permissions = array_values(array_filter($permissions));

        if ($permissions === []) {
            return true;
        }

        if (Schema::hasTable('permissions')) {
            $knownPermissions = \Spatie\Permission\Models\Permission::query()
                ->whereIn('name', $permissions)
                ->pluck('name')
                ->all();

            if ($knownPermissions === []) {
                return true;
            }

            $permissions = $knownPermissions;
        }

        foreach ($permissions as $permission) {
            try {
                if (method_exists($user, 'can') && $user->can($permission)) {
                    return true;
                }
            } catch (\Throwable) {
                //
            }
        }

        return false;
    }

    private function appendContextToUrl(string $url, array $context, bool $append): string
    {
        if (!$append) {
            return $url;
        }

        $params = [];

        if (!empty($context['branch_id'])) {
            $params['branch_id'] = $context['branch_id'];
        }

        if (!empty($context['fiscal_year_id'])) {
            $params['fiscal_year_id'] = $context['fiscal_year_id'];
        }

        if ($params === []) {
            return $url;
        }

        return $url . (Str::contains($url, '?') ? '&' : '?') . http_build_query($params);
    }

    private function replaceUrlTokens(string $url, Model $record): string
    {
        return preg_replace_callback('/\{([^}]+)\}/', fn ($match) => (string) $this->fieldValue($record, $match[1]), $url) ?: $url;
    }

    private function fieldValue(Model $record, ?string $field): mixed
    {
        if (!$field) {
            return null;
        }

        if (!Str::contains($field, '.')) {
            return $record->{$field};
        }

        $value = $record;

        foreach (explode('.', $field) as $segment) {
            if ($value instanceof Model) {
                $value = $value->getRelationValue($segment) ?? $value->{$segment} ?? null;
                continue;
            }

            $value = is_object($value) ? ($value->{$segment} ?? null) : null;
        }

        return $value instanceof Model ? ($value->name ?? $value->getKey()) : $value;
    }

    private function dateValue(Model $record, ?string $field): ?string
    {
        $value = $this->fieldValue($record, $field);

        if (!$value) {
            return null;
        }

        try {
            return \Illuminate\Support\Carbon::parse($value)->toDateString();
        } catch (\Throwable) {
            return (string) $value;
        }
    }

    private function branchName(Model $record): ?string
    {
        $branch = $record->getRelationValue('branch');

        if ($branch instanceof Branch) {
            return $branch->name;
        }

        return $record->getAttribute('branch_id')
            ? Branch::query()->whereKey($record->getAttribute('branch_id'))->value('name')
            : null;
    }

    private function fiscalYearName(Model $record, array $context): ?string
    {
        if ($record->getAttribute('fiscal_year_id')) {
            return FiscalYear::query()->whereKey($record->getAttribute('fiscal_year_id'))->value('name');
        }

        return $context['fiscal_year']?->name;
    }

    private function matchedBy(Model $record, array $definition, string $term): ?string
    {
        $needle = Str::lower($term);

        foreach ($definition['search'] ?? [] as $field) {
            $value = $this->fieldValue($record, $field);

            if ($value !== null && Str::contains(Str::lower((string) $value), $needle)) {
                return $field;
            }
        }

        return null;
    }

    private function hasColumn(string $table, string $column): bool
    {
        if (!isset($this->columnCache[$table])) {
            $this->columnCache[$table] = array_flip(Schema::getColumnListing($table));
        }

        return isset($this->columnCache[$table][$column]);
    }
}
