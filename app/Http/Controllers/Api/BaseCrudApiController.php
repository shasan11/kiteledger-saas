<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\FiscalYear;
use App\Services\BranchScopeService;
use App\Services\DocumentNumberingService;
use App\Services\AppContextService;
use App\Services\TransactionApprovalService;
use App\Services\TransactionVoidService;
use App\Traits\ValidatesBusinessRules;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Http\Exceptions\HttpResponseException;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

abstract class BaseCrudApiController extends Controller
{
    use AuthorizesRequests;
    use ValidatesBusinessRules;

    protected string $modelClass;

    protected array $relations = [];

    protected array $relationDetails = [];

    protected array $searchable = [];

    protected array $filterable = [];

    protected array $booleanFilters = ['active'];

    protected array $dateRangeFilters = [];

    protected array $amountRangeFilters = [];

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

    protected bool $branchScoped = false;

    protected string $branchColumn = 'branch_id';

    protected string $branchRequestKey = 'branch_id';

    protected string $branchHeaderKey = 'X-Branch-ID';

    protected bool $autoFillBranchOnCreate = false;

    protected bool $preventBranchChangeOnUpdate = false;

    protected ?string $branchBypassPermission = BranchScopeService::PERMISSION_VIEW_ALL;

    protected bool $fiscalYearScoped = false;

    protected string $fiscalYearColumn = 'fiscal_year_id';

    protected ?string $businessDateColumn = null;

    protected string $fiscalYearRequestKey = 'fiscal_year_id';

    protected string $fiscalYearHeaderKey = 'X-Fiscal-Year-ID';

    protected bool $autoFillFiscalYearOnCreate = true;

    protected bool $preventFiscalYearChangeOnUpdate = true;

    protected array $nested = [];

    protected ?string $businessRuleModule = null;

    protected bool $validateBusinessRulesOnSave = false;

    protected bool $validateBusinessRulesOnEdit = false;

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
        $this->applyFiscalYearScope($query, $request);
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
        $input = $this->applyFiscalYearToCreatePayload($input, $request);

        $validated = $this->validateCompat(
            $input,
            $this->rulesForStore($request)
        );

        $validated = $this->applyBranchToCreatePayload($validated, $request);

        $this->assertFiscalYearWriteAllowed($validated, $request);

        [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

        $reportingTags = $this->extractReportingTagsInput($parentData);

        if ($this->validateBusinessRulesOnSave && $this->businessRuleModule()) {
            $result = $this->validateBusinessRulesForSave(
                $this->businessRuleModule(),
                $this->businessRulePayload($parentData, $nestedData)
            );
            $this->blockIfBusinessRuleErrors($result);
        }

        $record = DB::transaction(function () use ($parentData, $nestedData, $deletedIds, $reportingTags) {
            $parentData = $this->mutateParentDataBeforeCreate($parentData, $nestedData);

            $record = $this->createModel($parentData);

            $this->saveNestedCollections($record, $nestedData, $deletedIds, false);

            $record = $this->afterSave($record, $parentData, $nestedData, false);

            $this->syncReportingTags($record, $reportingTags);

            return $record->fresh($this->validEagerLoadRelations($record));
        });

        return $this->respondWithBusinessRuleWarnings(
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
        $this->assertTransactionEditable($record);

        $input = $this->prepareIncomingPayload($request->all());
        $input = $this->applyBranchToUpdatePayload($input, $request, $record);
        $input = $this->applyFiscalYearToUpdatePayload($input, $request, $record);

        $validated = $this->validateCompat(
            $input,
            $this->rulesForUpdate($request, $record)
        );

        $this->assertFiscalYearWriteAllowed($validated ?: $record, $request, $record);

        [$parentData, $nestedData, $deletedIds] = $this->splitPayload($validated);

        $reportingTags = $this->extractReportingTagsInput($parentData);

        if ($this->validateBusinessRulesOnEdit && $this->businessRuleModule()) {
            $result = $this->validateBusinessRulesForEdit(
                $this->businessRuleModule(),
                $this->businessRulePayload(array_merge($record->toArray(), $parentData), $nestedData, $record)
            );
            $this->blockIfBusinessRuleErrors($result);
        }

        if (($parentData['approved'] ?? null) && !(bool) ($record->approved ?? false)) {
            $result = $this->validateBusinessRulesForApproval(
                $this->businessRuleModule(),
                $this->businessRulePayload(array_merge($record->toArray(), $parentData), $nestedData, $record)
            );
            $this->blockIfBusinessRuleErrors($result);
        }

        $record = DB::transaction(function () use ($record, $parentData, $nestedData, $deletedIds, $reportingTags) {
            $parentData = $this->mutateParentDataBeforeUpdate($parentData, $nestedData, $record);

            if (!empty($parentData)) {
                $record->update($parentData);
            }

            $this->saveNestedCollections($record, $nestedData, $deletedIds, true);

            $record = $this->afterSave($record, $parentData, $nestedData, true);

            $this->syncReportingTags($record, $reportingTags);

            $this->syncAccountingImpactAfterUpdate($record);

            return $record->fresh($this->validEagerLoadRelations($record));
        });

        return $this->respondWithBusinessRuleWarnings(
            $this->serializeRecord($record)
        );
    }

    public function destroy(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'destroy', $record);
        $this->assertRecordBranchAccess($request, $record);
        $this->assertTransactionDestroyable($record);

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
            $row = $this->applyFiscalYearToCreatePayload($row, $request);

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

            $validated = $this->applyBranchToCreatePayload($validated, $rowRequest);

            $this->assertFiscalYearWriteAllowed($validated, $rowRequest);
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
            $this->assertTransactionEditable($record);

            $row = $this->prepareIncomingPayload($row);
            $row = $this->applyBranchToUpdatePayload($row, $request, $record);
            $row = $this->applyFiscalYearToUpdatePayload($row, $request, $record);

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
            $this->assertFiscalYearWriteAllowed($validated ?: $record, $rowRequest, $record);

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

    public function transactionApprove(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);
        $this->assertFiscalYearWriteAllowed($record, $request, $record);

        $businessRules = $this->validateBusinessRulesForApproval($this->businessRuleModule(), $record);
        $this->blockIfBusinessRuleErrors($businessRules);

        $approved = app(TransactionApprovalService::class)->approve(
            $record,
            $request->user()?->getAuthIdentifier()
        );

        return $this->respondWithBusinessRuleWarnings($this->serializeRecord($approved));
    }

