<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Services\DocumentNumberingService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;

abstract class BaseCrudApiController extends Controller
{
    use AuthorizesRequests;

    protected string $modelClass;

    protected array $relations = [];

    protected array $relationDetails = [];

    protected array $searchable = [];

    protected array $filterable = [];

    protected array $booleanFilters = ['active'];

    protected array $dateRangeFilters = [];

    protected array $sortable = [
        'id',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = '-created_at';

    protected int $defaultPageSize = 20;

    protected int $maxPageSize = 100;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected array $storeRules = [];

    protected array $updateRules = [];

    /**
     * IMPORTANT:
     * Default false because many master tables do NOT have branch_id.
     * Enable this only inside controllers whose table actually has branch_id.
     */
    protected bool $branchScoped = false;

    protected string $branchColumn = 'branch_id';

    protected string $branchRequestKey = 'branch_id';

    protected string $branchHeaderKey = 'X-Branch-ID';

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected ?string $branchBypassPermission = 'branches.view-all';

    protected array $branchBypassRoles = [
        'super-admin',
        'admin',
    ];

    protected array $nested = [];

    public function index(Request $request)
    {
        $this->checkAccess($request, 'index');

        $page = max((int) $request->query('page', 1), 1);

        $pageSize = (int) $request->query(
            'page_size',
            $request->query('per_page', $this->defaultPageSize)
        );

        $pageSize = min(max($pageSize, 1), $this->maxPageSize);

        $query = $this->baseQuery();

        $this->applyBranchScope($query, $request);
        $this->applySearch($query, $request);
        $this->applyFilters($query, $request);
        $this->applyOrdering($query, $request);

        $records = $query
            ->paginate($pageSize, ['*'], 'page', $page)
            ->appends($request->query());

        return response()->json([
            'count' => $records->total(),
            'next' => $records->nextPageUrl(),
            'previous' => $records->previousPageUrl(),
            'results' => $this->serializeCollection($records->getCollection()),
        ]);
    }

    public function store(Request $request)
    {
        $this->checkAccess($request, 'store');

        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->applyBranchToCreatePayload($input, $request);

        $validated = $this->validateCompat(
            $input,
            $this->rulesForStore($request)
        );

        [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

        $record = DB::transaction(function () use ($parentData, $nestedData, $deletedIds) {
            $parentData = $this->mutateParentDataBeforeCreate($parentData, $nestedData);

            $record = $this->createModel($parentData);

            $this->saveNestedCollections($record, $nestedData, $deletedIds, false);

            $record = $this->afterSave($record, $parentData, $nestedData, false);

            return $record->fresh($this->validEagerLoadRelations($record));
        });

        return response()->json(
            $this->serializeRecord($record),
            201
        );
    }

    public function show(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'show', $record);
        $this->assertRecordBranchAccess($request, $record);

        return response()->json(
            $this->serializeRecord($record->load($this->validEagerLoadRelations($record)))
        );
    }

    public function update(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);

        $validated = $this->validateCompat(
            $input,
            $this->rulesForUpdate($request, $record)
        );

        [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

        $record = DB::transaction(function () use ($record, $parentData, $nestedData, $deletedIds) {
            $parentData = $this->mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

            if (!empty($parentData)) {
                $record->update($parentData);
            }

            $this->saveNestedCollections($record, $nestedData, $deletedIds, true);

            $record = $this->afterSave($record, $parentData, $nestedData, true);

            return $record->fresh($this->validEagerLoadRelations($record));
        });

        return response()->json(
            $this->serializeRecord($record)
        );
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'destroy', $record);
        $this->assertRecordBranchAccess($request, $record);

        DB::transaction(function () use ($record) {
            foreach ($this->nested as $field => $config) {
                $relation = $config['relation'] ?? $field;

                if (method_exists($record, $relation)) {
                    $record->{$relation}()->delete();
                }
            }

            $record->delete();
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    public function bulkStore(Request $request)
    {
        $this->checkAccess($request, 'bulkStore');

        $records = $request->input('records');

        if (!is_array($records) || count($records) < 1) {
            $this->throwValidation([
                'records' => ['The records field is required and must contain at least one item.'],
            ]);
        }

        $validatedRows = [];
        $errors = [];

        foreach ($records as $index => $row) {
            if (!is_array($row)) {
                $errors["records.$index"] = ['Each record must be an object.'];
                continue;
            }

            $row = $this->prepareIncomingPayload($row);
            $row = $this->applyBranchToCreatePayload($row, $request);

            $rowRequest = $this->requestFromArray($request, $row);

            [$validated, $rowErrors] = $this->validateRow(
                $row,
                $this->rulesForStore($rowRequest)
            );

            if ($rowErrors) {
                foreach ($rowErrors as $field => $messages) {
                    $errors["records.$index.$field"] = $messages;
                }

                continue;
            }

            $validatedRows[] = $validated;
        }

        if ($errors) {
            $this->throwValidation($errors);
        }

        $created = DB::transaction(function () use ($validatedRows) {
            return collect($validatedRows)->map(function (array $validated) {
                [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

                $parentData = $this->mutateParentDataBeforeCreate($parentData, $nestedData);

                $record = $this->createModel($parentData);

                $this->saveNestedCollections($record, $nestedData, $deletedIds, false);

                $record = $this->afterSave($record, $parentData, $nestedData, false);

                return $record->fresh($this->validEagerLoadRelations($record));
            });
        });

        return response()->json([
            'count' => $created->count(),
            'results' => $this->serializeCollection($created),
        ], 201);
    }

    public function bulkUpdate(Request $request)
    {
        $records = $request->input('records', []);

        if (!is_array($records)) {
            $this->throwValidation([
                'records' => ['The records field must be an array.'],
            ]);
        }

        return $this->bulkUpdateRecords($request, $records);
    }

    public function bulkUpdateFlat(Request $request)
    {
        $records = $request->all();

        if (!is_array($records) || !$this->isListArray($records)) {
            $this->throwValidation([
                'non_field_errors' => ['Expected an array of records.'],
            ]);
        }

        return $this->bulkUpdateRecords($request, $records);
    }

    protected function bulkUpdateRecords(Request $request, array $records)
    {
        $this->checkAccess($request, 'bulkUpdate');

        if (count($records) < 1) {
            $this->throwValidation([
                'records' => ['The records field is required and must contain at least one item.'],
            ]);
        }

        $pairs = [];
        $errors = [];

        foreach ($records as $index => $row) {
            if (!is_array($row)) {
                $errors["records.$index"] = ['Each record must be an object.'];
                continue;
            }

            if (!isset($row[$this->primaryKeyName()])) {
                $errors["records.$index." . $this->primaryKeyName()] = ['The id field is required.'];
                continue;
            }

            $record = $this->findRecordOrNull($row[$this->primaryKeyName()]);

            if (!$record) {
                $errors["records.$index." . $this->primaryKeyName()] = ['Record not found.'];
                continue;
            }

            $this->checkAccess($request, 'update', $record);
            $this->assertRecordBranchAccess($request, $record);

            $row = $this->prepareIncomingPayload($row);
            $row = $this->applyBranchToUpdatePayload($row, $request, $record);

            $rowRequest = $this->requestFromArray($request, $row);

            [$validated, $rowErrors] = $this->validateRow(
                $row,
                $this->rulesForUpdate($rowRequest, $record)
            );

            if ($rowErrors) {
                foreach ($rowErrors as $field => $messages) {
                    $errors["records.$index.$field"] = $messages;
                }

                continue;
            }

            unset($validated[$this->primaryKeyName()]);

            $pairs[] = [$record, $validated];
        }

        if ($errors) {
            $this->throwValidation($errors);
        }

        $updated = DB::transaction(function () use ($pairs) {
            return collect($pairs)->map(function (array $pair) {
                [$record, $validated] = $pair;

                [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

                $parentData = $this->mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

                if (!empty($parentData)) {
                    $record->update($parentData);
                }

                $this->saveNestedCollections($record, $nestedData, $deletedIds, true);

                $record = $this->afterSave($record, $parentData, $nestedData, true);

                return $record->fresh($this->validEagerLoadRelations($record));
            });
        });

        return response()->json([
            'count' => $updated->count(),
            'results' => $this->serializeCollection($updated),
        ]);
    }

    public function bulkDestroy(Request $request)
    {
        $this->checkAccess($request, 'bulkDestroy');

        $data = $this->validateCompat($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
        ]);

        $ids = array_values(array_unique($data['ids']));

        $records = $this->newQuery()
            ->whereIn($this->primaryKeyName(), $ids)
            ->get();

        if ($records->count() !== count($ids)) {
            $this->throwValidation([
                'ids' => ['One or more records were not found.'],
            ]);
        }

        foreach ($records as $record) {
            $this->checkAccess($request, 'destroy', $record);
            $this->assertRecordBranchAccess($request, $record);
        }

        DB::transaction(function () use ($records) {
            foreach ($records as $record) {
                foreach ($this->nested as $field => $config) {
                    $relation = $config['relation'] ?? $field;

                    if (method_exists($record, $relation)) {
                        $record->{$relation}()->delete();
                    }
                }

                $record->delete();
            }
        });

        return response()->json([
            'message' => 'Deleted successfully.',
        ]);
    }

    protected function baseQuery(): Builder
    {
        return $this->newQuery()->with($this->validEagerLoadRelations());
    }

    protected function newQuery(): Builder
    {
        $class = $this->modelClass;

        return $class::query();
    }

    protected function createModel(array $data): Model
    {
        $class = $this->modelClass;

        return $class::create($data);
    }

    protected function findRecord(mixed $id): Model
    {
        return $this->newQuery()->findOrFail($id);
    }

    protected function findRecordOrNull(mixed $id): ?Model
    {
        return $this->newQuery()->find($id);
    }

    protected function rulesForStore(Request $request): array
    {
        return $this->withNestedRules(
            $this->withApprovalRules($this->storeRules($request)),
            false
        );
    }

    protected function rulesForUpdate(Request $request, Model $record): array
    {
        return $this->withNestedRules(
            $this->withApprovalRules($this->updateRules($request, $record), true),
            true
        );
    }

    protected function storeRules(Request $request): array
    {
        return $this->storeRules;
    }

    protected function updateRules(Request $request, Model $record): array
    {
        if (!empty($this->updateRules)) {
            return $this->updateRules;
        }

        return $this->makeRulesPartial($this->storeRules($request));
    }

    protected function withNestedRules(array $rules, bool $partial): array
    {
        foreach ($this->nested as $field => $config) {
            $required = (bool) ($config['required'] ?? false);
            $min = (int) ($config['min'] ?? 0);
            $deleteKey = $config['delete_key'] ?? null;

            $fieldRules = $partial
                ? ['sometimes', 'array']
                : [$required ? 'required' : 'nullable', 'array'];

            if ($min > 0) {
                $fieldRules[] = "min:$min";
            }

            $rules[$field] = $fieldRules;

            $childRules = $partial
                ? ($config['update_rules'] ?? $config['rules'] ?? [])
                : ($config['rules'] ?? []);

            $childModel = $config['model'] ?? null;

            if ($childModel) {
                $childTable = $this->tableName($childModel);
                $childKey = $this->primaryKeyName($childModel);

                $rules["$field.*.$childKey"] = $config['id_rules'] ?? [
                    'nullable',
                    "exists:$childTable,$childKey",
                ];
            }

            foreach ($childRules as $childField => $childFieldRules) {
                $rules["$field.*.$childField"] = $childFieldRules;
            }

            if ($deleteKey && $childModel) {
                $childTable = $this->tableName($childModel);
                $childKey = $this->primaryKeyName($childModel);

                $rules[$deleteKey] = ['nullable', 'array'];
                $rules["$deleteKey.*"] = [
                    "exists:$childTable,$childKey",
                ];
            }
        }

        return $rules;
    }

    protected function applySearch(Builder $query, Request $request): void
    {
        $search = $this->requestParam($request, 'search');

        if ($search === null || $search === '') {
            $search = $this->requestParam($request, 'q');
        }

        $search = trim((string) $search);

        if ($search === '' || empty($this->searchable)) {
            return;
        }

        $model = $this->newModelInstance();

        $query->where(function (Builder $query) use ($search, $model) {
            foreach ($this->searchable as $field) {
                if (Str::contains($field, '.')) {
                    $parts = explode('.', $field);
                    $column = array_pop($parts);
                    $relationPath = implode('.', $parts);
                    $rootRelation = explode('.', $relationPath)[0];

                    if (!method_exists($model, $rootRelation)) {
                        continue;
                    }

                    $query->orWhereHas($relationPath, function (Builder $q) use ($column, $search) {
                        $q->where($column, 'like', "%{$search}%");
                    });
                } else {
                    if (!$this->tableHasColumn($field)) {
                        continue;
                    }

                    $query->orWhere($this->qualifiedColumn($field), 'like', "%{$search}%");
                }
            }
        });
    }

    protected function applyFilters(Builder $query, Request $request): void
    {
        foreach ($this->filterable as $field) {
            if (!$this->tableHasColumn($field)) {
                continue;
            }

            $value = $this->requestParam($request, $field);

            if ($value !== null && $value !== '') {
                $query->where($this->qualifiedColumn($field), $value);
            }
        }

        foreach ($this->booleanFilters as $field) {
            if (!$this->tableHasColumn($field)) {
                continue;
            }

            $value = $this->requestParam($request, $field);

            if ($value === null || $value === '') {
                continue;
            }

            $bool = $this->toBool($value);

            if ($bool !== null) {
                $query->where($this->qualifiedColumn($field), $bool);
            }
        }

        foreach ($this->dateRangeFilters as $column => $config) {
            $fromKey = is_array($config)
                ? ($config['from'] ?? "{$column}_from")
                : "{$config}_from";

            $toKey = is_array($config)
                ? ($config['to'] ?? "{$column}_to")
                : "{$config}_to";

            $actualColumn = is_array($config) ? $column : $config;

            if (!$this->tableHasColumn($actualColumn)) {
                continue;
            }

            $from = $this->requestParam($request, $fromKey);
            $to = $this->requestParam($request, $toKey);

            if ($from) {
                $query->whereDate($this->qualifiedColumn($actualColumn), '>=', $from);
            }

            if ($to) {
                $query->whereDate($this->qualifiedColumn($actualColumn), '<=', $to);
            }
        }
    }

    protected function applyOrdering(Builder $query, Request $request): void
    {
        $applied = false;

        $ordering = $request->query(
            'ordering',
            $request->query('sort', $this->defaultSort)
        );

        if ($ordering) {
            foreach (explode(',', (string) $ordering) as $rawField) {
                $rawField = trim($rawField);

                if ($rawField === '') {
                    continue;
                }

                $direction = str_starts_with($rawField, '-') ? 'desc' : 'asc';
                $field = ltrim($rawField, '-');

                $column = $this->resolveSortColumn($field);

                if ($column) {
                    $query->orderBy($column, $direction);
                    $applied = true;
                }
            }
        }

        if (!$applied) {
            $sortBy = $request->query('sort_by');

            $sortOrder = strtolower((string) $request->query('sort_order', 'asc')) === 'desc'
                ? 'desc'
                : 'asc';

            $column = $this->resolveSortColumn($sortBy);

            if ($column) {
                $query->orderBy($column, $sortOrder);
                $applied = true;
            }
        }

        if (!$applied && $this->tableHasColumn('created_at')) {
            $query->orderBy($this->qualifiedColumn('created_at'), 'desc');
            $applied = true;
        }

        if (!$applied && $this->tableHasColumn($this->primaryKeyName())) {
            $query->orderBy($this->qualifiedColumn($this->primaryKeyName()), 'desc');
        }
    }

    protected function resolveSortColumn(?string $field): ?string
    {
        if (!$field) {
            return null;
        }

        if (array_key_exists($field, $this->sortable)) {
            $column = $this->sortable[$field];

            if (Str::contains($column, '.')) {
                return $column;
            }

            return $this->tableHasColumn($column)
                ? $this->qualifiedColumn($column)
                : null;
        }

        if (in_array($field, $this->sortable, true)) {
            return $this->tableHasColumn($field)
                ? $this->qualifiedColumn($field)
                : null;
        }

        return null;
    }

    protected function applyBranchScope(Builder $query, Request $request): void
    {
        if (!$this->usesBranchScope()) {
            return;
        }

        if ($this->userCanAccessAllBranches($request)) {
            $requestedBranchId = $this->requestedBranchId($request);

            if ($requestedBranchId) {
                $query->where($this->qualifiedColumn($this->branchColumn), $requestedBranchId);
            }

            return;
        }

        $allowedBranchIds = $this->accessibleBranchIds($request);

        if (empty($allowedBranchIds)) {
            $query->whereRaw('1 = 0');
            return;
        }

        $requestedBranchId = $this->requestedBranchId($request);

        if ($requestedBranchId) {
            if (!in_array((string) $requestedBranchId, $allowedBranchIds, true)) {
                abort(403, 'You do not have access to this branch.');
            }

            $query->where($this->qualifiedColumn($this->branchColumn), $requestedBranchId);
            return;
        }

        $query->whereIn($this->qualifiedColumn($this->branchColumn), $allowedBranchIds);
    }

    protected function applyBranchToCreatePayload(array $data, Request $request): array
    {
        if (!$this->usesBranchScope()) {
            return $data;
        }

        $providedBranchId = $data[$this->branchColumn] ?? null;

        if (!empty($providedBranchId)) {
            $this->assertBranchIdAllowed($request, $providedBranchId);
            $data[$this->branchColumn] = (string) $providedBranchId;

            return $data;
        }

        if ($this->autoFillBranchOnCreate) {
            $defaultBranchId = $this->defaultWriteBranchId($request, true);

            if ($defaultBranchId) {
                $this->assertBranchIdAllowed($request, $defaultBranchId);
                $data[$this->branchColumn] = (string) $defaultBranchId;
            }
        }

        return $data;
    }

    protected function applyBranchToUpdatePayload(array $data, Request $request, Model $record): array
    {
        if (!$this->usesBranchScope()) {
            return $data;
        }

        $this->assertRecordBranchAccess($request, $record);

        if ($this->preventBranchChangeOnUpdate && array_key_exists($this->branchColumn, $data)) {
            unset($data[$this->branchColumn]);
        }

        if (!$this->preventBranchChangeOnUpdate && !empty($data[$this->branchColumn])) {
            $this->assertBranchIdAllowed($request, $data[$this->branchColumn]);
        }

        return $data;
    }

    protected function assertRecordBranchAccess(Request $request, Model $record): void
    {
        if (!$this->usesBranchScope()) {
            return;
        }

        if ($this->userCanAccessAllBranches($request)) {
            return;
        }

        $branchId = $record->{$this->branchColumn} ?? null;

        if (!$branchId) {
            return;
        }

        $this->assertBranchIdAllowed($request, $branchId);
    }

    protected function assertBranchIdAllowed(Request $request, mixed $branchId): void
    {
        if (!$this->usesBranchScope()) {
            return;
        }

        if ($this->userCanAccessAllBranches($request)) {
            return;
        }

        if (!$branchId) {
            abort(403, 'Branch is required.');
        }

        $allowedBranchIds = $this->accessibleBranchIds($request);

        if (!in_array((string) $branchId, $allowedBranchIds, true)) {
            abort(403, 'You do not have access to this branch.');
        }
    }

    protected function requestedBranchId(Request $request): ?string
    {
        $branchId = $request->query($this->branchRequestKey);

        if (!$branchId) {
            $branchId = $request->header($this->branchHeaderKey);
        }

        if (!$branchId) {
            $branchId = $request->input($this->branchRequestKey);
        }

        return $branchId ? (string) $branchId : null;
    }

    protected function defaultWriteBranchId(Request $request, bool $allowRequestedBranch = true): ?string
    {
        $requested = $allowRequestedBranch ? $this->requestedBranchId($request) : null;

        if ($requested) {
            return (string) $requested;
        }

        $user = $request->user();

        if ($user) {
            if (!empty($user->current_branch_id)) {
                return (string) $user->current_branch_id;
            }

            if (!empty($user->branch_id)) {
                return (string) $user->branch_id;
            }

            $branchIds = $this->accessibleBranchIds($request);

            if (count($branchIds) === 1) {
                return $branchIds[0];
            }
        }

        return Branch::query()->where('code', 'MAIN')->value('id')
            ?: Branch::query()->value('id');
    }

    protected function accessibleBranchIds(Request $request): array
    {
        $user = $request->user();

        $ids = [];

        if ($user) {
            if (!empty($user->current_branch_id)) {
                $ids[] = (string) $user->current_branch_id;
            }

            if (!empty($user->branch_id)) {
                $ids[] = (string) $user->branch_id;
            }

            if (!empty($user->branch_ids) && is_array($user->branch_ids)) {
                foreach ($user->branch_ids as $id) {
                    if ($id) {
                        $ids[] = (string) $id;
                    }
                }
            }

            try {
                if (method_exists($user, 'branches')) {
                    $relationIds = $user->branches()->pluck('branches.id')->toArray();

                    foreach ($relationIds as $id) {
                        if ($id) {
                            $ids[] = (string) $id;
                        }
                    }
                }
            } catch (\Throwable $e) {
                //
            }
        }

        $ids = array_values(array_unique(array_filter($ids)));

        if (!empty($ids)) {
            return $ids;
        }

        $fallbackBranchId = Branch::query()->where('code', 'MAIN')->value('id')
            ?: Branch::query()->value('id');

        return $fallbackBranchId ? [(string) $fallbackBranchId] : [];
    }

    protected function userCanAccessAllBranches(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        if ($this->branchBypassPermission && method_exists($user, 'can')) {
            try {
                if ($user->can($this->branchBypassPermission)) {
                    return true;
                }
            } catch (\Throwable $e) {
                //
            }
        }

        if (method_exists($user, 'hasRole')) {
            foreach ($this->branchBypassRoles as $role) {
                try {
                    if ($user->hasRole($role)) {
                        return true;
                    }
                } catch (\Throwable $e) {
                    //
                }
            }
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        return false;
    }

    protected function prepareIncomingPayload(array $data): array
    {
        $data = $this->prepareForWrite($data, $this->relationDetails);

        foreach ($this->nested as $field => $config) {
            if (!isset($data[$field]) || !is_array($data[$field])) {
                continue;
            }

            $childRelationDetails = $config['relation_details'] ?? [];

            $data[$field] = collect($data[$field])
                ->filter(fn ($row) => is_array($row))
                ->map(fn ($row) => $this->prepareForWrite($row, $childRelationDetails))
                ->values()
                ->all();
        }

        return $data;
    }

    protected function prepareForWrite(array $data, array $relationDetails = []): array
    {
        foreach ($data as $key => $value) {
            if ($value === '') {
                $data[$key] = null;
            }

            if (Str::endsWith($key, '_detail')) {
                unset($data[$key]);
            }
        }

        foreach ($relationDetails as $relation => $foreignKey) {
            unset($data[$relation]);
            unset($data[Str::snake($relation)]);

            if (isset($data[$foreignKey]) && is_array($data[$foreignKey])) {
                $data[$foreignKey] = $data[$foreignKey]['id']
                    ?? $data[$foreignKey]['value']
                    ?? null;
            }
        }

        unset(
            $data['created_at'],
            $data['updated_at'],
            $data['deleted_at']
        );

        return $data;
    }

    protected function splitPayload(array $validated): array
    {
        $parentData = $validated;
        $nestedData = [];
        $deletedIds = [];

        foreach ($this->nested as $field => $config) {
            $deleteKey = $config['delete_key'] ?? null;

            if (array_key_exists($field, $parentData)) {
                $nestedData[$field] = $parentData[$field];
                unset($parentData[$field]);
            }

            if ($deleteKey && array_key_exists($deleteKey, $parentData)) {
                $deletedIds[$field] = $parentData[$deleteKey];
                unset($parentData[$deleteKey]);
            }
        }

        return [$parentData, $nestedData, $deletedIds];
    }

    protected function saveNestedCollections(
        Model $parent,
        array $nestedData,
        array $deletedIds,
        bool $isUpdate
    ): void {
        foreach ($this->nested as $field => $config) {
            if (empty($config['model']) || empty($config['foreign_key'])) {
                continue;
            }

            $relation = $config['relation'] ?? $field;
            $childModel = $config['model'];
            $foreignKey = $config['foreign_key'];
            $replaceOnUpdate = (bool) ($config['replace_on_update'] ?? false);
            $childRelationDetails = $config['relation_details'] ?? [];

            $hasRows = array_key_exists($field, $nestedData);
            $rows = $nestedData[$field] ?? [];

            if ($isUpdate && !empty($deletedIds[$field])) {
                $childModel::query()
                    ->where($foreignKey, $parent->getKey())
                    ->whereIn($this->primaryKeyName($childModel), $deletedIds[$field])
                    ->delete();
            }

            if (!$hasRows) {
                continue;
            }

            $incomingIds = [];

            foreach ($rows as $row) {
                $row = $this->prepareForWrite($row, $childRelationDetails);

                if (!empty($row['_destroy']) && !empty($row[$this->primaryKeyName($childModel)])) {
                    $childModel::query()
                        ->where($foreignKey, $parent->getKey())
                        ->where($this->primaryKeyName($childModel), $row[$this->primaryKeyName($childModel)])
                        ->delete();

                    continue;
                }

                $saved = $this->saveNestedRow($parent, $row, $config, $isUpdate);

                if ($saved && $saved->getKey()) {
                    $incomingIds[] = $saved->getKey();
                }
            }

            if ($isUpdate && $replaceOnUpdate) {
                $childModel::query()
                    ->where($foreignKey, $parent->getKey())
                    ->when(count($incomingIds) > 0, function (Builder $query) use ($incomingIds, $childModel) {
                        $query->whereNotIn($this->primaryKeyName($childModel), $incomingIds);
                    })
                    ->delete();
            }

            $this->enforceNestedMinimum($parent, $config);
            $this->updateParentTotalsFromNested($parent, $config);
        }
    }

    protected function saveNestedRow(
        Model $parent,
        array $row,
        array $config,
        bool $isUpdate
    ): ?Model {
        $relation = $config['relation'] ?? null;
        $childModel = $config['model'];
        $foreignKey = $config['foreign_key'];
        $childKey = $this->primaryKeyName($childModel);

        $row = $this->mutateNestedRowBeforeSave($row, $parent, $config, $isUpdate);

        $id = $row[$childKey] ?? null;

        unset(
            $row[$childKey],
            $row['_destroy'],
            $row['created_at'],
            $row['updated_at'],
            $row['deleted_at']
        );

        $row[$foreignKey] = $parent->getKey();

        if ($isUpdate && $id) {
            $child = $childModel::query()
                ->where($foreignKey, $parent->getKey())
                ->where($childKey, $id)
                ->first();

            if (!$child) {
                $this->throwValidation([
                    $relation ?: 'items' => ['One or more child record IDs do not belong to this parent.'],
                ]);
            }

            $child->update($row);

            return $child->fresh($this->validRelationsForModel($child, $config['relations'] ?? []));
        }

        if ($relation && method_exists($parent, $relation)) {
            return $parent->{$relation}()->create($row);
        }

        return $childModel::create($row);
    }

    protected function enforceNestedMinimum(Model $parent, array $config): void
    {
        $min = (int) ($config['min'] ?? 0);
        $relation = $config['relation'] ?? null;

        if (!$relation || $min < 1 || !method_exists($parent, $relation)) {
            return;
        }

        $count = $parent->{$relation}()->count();

        if ($count < $min) {
            $this->throwValidation([
                $relation => ["At least {$min} item(s) are required."],
            ]);
        }
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = $this->assignDocumentNumberIfMissing($parentData);
        $parentData = $this->normalizeApprovalData($parentData);

        foreach ($this->nested as $field => $config) {
            if (
                isset($config['parent_total_field'], $config['child_total_field'])
                && isset($nestedData[$field])
                && is_array($nestedData[$field])
            ) {
                $parentData[$config['parent_total_field']] = collect($nestedData[$field])
                    ->sum(fn ($row) => (float) ($row[$config['child_total_field']] ?? 0));
            }
        }

        return $parentData;
    }

    protected function assignDocumentNumberIfMissing(array $parentData): array
    {
        try {
            $model = $this->newModelInstance();
            $mapping = app(DocumentNumberingService::class)->getMappingForModel($model);

            if (!$mapping) {
                return $parentData;
            }

            $field = $mapping['field'] ?? null;
            $documentType = $mapping['document_type'] ?? null;

            if (!$field || !$documentType || !empty($parentData[$field])) {
                return $parentData;
            }

            $parentData[$field] = app(DocumentNumberingService::class)->generate($documentType);
        } catch (\Throwable $e) {
            //
        }

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        return $this->normalizeApprovalData($parentData, $record);
    }

    protected function withApprovalRules(array $rules, bool $partial = false): array
    {
        $prefix = $partial ? ['sometimes', 'nullable'] : ['nullable'];

        if ($this->tableHasColumn('approved') && !array_key_exists('approved', $rules)) {
            $rules['approved'] = [...$prefix, 'boolean'];
        }

        if ($this->tableHasColumn('approved_at') && !array_key_exists('approved_at', $rules)) {
            $rules['approved_at'] = [...$prefix, 'date'];
        }

        if ($this->tableHasColumn('approved_by_id') && !array_key_exists('approved_by_id', $rules)) {
            $rules['approved_by_id'] = [...$prefix, 'integer', 'exists:users,id'];
        }

        if ($this->tableHasColumn('active') && !array_key_exists('active', $rules)) {
            $rules['active'] = [...$prefix, 'boolean'];
        }

        if ($this->tableHasColumn('void') && !array_key_exists('void', $rules)) {
            $rules['void'] = [...$prefix, 'boolean'];
        }

        return $rules;
    }

    protected function normalizeApprovalData(array $parentData, ?Model $record = null): array
    {
        if (!array_key_exists('approved', $parentData) || !$this->tableHasColumn('approved')) {
            return $parentData;
        }

        $approved = $this->toBool($parentData['approved']);
        $parentData['approved'] = (bool) $approved;

        if ($approved && $this->tableHasColumn('approved_at') && empty($parentData['approved_at']) && empty($record?->approved_at)) {
            $parentData['approved_at'] = now();
        }

        if (!$approved && $this->tableHasColumn('approved_at') && !array_key_exists('approved_at', $parentData)) {
            $parentData['approved_at'] = null;
        }

        if (!$approved && $this->tableHasColumn('approved_by_id') && !array_key_exists('approved_by_id', $parentData)) {
            $parentData['approved_by_id'] = null;
        }

        return $parentData;
    }

    protected function mutateNestedRowBeforeSave(
        array $row,
        Model $parent,
        array $config,
        bool $isUpdate
    ): array {
        return $row;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        return $record;
    }

    protected function updateParentTotalsFromNested(Model $parent, array $config): void
    {
        if (!isset($config['parent_total_field'], $config['child_total_field'])) {
            return;
        }

        $relation = $config['relation'] ?? null;

        if (!$relation || !method_exists($parent, $relation)) {
            return;
        }

        $parent->forceFill([
            $config['parent_total_field'] => $parent->{$relation}()->sum($config['child_total_field']),
        ])->save();
    }

    protected function serializeCollection($records): array
    {
        return collect($records)
            ->map(fn ($record) => $this->serializeRecord($record))
            ->values()
            ->all();
    }

    protected function serializeRecord(Model $record): array
    {
        $record->loadMissing($this->validEagerLoadRelations($record));

        $data = $record->toArray();

        $data = $this->attachRelationDetails(
            $data,
            $record,
            $this->relationDetails
        );

        foreach ($this->nested as $field => $config) {
            $relation = $config['relation'] ?? $field;

            if (!$record->relationLoaded($relation)) {
                continue;
            }

            $data[$field] = collect($record->{$relation})
                ->map(fn ($child) => $this->serializeNestedRecord($child, $config))
                ->values()
                ->all();
        }

        return $this->mutateSerializedRecord($data, $record);
    }

    protected function serializeNestedRecord(Model $child, array $config): array
    {
        $child->loadMissing($this->validRelationsForModel($child, $config['relations'] ?? []));

        $data = $child->toArray();

        $data = $this->attachRelationDetails(
            $data,
            $child,
            $config['relation_details'] ?? []
        );

        return $data;
    }

    protected function attachRelationDetails(array $data, Model $record, array $relationDetails): array
    {
        foreach ($relationDetails as $relation => $foreignKey) {
            if (!method_exists($record, $relation)) {
                continue;
            }

            $related = $record->{$relation} ?? null;

            $serialized = $this->serializeRelated($related);

            $snakeRelation = Str::snake($relation);

            $data[$relation] = $serialized;
            $data[$snakeRelation] = $serialized;
            $data["{$foreignKey}_detail"] = $serialized;
            $data["{$snakeRelation}_name"] = $serialized['label'] ?? null;
        }

        return $data;
    }

    protected function serializeRelated($model): ?array
    {
        if (!$model) {
            return null;
        }

        $data = method_exists($model, 'toArray') ? $model->toArray() : [];

        $label =
            data_get($model, 'display_name') ?:
            data_get($model, 'name') ?:
            data_get($model, 'account_name') ?:
            data_get($model, 'bank_name') ?:
            data_get($model, 'code') ?:
            data_get($model, 'title') ?:
            (string) data_get($model, 'id');

        $data['label'] = $label;
        $data['value'] = data_get($model, 'id');

        return $data;
    }

    protected function mutateSerializedRecord(array $data, Model $record): array
    {
        return $data;
    }

    protected function eagerLoadRelations(): array
    {
        $relations = $this->relations;

        foreach ($this->nested as $field => $config) {
            $relation = $config['relation'] ?? $field;

            $relations[] = $relation;

            foreach (($config['relations'] ?? []) as $childRelation) {
                $relations[] = "{$relation}.{$childRelation}";
            }
        }

        return array_values(array_unique(array_filter($relations)));
    }

    protected function validEagerLoadRelations(?Model $model = null): array
    {
        $model = $model ?: $this->newModelInstance();

        return $this->validRelationsForModel($model, $this->eagerLoadRelations());
    }

    protected function validRelationsForModel(Model $model, array $relations): array
    {
        $valid = [];

        foreach ($relations as $relation) {
            if (!$relation || !is_string($relation)) {
                continue;
            }

            $rootRelation = explode('.', $relation)[0];

            if (method_exists($model, $rootRelation)) {
                $valid[] = $relation;
            }
        }

        return array_values(array_unique($valid));
    }

    protected function checkAccess(Request $request, string $action, mixed $record = null): void
    {
        $crudPermission = match ($action) {
            'index', 'show' => 'view',
            'store', 'bulkStore' => 'create',
            'update', 'bulkUpdate' => 'update',
            'destroy', 'bulkDestroy' => 'delete',
            default => $action,
        };

        if ($this->permissionPrefix) {
            $user = $request->user();

            abort_unless(
                $user && $user->can("{$this->permissionPrefix}.{$crudPermission}"),
                403,
                'You do not have permission to perform this action.'
            );

            return;
        }

        if (!$this->usePolicyAuthorization) {
            return;
        }

        $ability = match ($action) {
            'index' => 'viewAny',
            'show' => 'view',
            'store', 'bulkStore' => 'create',
            'update', 'bulkUpdate' => 'update',
            'destroy', 'bulkDestroy' => 'delete',
            default => $action,
        };

        $target = in_array($action, ['index', 'store', 'bulkStore'], true)
            ? $this->modelClass
            : $record;

        $this->authorize($ability, $target);
    }

    protected function requestParam(Request $request, string $key, mixed $default = null): mixed
    {
        if ($request->query->has($key)) {
            return $request->query($key);
        }

        $filterValue = $request->input("filter.{$key}");

        return $filterValue !== null ? $filterValue : $default;
    }

    protected function validateCompat(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            $this->throwValidation($validator->errors()->toArray());
        }

        return $validator->validated();
    }

    protected function validateRow(array $data, array $rules): array
    {
        $validator = Validator::make($data, $rules);

        if ($validator->fails()) {
            return [[], $validator->errors()->toArray()];
        }

        return [$validator->validated(), []];
    }

    protected function throwValidation(array $errors): void
    {
        throw new HttpResponseException(
            response()->json($errors, 422)
        );
    }

    protected function makeRulesPartial(array $rules): array
    {
        $partial = [];

        foreach ($rules as $field => $fieldRules) {
            $items = is_string($fieldRules)
                ? explode('|', $fieldRules)
                : (is_array($fieldRules) ? $fieldRules : [$fieldRules]);

            $items = array_values(array_filter($items, function ($rule) {
                return !(is_string($rule) && $rule === 'required');
            }));

            if (!in_array('sometimes', $items, true)) {
                array_unshift($items, 'sometimes');
            }

            $partial[$field] = $items;
        }

        return $partial;
    }

    protected function toBool(mixed $value): ?bool
    {
        if (is_bool($value)) {
            return $value;
        }

        if ($value === 1 || $value === '1') {
            return true;
        }

        if ($value === 0 || $value === '0') {
            return false;
        }

        return filter_var($value, FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
    }

    protected function newModelInstance(?string $class = null): Model
    {
        $class = $class ?: $this->modelClass;

        return new $class();
    }

    protected function tableName(?string $class = null): string
    {
        return $this->newModelInstance($class)->getTable();
    }

    protected function primaryKeyName(?string $class = null): string
    {
        return $this->newModelInstance($class)->getKeyName();
    }

    protected function qualifiedColumn(string $column): string
    {
        if (Str::contains($column, '.')) {
            return $column;
        }

        return $this->tableName() . '.' . $column;
    }

    protected function tableHasColumn(string $column, ?string $class = null): bool
    {
        if ($column === '') {
            return false;
        }

        if (Str::contains($column, '.')) {
            $column = Str::afterLast($column, '.');
        }

        try {
            return Schema::hasColumn($this->tableName($class), $column);
        } catch (\Throwable $e) {
            return true;
        }
    }

    protected function usesBranchScope(): bool
    {
        if (!$this->branchScoped) {
            return false;
        }

        return $this->tableHasColumn($this->branchColumn);
    }

    protected function isListArray(array $array): bool
    {
        if ($array === []) {
            return true;
        }

        return array_keys($array) === range(0, count($array) - 1);
    }

    protected function requestFromArray(Request $original, array $data): Request
    {
        $request = Request::create(
            $original->url(),
            $original->method(),
            $data,
            $original->cookies->all(),
            [],
            $original->server->all()
        );

        $request->headers->replace($original->headers->all());
        $request->setUserResolver($original->getUserResolver());

        return $request;
    }
}
