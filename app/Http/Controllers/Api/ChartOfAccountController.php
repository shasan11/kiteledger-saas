<?php

namespace App\Http\Controllers\Api;

use App\Models\Account;
use App\Models\ChartOfAccount;
use App\Models\Currency;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ChartOfAccountController extends BaseCrudApiController
{
    protected string $modelClass = ChartOfAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    protected bool $branchScoped = false;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'account',
        'parent',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'account' => 'account_id',
        'parent' => 'parent_id',
    ];

    protected array $searchable = [
        'code',
        'name',
        'description',
        'branch.name',
        'branch.code',
        'account.name',
        'account.code',
        'parent.name',
        'parent.code',
    ];

    protected array $filterable = [
        'branch_id',
        'parent_id',
        'type',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'code',
        'name',
        'type',
        'parent_id',
        'branch_id',
        'is_system_generated',
        'active',
        'created_at',
        'updated_at',
    ];

    protected string $defaultSort = 'code';

    public function index(Request $request)
    {
        if ($request->boolean('tree')) {
            return $this->treeIndex($request);
        }

        return parent::index($request);
    }

    protected function storeRules(Request $request): array
    {
        return [
            'branch_id' => [
                'nullable',
                'uuid',
                'exists:branches,id',
            ],

            'parent_id' => [
                'nullable',
                'uuid',
                'exists:chart_of_accounts,id',
            ],

            'type' => [
                'nullable',
                Rule::in([
                    'asset',
                    'liability',
                    'equity',
                    'income',
                    'expense',
                ]),
            ],

            'name' => [
                'required',
                'string',
                'max:150',
            ],

            'description' => [
                'nullable',
                'string',
            ],

            'active' => [
                'nullable',
                'boolean',
            ],

            // frontend must not send these
            'account_id' => ['exclude'],
            'currency_id' => ['exclude'],
            'code' => ['exclude'],
            'user_add_id' => ['exclude'],
            'is_system_generated' => ['exclude'],
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            'branch_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:branches,id',
            ],

            'parent_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:chart_of_accounts,id',
                function ($attribute, $value, $fail) use ($record) {
                    if (!$value) {
                        return;
                    }

                    if ((string) $value === (string) $record->getKey()) {
                        $fail('Parent chart account cannot be the same as this account.');
                        return;
                    }

                    if ($this->isInvalidParent($value, $record->getKey())) {
                        $fail('Parent chart account cannot be one of its own children.');
                    }
                },
            ],

            'type' => [
                'sometimes',
                'nullable',
                Rule::in([
                    'asset',
                    'liability',
                    'equity',
                    'income',
                    'expense',
                ]),
            ],

            'name' => [
                'sometimes',
                'required',
                'string',
                'max:150',
            ],

            'description' => [
                'sometimes',
                'nullable',
                'string',
            ],

            'active' => [
                'sometimes',
                'nullable',
                'boolean',
            ],

            // frontend must not change these
            'account_id' => ['exclude'],
            'currency_id' => ['exclude'],
            'code' => ['exclude'],
            'user_add_id' => ['exclude'],
            'is_system_generated' => ['exclude'],
        ];
    }

    protected function mutateParentDataBeforeCreate(array $parentData, array $nestedData): array
    {
        $parentData = parent::mutateParentDataBeforeCreate($parentData, $nestedData);

        $parentData['type'] = $parentData['type'] ?? 'asset';
        $parentData['active'] = $parentData['active'] ?? true;
        $parentData['is_system_generated'] = false;

        $parentData['code'] = $this->generateNextCode();

        $account = $this->createLinkedAccount($parentData);

        $parentData['account_id'] = $account->getKey();

        return $parentData;
    }

    protected function mutateParentDataBeforeUpdate(
        array $parentData,
        array $nestedData,
        Model $record
    ): array {
        unset(
            $parentData['account_id'],
            $parentData['code'],
            $parentData['user_add_id'],
            $parentData['is_system_generated']
        );

        return $parentData;
    }

    protected function afterSave(
        Model $record,
        array $parentData,
        array $nestedData,
        bool $isUpdate
    ): Model {
        $this->syncLinkedAccount($record);

        return $record;
    }

    protected function createLinkedAccount(array $parentData): Account
    {
        $parentAccountId = null;

        if (!empty($parentData['parent_id'])) {
            $parentAccountId = ChartOfAccount::query()
                ->whereKey($parentData['parent_id'])
                ->value('account_id');
        }

        $currencyId = Currency::query()
            ->where('is_base', true)
            ->value('id');

        if (!$currencyId) {
            $currencyId = Currency::query()->value('id');
        }

        $account = new Account();

        $account->forceFill([
            'name' => $parentData['name'],
            'code' => $parentData['code'],
            'nature' => 'coa',
            'parent_id' => $parentAccountId,
            'currency_id' => $currencyId,
            'active' => $parentData['active'] ?? true,
            'is_system_generated' => false,
            'user_add_id' => request()->user()?->getAuthIdentifier(),
        ]);

        $account->save();

        return $account;
    }

    protected function syncLinkedAccount(Model $record): void
    {
        if (!$record->account_id) {
            return;
        }

        $account = Account::query()->find($record->account_id);

        if (!$account) {
            return;
        }

        $parentAccountId = null;

        if ($record->parent_id) {
            $parentAccountId = ChartOfAccount::query()
                ->whereKey($record->parent_id)
                ->value('account_id');
        }

        $account->forceFill([
            'name' => $record->name,
            'code' => $record->code,
            'nature' => 'coa',
            'parent_id' => $parentAccountId,
            'active' => $record->active,
        ]);

        $account->save();
    }

    protected function generateNextCode(): string
    {
        $codes = ChartOfAccount::query()
            ->whereNotNull('code')
            ->pluck('code')
            ->all();

        $max = 999;

        foreach ($codes as $code) {
            $number = (int) preg_replace('/\D+/', '', (string) $code);

            if ($number > $max) {
                $max = $number;
            }
        }

        $next = $max + 1;

        while (ChartOfAccount::query()->where('code', (string) $next)->exists()) {
            $next++;
        }

        return (string) $next;
    }

    protected function isInvalidParent(string $newParentId, string $currentId): bool
    {
        $parent = ChartOfAccount::query()->find($newParentId);

        while ($parent) {
            if ((string) $parent->getKey() === (string) $currentId) {
                return true;
            }

            if (!$parent->parent_id) {
                break;
            }

            $parent = ChartOfAccount::query()->find($parent->parent_id);
        }

        return false;
    }

    protected function treeIndex(Request $request)
    {
        $this->checkAccess($request, 'index');

        $query = $this->baseQuery();

        $this->applyBranchScope($query, $request);
        $this->applySearch($query, $request);
        $this->applyFilters($query, $request);
        $this->applyOrdering($query, $request);

        $records = $query->get();

        $serialized = $this->serializeCollection($records);

        $tree = $this->buildTree($serialized);

        return response()->json([
            'count' => count($tree),
            'next' => null,
            'previous' => null,
            'results' => $tree,
        ]);
    }

    protected function buildTree(array $rows): array
    {
        $map = [];
        $roots = [];

        foreach ($rows as $row) {
            $row['key'] = $row['id'];
            $row['children'] = [];

            $map[(string) $row['id']] = $row;
        }

        foreach ($map as $id => &$row) {
            $parentId = $row['parent_id'] ?? null;

            if ($parentId && isset($map[(string) $parentId])) {
                $map[(string) $parentId]['children'][] = &$row;
            } else {
                $roots[] = &$row;
            }
        }

        unset($row);

        return $this->removeEmptyChildren($roots);
    }

    protected function removeEmptyChildren(array $nodes): array
    {
        return array_map(function ($node) {
            if (!empty($node['children'])) {
                $node['children'] = $this->removeEmptyChildren($node['children']);
            } else {
                unset($node['children']);
            }

            return $node;
        }, $nodes);
    }
}