    public function bulkApprove(Request $request)
    {
        $this->checkAccess($request, 'bulkUpdate');

        $data = $this->validateCompat($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
        ]);

        $approvedCount = 0;
        $failed = [];

        foreach (array_values(array_unique($data['ids'])) as $id) {
            try {
                $record = $this->findRecord($id);
                $this->checkAccess($request, 'update', $record);
                $this->assertRecordBranchAccess($request, $record);
                $this->assertFiscalYearWriteAllowed($record, $request, $record);
                app(TransactionApprovalService::class)->approve($record, $request->user()?->getAuthIdentifier());
                $approvedCount++;
            } catch (Throwable $e) {
                $failed[] = ['id' => $id, 'reason' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => count($failed) === 0,
            'approved_count' => $approvedCount,
            'voided_count' => 0,
            'failed' => $failed,
        ], count($failed) === 0 ? 200 : 422);
    }

    public function transactionVoid(Request $request, mixed $id)
    {
        $record = $this->findRecord($id);

        $this->checkAccess($request, 'update', $record);
        $this->assertRecordBranchAccess($request, $record);

        $data = $this->validateCompat($request->all(), [
            'voided_reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $voided = app(TransactionVoidService::class)->void(
            $record,
            $data['voided_reason'],
            $request->user()?->getAuthIdentifier()
        );

        return response()->json($this->serializeRecord($voided));
    }

    public function bulkVoid(Request $request)
    {
        $this->checkAccess($request, 'bulkUpdate');

        $data = $this->validateCompat($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
            'voided_reason' => ['required', 'string', 'min:3', 'max:500'],
        ]);

        $voidedCount = 0;
        $failed = [];

        foreach (array_values(array_unique($data['ids'])) as $id) {
            try {
                $record = $this->findRecord($id);
                $this->checkAccess($request, 'update', $record);
                $this->assertRecordBranchAccess($request, $record);
                app(TransactionVoidService::class)->void($record, $data['voided_reason'], $request->user()?->getAuthIdentifier());
                $voidedCount++;
            } catch (Throwable $e) {
                $failed[] = ['id' => $id, 'reason' => $e->getMessage()];
            }
        }

        return response()->json([
            'success' => count($failed) === 0,
            'approved_count' => 0,
            'voided_count' => $voidedCount,
            'failed' => $failed,
        ], count($failed) === 0 ? 200 : 422);
    }

    public function bulkExport(Request $request)
    {
        $this->checkAccess($request, 'index');

        $data = $this->validateCompat($request->all(), [
            'ids' => ['required', 'array', 'min:1'],
            'ids.*' => ['required'],
            'format' => ['nullable', 'string', 'in:csv'],
        ]);

        $requestedIds = array_values(array_unique($data['ids']));

        $scopedQuery = $this->newQuery()->with($this->validEagerLoadRelations());
        $this->applyBranchScope($scopedQuery, $request);

        $records = (clone $scopedQuery)
            ->whereIn($this->primaryKeyName(), $requestedIds)
            ->get();

        if ($records->count() !== count($requestedIds)) {
            // Some requested ids were outside the user's branch scope.
            abort(403, 'You do not have access to one or more of the selected records.');
        }

        $filename = Str::slug(class_basename($this->modelClass)) . '-selected-' . now()->format('YmdHis') . '.csv';

        return response()->streamDownload(function () use ($records) {
            $handle = fopen('php://output', 'w');
            $rows = $this->bulkExportRows($records);
            $headers = collect($rows)->flatMap(fn ($row) => array_keys($row))->unique()->values()->all();

            fputcsv($handle, $headers);

            foreach ($rows as $row) {
                fputcsv($handle, collect($headers)->map(fn ($key) => $this->exportValue($row[$key] ?? null))->all());
            }

            fclose($handle);
        }, $filename, ['Content-Type' => 'text/csv']);
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
        return $this->withReportingTagRules($this->withFiscalYearRules($this->withNestedRules(
            $this->withApprovalRules($this->storeRules($request)),
            false
        )));
    }

    protected function rulesForUpdate(Request $request, Model $record): array
    {
        return $this->withReportingTagRules($this->withFiscalYearRules($this->withNestedRules(
            $this->withApprovalRules($this->updateRules($request, $record), true),
            true
        ), true));
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
        if (
            $this->tableHasColumn('active')
            && $request->has('active')
            && ! in_array('active', $this->filterable, true)
            && ! in_array('active', $this->booleanFilters, true)
        ) {
            $active = $this->toBool($this->requestParam($request, 'active'));

            if ($active !== null) {
                $query->where($this->qualifiedColumn('active'), $active);
            }
        }

        foreach ($this->filterable as $field) {
            if (!$this->tableHasColumn($field)) {
                continue;
            }

            $value = $this->requestParam($request, $field);

            if ($value !== null && $value !== '') {
                $query->where($this->qualifiedColumn($field), $value);
            }
        }

        foreach ($this->searchable as $field) {
            if (Str::contains($field, '.') || !$this->tableHasColumn($field)) {
                continue;
            }

            $value = $this->requestParam($request, $field);

            if ($value !== null && $value !== '') {
                $query->where($this->qualifiedColumn($field), 'like', '%' . $value . '%');
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

        foreach ($this->amountRangeFilters as $column => $config) {
            $minKey = is_array($config) ? ($config['min'] ?? "{$column}_min") : "{$config}_min";
            $maxKey = is_array($config) ? ($config['max'] ?? "{$column}_max") : "{$config}_max";
            $actualColumn = is_array($config) ? $column : $config;

            if (!$this->tableHasColumn($actualColumn)) {
                continue;
            }

            $min = $this->requestParam($request, $minKey);
            $max = $this->requestParam($request, $maxKey);

            if ($min !== null && $min !== '') {
                $query->where($this->qualifiedColumn($actualColumn), '>=', (float) $min);
            }

            if ($max !== null && $max !== '') {
                $query->where($this->qualifiedColumn($actualColumn), '<=', (float) $max);
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

        $scope = app(BranchScopeService::class);
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        $requestedBranch = $scope->normalizeRequestedBranch($request);
        $branchColumn = $this->qualifiedColumn($this->branchColumn);

        if ($scope->canViewAllBranches($user)) {
            if ($requestedBranch && $requestedBranch !== 'all') {
                $scope->assertCanAccessBranch($user, (string) $requestedBranch);
                $query->where($branchColumn, (string) $requestedBranch);
            }

            return;
        }

        $assignedBranchIds = $scope->assignedBranchIds($user);

        if (empty($assignedBranchIds)) {
            $query->whereRaw('1 = 0');
            return;
        }

        if ($requestedBranch && $requestedBranch !== 'all') {
            $scope->assertCanAccessBranch($user, (string) $requestedBranch);
            $query->where($branchColumn, (string) $requestedBranch);
            return;
        }

        $query->whereIn($branchColumn, $assignedBranchIds);
    }

    protected function modelTable(): string
    {
        return $this->newModelInstance()->getTable();
    }

    protected function applyBranchToCreatePayload(array $data, Request $request): array
    {
        if (!$this->usesBranchScope()) {
            return $data;
        }

        $scope = app(BranchScopeService::class);
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        $providedBranchId = $data[$this->branchColumn] ?? null;

        if ($this->isAllBranchValue($providedBranchId)) {
            unset($data[$this->branchColumn]);
            $providedBranchId = null;
        }

        if (!empty($providedBranchId)) {
            $scope->assertCanAccessBranch($user, (string) $providedBranchId);
            $data[$this->branchColumn] = (string) $providedBranchId;

            return $data;
        }

        $requestedBranch = $scope->normalizeRequestedBranch($request);

        if ($requestedBranch && $requestedBranch !== 'all') {
            $scope->assertCanAccessBranch($user, (string) $requestedBranch);
            $data[$this->branchColumn] = (string) $requestedBranch;

            return $data;
        }

        if ($this->autoFillBranchOnCreate) {
            $defaultBranchId = $this->defaultWriteBranchId($request, false);

            if ($defaultBranchId) {
                $scope->assertCanAccessBranch($user, (string) $defaultBranchId);
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

        $scope = app(BranchScopeService::class);
        $user = $request->user();

        if (!$user) {
            abort(401, 'Unauthenticated.');
        }

        if ($scope->isBranchLimited($user) || $this->preventBranchChangeOnUpdate) {
            unset($data[$this->branchColumn]);
            return $data;
        }

        if ($this->isAllBranchValue($data[$this->branchColumn] ?? null)) {
            unset($data[$this->branchColumn]);

            return $data;
        }

        if (!empty($data[$this->branchColumn])) {
            $scope->assertCanAccessBranch($user, (string) $data[$this->branchColumn]);
            $data[$this->branchColumn] = (string) $data[$this->branchColumn];
        }

        return $data;
    }

    protected function assertRecordBranchAccess(Request $request, Model $record): void
    {
        if (!$this->usesBranchScope()) {
            return;
        }

        $branchId = $record->{$this->branchColumn} ?? null;

        if (!$branchId) {
            return;
        }

        app(BranchScopeService::class)->assertCanAccessBranch(
            $request->user(),
            (string) $branchId
        );
    }

    protected function requestedBranchId(Request $request): ?string
    {
        $value = app(BranchScopeService::class)->normalizeRequestedBranch($request);

        return $value === 'all' ? null : $value;
    }

    protected function isAllBranchValue(mixed $value): bool
    {
        if ($value === null || $value === '') {
            return false;
        }

        return in_array(strtolower((string) $value), ['all', '*'], true);
    }

    protected function defaultWriteBranchId(Request $request, bool $allowRequestedBranch = true): ?string
    {
        $scope = app(BranchScopeService::class);
        $user = $request->user();

        if (!$user) {
            return null;
        }

        if ($allowRequestedBranch) {
            $requestedBranch = $scope->normalizeRequestedBranch($request);

            if ($requestedBranch && $requestedBranch !== 'all') {
                return (string) $requestedBranch;
            }
        }

        if ($scope->canViewAllBranches($user)) {
            $mainBranchId = $this->defaultMainBranchId();

            if ($mainBranchId) {
                return $mainBranchId;
            }
        }

        $assigned = $scope->assignedBranchIds($user);

        return $assigned[0] ?? null;
    }

    protected function defaultMainBranchId(): ?string
    {
        try {
            $query = Branch::query();

            if (Schema::hasColumn('branches', 'active')) {
                $query->where('active', true);
            }

            foreach (['is_main', 'is_default', 'default', 'main'] as $column) {
                if (!Schema::hasColumn('branches', $column)) {
                    continue;
                }

                $branchId = (clone $query)
                    ->where($column, true)
                    ->value('id');

                if ($branchId) {
                    return (string) $branchId;
                }
            }

            if (Schema::hasColumn('branches', 'created_at')) {
                $branchId = (clone $query)
                    ->orderBy('created_at')
                    ->value('id');

                return $branchId ? (string) $branchId : null;
            }

            $branchId = (clone $query)->value('id');

            return $branchId ? (string) $branchId : null;
        } catch (\Throwable) {
            return null;
        }
    }

    protected function accessibleBranchIds(Request $request): array
    {
        return app(BranchScopeService::class)->accessibleBranchIds($request->user());
    }

    protected function userCanAccessAllBranches(Request $request): bool
    {
        return app(BranchScopeService::class)->canViewAllBranches($request->user());
    }

    protected function applyFiscalYearScope(Builder $query, Request $request): void
    {
        if (!$this->usesFiscalYearScope()) {
            return;
        }

        $fiscalYear = $this->requestedFiscalYear($request);

        if (!$fiscalYear) {
            return;
        }

        if ($this->tableHasColumn($this->fiscalYearColumn)) {
            $query->where($this->qualifiedColumn($this->fiscalYearColumn), $fiscalYear->id);
            return;
        }

        if ($this->businessDateColumn && $this->tableHasColumn($this->businessDateColumn)) {
            $query->whereDate($this->qualifiedColumn($this->businessDateColumn), '>=', $fiscalYear->start_date)
                ->whereDate($this->qualifiedColumn($this->businessDateColumn), '<=', $fiscalYear->end_date);
        }
    }

    protected function applyFiscalYearToCreatePayload(array $data, Request $request): array
    {
        if (!$this->usesFiscalYearScope()) {
            return $data;
        }

        $providedFiscalYearId = $data[$this->fiscalYearColumn] ?? null;

        if (!empty($providedFiscalYearId)) {
            $data[$this->fiscalYearColumn] = (string) $providedFiscalYearId;
            return $data;
        }

        if ($this->autoFillFiscalYearOnCreate && $this->tableHasColumn($this->fiscalYearColumn)) {
            $defaultFiscalYearId = $this->defaultWriteFiscalYearId($request);

            if ($defaultFiscalYearId) {
                $data[$this->fiscalYearColumn] = (string) $defaultFiscalYearId;
            }
        }

        return $data;
    }

    protected function applyFiscalYearToUpdatePayload(array $data, Request $request, Model $record): array
    {
        if (!$this->usesFiscalYearScope()) {
            return $data;
        }

        if (!$this->tableHasColumn($this->fiscalYearColumn)) {
            return $data;
        }

        if ($this->preventFiscalYearChangeOnUpdate && array_key_exists($this->fiscalYearColumn, $data)) {
            $incoming = (string) $data[$this->fiscalYearColumn];
            $existing = (string) ($record->{$this->fiscalYearColumn} ?? '');

            if ($incoming !== $existing && $this->isRecordPostedOrClosed($record)) {
                unset($data[$this->fiscalYearColumn]);
            }
        }

        return $data;
    }

    protected function requestedFiscalYearId(Request $request): ?string
    {
        $fiscalYearId = $request->header($this->fiscalYearHeaderKey);

        if (!$fiscalYearId) {
            $fiscalYearId = $request->query($this->fiscalYearRequestKey);
        }

        if (!$fiscalYearId) {
            $fiscalYearId = $request->input($this->fiscalYearRequestKey);
        }

        return $fiscalYearId ? (string) $fiscalYearId : null;
    }

    protected function defaultWriteFiscalYearId(Request $request): ?string
    {
        $requested = $this->requestedFiscalYearId($request);

        if ($requested) {
            return $requested;
        }

        try {
            $fiscalYear = app(AppContextService::class)->resolveFiscalYearForRequest($request);

            if ($fiscalYear) {
                return (string) $fiscalYear->id;
            }
        } catch (\Throwable) {
            //
        }

        return FiscalYear::query()->where('is_current', true)->where('active', true)->value('id')
            ?: FiscalYear::query()
                ->where('active', true)
                ->whereDate('start_date', '<=', now()->toDateString())
                ->whereDate('end_date', '>=', now()->toDateString())
                ->value('id');
    }

    protected function assertFiscalYearDateAllowed(array|Model $recordOrData, FiscalYear $fy): void
    {
        $date = $this->fiscalDateValue($recordOrData);

        if (!$date) {
            return;
        }

        $businessDate = Carbon::parse($date)->toDateString();
        $start = Carbon::parse($fy->start_date)->toDateString();
        $end = Carbon::parse($fy->end_date)->toDateString();

        if ($businessDate < $start || $businessDate > $end) {
            $this->throwValidation([
                $this->businessDateColumn ?: 'date' => ["The business date must fall inside fiscal year {$fy->name} ({$start} to {$end})."],
            ]);
        }
    }

    protected function fiscalDateValue(array|Model $recordOrData): ?string
    {
        if (!$this->businessDateColumn) {
            return null;
        }

        $value = is_array($recordOrData)
            ? ($recordOrData[$this->businessDateColumn] ?? null)
            : ($recordOrData->{$this->businessDateColumn} ?? null);

        return $value ? (string) $value : null;
    }

    protected function withFiscalYearRules(array $rules, bool $update = false): array
    {
        if (!$this->usesFiscalYearScope() || !$this->tableHasColumn($this->fiscalYearColumn)) {
            return $rules;
        }

        $rules[$this->fiscalYearColumn] ??= [
            $update ? 'sometimes' : 'nullable',
            'nullable',
            'uuid',
            'exists:fiscal_years,id',
        ];

        return $rules;
    }

    protected function assertFiscalYearWriteAllowed(array|Model $recordOrData, Request $request, ?Model $record = null): void
    {
        if (!$this->usesFiscalYearScope()) {
            return;
        }

        $fiscalYearId = is_array($recordOrData)
            ? ($recordOrData[$this->fiscalYearColumn] ?? $record?->{$this->fiscalYearColumn} ?? $this->defaultWriteFiscalYearId($request))
            : ($recordOrData->{$this->fiscalYearColumn} ?? $this->defaultWriteFiscalYearId($request));

        if (!$fiscalYearId) {
            return;
        }

        $fiscalYear = FiscalYear::query()->whereKey($fiscalYearId)->where('active', true)->first();

        if (!$fiscalYear) {
            $this->throwValidation([$this->fiscalYearColumn => ['The selected fiscal year is invalid or inactive.']]);
        }

        if (app(AppContextService::class)->isFiscalYearLocked($fiscalYear) && !app(AppContextService::class)->canOverrideFiscalYearLock($request->user())) {
            $this->throwValidation([$this->fiscalYearColumn => ['The selected fiscal year is closed or locked.']]);
        }

        if ($record && $this->preventFiscalYearChangeOnUpdate && $this->isRecordPostedOrClosed($record)) {
            $incomingFiscalYearId = is_array($recordOrData)
                ? ($recordOrData[$this->fiscalYearColumn] ?? $record->{$this->fiscalYearColumn})
                : $recordOrData->{$this->fiscalYearColumn};

            if ($incomingFiscalYearId && (string) $incomingFiscalYearId !== (string) $record->{$this->fiscalYearColumn}) {
                $this->throwValidation([$this->fiscalYearColumn => ['Fiscal year cannot be changed after posting, approval, or voiding.']]);
            }
        }

        $payloadForDate = is_array($recordOrData) && $record
            ? array_merge($record->getAttributes(), $recordOrData)
            : $recordOrData;

        $this->assertFiscalYearDateAllowed($payloadForDate, $fiscalYear);
    }

    protected function requestedFiscalYear(Request $request): ?FiscalYear
    {
        $id = $this->defaultWriteFiscalYearId($request);

        return $id ? FiscalYear::query()->whereKey($id)->where('active', true)->first() : null;
    }

    protected function usesFiscalYearScope(): bool
    {
        if (!$this->fiscalYearScoped) {
            return false;
        }

        return $this->tableHasColumn($this->fiscalYearColumn)
            || ($this->businessDateColumn && $this->tableHasColumn($this->businessDateColumn));
    }

    protected function isRecordPostedOrClosed(Model $record): bool
    {
        return (bool) ($record->approved ?? false)
            || (bool) ($record->void ?? false)
            || in_array((string) ($record->status ?? ''), ['posted', 'approved', 'void', 'voided', 'completed', 'closed', 'paid'], true);
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

            if ($mapping['approval_required'] ?? false) {
                $field = $mapping['field'] ?? null;

                if ($field && empty($parentData[$field])) {
                    $parentData[$field] = app(DocumentNumberingService::class)->generateDraft(
                        $model,
                        $parentData['date'] ?? null
                    );
                }

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

    protected function assignDocumentNumberOnApproval(array $parentData, ?Model $record): array
    {
        try {
            $model = $this->newModelInstance();
            $mapping = app(DocumentNumberingService::class)->getMappingForModel($model);

            if (!$mapping || !($mapping['approval_required'] ?? false)) {
                return $parentData;
            }

            $field = $mapping['field'] ?? null;
            $documentType = $mapping['document_type'] ?? null;

            if (!$field || !$documentType) {
                return $parentData;
            }

            $existing = $parentData[$field] ?? $record?->{$field} ?? null;

            if ($existing && !str_starts_with((string) $existing, '#draft')) {
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

        if ($this->tableHasColumn('voided') && !array_key_exists('voided', $rules)) {
            $rules['voided'] = [...$prefix, 'boolean'];
        }

        if ($this->tableHasColumn('voided_reason') && !array_key_exists('voided_reason', $rules)) {
            $rules['voided_reason'] = [...$prefix, 'string', 'max:500'];
        }

        if ($this->tableHasColumn('voided_at') && !array_key_exists('voided_at', $rules)) {
            $rules['voided_at'] = [...$prefix, 'date'];
        }

        if ($this->tableHasColumn('voided_by_id') && !array_key_exists('voided_by_id', $rules)) {
            $rules['voided_by_id'] = [...$prefix, 'integer', 'exists:users,id'];
        }

        return $rules;
    }

    protected function normalizeApprovalData(array $parentData, ?Model $record = null): array
    {
        if ($record && $this->isTransactionVoided($record) && !(($parentData['void'] ?? false) || ($parentData['voided'] ?? false))) {
            $this->throwValidation([
                'status' => ['Voided records cannot be edited.'],
            ]);
        }

        if ($record && $this->isTransactionApproved($record) && !$this->isApprovalOnlyUpdate($parentData)) {
            $this->throwValidation([
                'status' => ['Approved records cannot be edited.'],
            ]);
        }

        if (array_key_exists('approved', $parentData) && $this->tableHasColumn('approved')) {
            $approved = $this->toBool($parentData['approved']);
            $parentData['approved'] = (bool) $approved;

            if ($approved) {
                if ($record && $this->isTransactionVoided($record)) {
                    $this->throwValidation([
                        'approved' => ['Voided transactions cannot be approved.'],
                    ]);
                }

                $parentData = $this->assignDocumentNumberOnApproval($parentData, $record);
            }

            if ($approved && $this->tableHasColumn('approved_at') && empty($parentData['approved_at']) && empty($record?->approved_at)) {
                $parentData['approved_at'] = now();
            }

            if (!$approved && $this->tableHasColumn('approved_at') && !array_key_exists('approved_at', $parentData)) {
                $parentData['approved_at'] = null;
            }

            if (!$approved && $this->tableHasColumn('approved_by_id') && !array_key_exists('approved_by_id', $parentData)) {
                $parentData['approved_by_id'] = null;
            }
        }

        $voidField = $this->tableHasColumn('void') ? 'void' : ($this->tableHasColumn('voided') ? 'voided' : null);

        if ($voidField && array_key_exists($voidField, $parentData)) {
            $void = $this->toBool($parentData[$voidField]);
            $parentData[$voidField] = (bool) $void;

            if ($void && $this->tableHasColumn('voided_reason')) {
                $reason = trim((string) ($parentData['voided_reason'] ?? $record?->voided_reason ?? ''));

                if ($reason === '') {
                    $this->throwValidation([
                        'voided_reason' => ['Void reason is compulsory.'],
                    ]);
                }

                if (mb_strlen($reason) < 3) {
                    $this->throwValidation([
                        'voided_reason' => ['Void reason must be at least 3 characters.'],
                    ]);
                }

                $parentData['voided_reason'] = $reason;

                if ($this->tableHasColumn('voided_at') && empty($parentData['voided_at']) && empty($record?->voided_at)) {
                    $parentData['voided_at'] = now();
                }

                if ($this->tableHasColumn('voided_by_id') && empty($parentData['voided_by_id']) && empty($record?->voided_by_id)) {
                    $parentData['voided_by_id'] = auth()->id();
                }
            }
        }

        return $parentData;
    }

    protected function assertTransactionEditable(Model $record): void
    {
        if ($this->isTransactionVoided($record)) {
            $this->throwValidation(['status' => ['Voided records cannot be edited.']]);
        }

        if ($this->isTransactionApproved($record) && ! $this->canEditApprovedTransaction($record)) {
            $this->throwValidation(['status' => ['Approved records require edit-approved permission before they can be changed.']]);
        }
    }

    protected function canEditApprovedTransaction(Model $record): bool
    {
        $user = request()?->user();

        if ($this->userHasAdministrativeBypass($user)) {
            return true;
        }

        if (! $user || ! method_exists($user, 'can')) {
            return false;
        }

        $modelKey = Str::of(class_basename($record))->snake('-')->value();
        $permissionCandidates = array_filter([
            'transactions.edit-approved',
            'transactions.update-approved',
            "{$modelKey}.edit-approved",
            "{$modelKey}.update-approved",
            $this->permissionPrefix ? "{$this->permissionPrefix}.edit-approved" : null,
            $this->permissionPrefix ? "{$this->permissionPrefix}.update-approved" : null,
        ]);

        foreach ($permissionCandidates as $permission) {
            if ($user->can($permission)) {
                return true;
            }
        }

        return false;
    }

    protected function syncAccountingImpactAfterUpdate(Model $record): void
    {
        if (! $this->isTransactionApproved($record) || $this->isTransactionVoided($record)) {
            return;
        }

        if (class_basename($record) === 'JournalVoucher') {
            return;
        }

        $approvalService = app(TransactionApprovalService::class);

        if (! $approvalService->isAccountingImpacting($record)) {
            return;
        }

        app(\App\Services\ParallelJournalVoucherService::class)->createForApprovedSource($record->refresh());
    }

    protected function assertTransactionDestroyable(Model $record): void
    {
        if ($this->isTransactionApproved($record)) {
            $this->throwValidation(['status' => ['Approved records cannot be deleted.']]);
        }

        if ($this->isTransactionVoided($record)) {
            $this->throwValidation(['status' => ['Voided records cannot be deleted.']]);
        }
    }

    protected function isTransactionApproved(Model $record): bool
    {
        return in_array('approved', $record->getFillable(), true) && (bool) ($record->approved ?? false);
    }

    protected function isTransactionVoided(Model $record): bool
    {
        return (
            in_array('void', $record->getFillable(), true) && (bool) ($record->void ?? false)
        ) || (
            in_array('voided', $record->getFillable(), true) && (bool) ($record->voided ?? false)
        );
    }

    protected function isApprovalOnlyUpdate(array $parentData): bool
    {
        $allowed = [
            'approved',
            'approved_at',
            'approved_by_id',
            'void',
            'voided',
            'voided_at',
            'voided_by_id',
            'voided_reason',
            'status',
        ];

        $numberField = app(DocumentNumberingService::class)->getMappingForModel($this->newModelInstance())['field'] ?? null;

        if ($numberField) {
            $allowed[] = $numberField;
        }

        return collect(array_keys($parentData))->every(fn ($key) => in_array($key, $allowed, true));
    }

    protected function exportValue(mixed $value): string
    {
        if (is_array($value)) {
            return json_encode($value, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '';
        }

        if ($value instanceof \DateTimeInterface) {
            return $value->format('Y-m-d H:i:s');
        }

        if (is_bool($value)) {
            return $value ? 'Yes' : 'No';
        }

        return (string) ($value ?? '');
    }

    protected function bulkExportRows($records): array
    {
        if (!$this->tableHasColumn('approved') && !$this->tableHasColumn('void')) {
            return $this->serializeCollection($records);
        }

        return collect($records)
            ->map(fn (Model $record) => $this->transactionExportRow($record))
            ->values()
            ->all();
    }

    protected function transactionExportRow(Model $record): array
    {
        $data = $this->serializeRecord($record);

        return [
            'document_number' => $this->firstExportValue($data, [
                'quotation_no',
                'sales_order_no',
                'invoice_no',
                'payment_no',
                'sales_return_no',
                'purchase_order_no',
                'bill_no',
                'expense_no',
                'debit_note_no',
                'transfer_no',
                'voucher_no',
                'code',
                'reference',
            ]),
            'date' => $this->firstExportValue($data, [
                'quotation_date',
                'sales_order_date',
                'invoice_date',
                'payment_date',
                'sales_return_date',
                'purchase_order_date',
                'bill_date',
                'expense_date',
                'debit_note_date',
                'transfer_date',
                'voucher_date',
                'date',
            ]),
            'customer_supplier_account' => $this->exportRelationLabel($data['contact'] ?? $data['account'] ?? $data['from_account'] ?? $data['to_account'] ?? null),
            'status' => $data['status'] ?? '',
            'approved' => (bool) ($data['approved'] ?? false),
            'voided' => (bool) ($data['void'] ?? $data['voided'] ?? false),
            'amount' => $this->firstExportValue($data, [
                'grand_total',
                'total_amount',
                'total',
                'amount',
                'paid_amount',
                'total_debit',
            ]),
            'branch' => $this->exportRelationLabel($data['branch'] ?? null),
            'created_by' => $this->exportRelationLabel($data['user_add'] ?? $data['created_by'] ?? null),
            'reference_number' => $this->firstExportValue($data, ['reference_no', 'reference', 'supplier_bill_no']),
        ];
    }

    protected function firstExportValue(array $data, array $keys): mixed
    {
        foreach ($keys as $key) {
            if (array_key_exists($key, $data) && $data[$key] !== null && $data[$key] !== '') {
                return $data[$key];
            }
        }

        return '';
    }

    protected function exportRelationLabel(mixed $value): string
    {
        if (is_array($value)) {
            return (string) (
                $value['label'] ??
                $value['display_name'] ??
                $value['company_name'] ??
                $value['person_name'] ??
                $value['name'] ??
                $value['account_name'] ??
                $value['bank_name'] ??
                $value['title'] ??
                $value['code'] ??
                ''
            );
        }

        return (string) ($value ?? '');
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

        $data = $this->mutateSerializedRecord($data, $record);

        return $this->attachReportingTags($data, $record);
    }

    protected function modelSupportsReportingTags(?Model $model = null): bool
    {
        $model = $model ?: $this->newModelInstance();

        return in_array(
            \App\Models\Concerns\HasReportingTags::class,
            class_uses_recursive($model),
            true
        );
    }

    protected function withReportingTagRules(array $rules): array
    {
        if (! $this->modelSupportsReportingTags()) {
            return $rules;
        }

        $rules['reporting_tags'] ??= ['sometimes', 'nullable', 'array'];
        $rules['reporting_tags.*.reporting_tag_id'] ??= ['required', 'uuid'];
        $rules['reporting_tags.*.value'] ??= ['nullable'];

        return $rules;
    }

    /**
     * Pull (and remove) the reporting_tags payload from parent data so it never
     * reaches mass-assignment. Returns null when the key is absent (partial
     * update: leave existing values untouched).
     */
    protected function extractReportingTagsInput(array &$parentData): ?array
    {
        if (! $this->modelSupportsReportingTags() || ! array_key_exists('reporting_tags', $parentData)) {
            unset($parentData['reporting_tags']);

            return null;
        }

        $value = $parentData['reporting_tags'];
        unset($parentData['reporting_tags']);

        return is_array($value) ? $value : [];
    }

    protected function syncReportingTags(Model $record, ?array $items): void
    {
        if ($items === null || ! $this->modelSupportsReportingTags($record)) {
            return;
        }

        app(\App\Services\ReportingTagValueService::class)->sync($record, $items);
    }

    protected function attachReportingTags(array $data, Model $record): array
    {
        if (! $this->modelSupportsReportingTags($record)) {
            return $data;
        }

        $data['reporting_tags'] = app(\App\Services\ReportingTagValueService::class)->serializeFor($record);

        return $data;
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

    protected function businessRuleModule(): string
    {
        return $this->businessRuleModule ?: Str::snake(class_basename($this->modelClass));
    }

    protected function businessRulePayload(array $parentData, array $nestedData, ?Model $record = null): array
    {
        $payload = $parentData;

        foreach ($nestedData as $field => $rows) {
            $payload[$field] = $rows;

            $relation = $this->nested[$field]['relation'] ?? null;
            if ($relation) {
                $payload[$relation] = $rows;
                $payload[Str::snake($relation)] = $rows;
            }
        }

        if ($record) {
            foreach ($this->nested as $field => $config) {
                if (array_key_exists($field, $payload)) {
                    continue;
                }

                $relation = $config['relation'] ?? $field;
                if (method_exists($record, $relation)) {
                    $rows = $record->{$relation}()->get()->toArray();
                    $payload[$field] = $rows;
                    $payload[$relation] = $rows;
                    $payload[Str::snake($relation)] = $rows;
                }
            }
        }

        return $payload;
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

        if ($this->modelSupportsReportingTags()) {
            $relations[] = 'reportingTagValues';
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
                $user,
                401,
                'Unauthenticated.'
            );

            $permissionName = "{$this->permissionPrefix}.{$crudPermission}";

            if ($this->userHasAdministrativeBypass($user)) {
                return;
            }

            abort_unless(
                method_exists($user, 'can') && $user->can($permissionName),
                403,
                "Missing permission: {$permissionName}"
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

    protected function userHasAdministrativeBypass(mixed $user): bool
    {
        if (!$user) {
            return false;
        }

        if (!empty($user->is_super_admin)) {
            return true;
        }

        $roles = [
            'Super Admin',
            'Company Owner',
            'Admin',
            'Branch Admin',
            'Full Access User',
            'Full Access Admin',
            'super-admin',
            'admin',
        ];

        $legacyRole = method_exists($user, 'relationLoaded') && $user->relationLoaded('role')
            ? $user->getRelation('role')
            : ($user->role ?? null);

        if ($legacyRole && in_array((string) $legacyRole->name, $roles, true)) {
            return true;
        }

        if (method_exists($user, 'hasAnyRole')) {
            try {
                return $user->hasAnyRole($roles);
            } catch (Throwable) {
                return false;
            }
        }

        return false;
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

    protected function throwValidationWarning(array $warnings): void
    {
        throw new HttpResponseException(
            response()->json(['__validation_warnings' => $warnings], 422)
        );
    }

    protected function isValidationOverrideConfirmed(string $warningType): bool
    {
        return !empty(request()->input("validation_overrides.{$warningType}"));
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
