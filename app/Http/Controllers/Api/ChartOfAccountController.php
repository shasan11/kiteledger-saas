<?php

namespace App\Http\Controllers\Api;

use App\Models\ChartOfAccount;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Http\Request;

class ChartOfAccountController extends BaseCrudApiController
{
    protected string $modelClass = ChartOfAccount::class;

    protected ?string $permissionPrefix = null;

    protected bool $usePolicyAuthorization = false;

    // If branch should come from logged-in user's branch, keep this true.
    protected bool $branchScoped = true;

    protected bool $autoFillBranchOnCreate = true;

    protected bool $preventBranchChangeOnUpdate = true;

    protected array $relations = [
        'branch',
        'account',
        'parent',
        'currency',
    ];

    protected array $relationDetails = [
        'branch' => 'branch_id',
        'account' => 'account_id',
        'parent' => 'parent_id',
        'currency' => 'currency_id',
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
        'currency.name',
        'currency.code',
    ];

    protected array $filterable = [
        'parent_id',
        'active',
        'is_system_generated',
    ];

    protected array $booleanFilters = [
        'active',
        'is_system_generated',
    ];

    protected array $sortable = [
        'id',
        'code',
        'name',
        'parent_id',
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
            // Backend-generated / backend-owned fields
            'branch_id' => ['exclude'],
            'account_id' => ['exclude'],
            'currency_id' => ['exclude'],
            'code' => ['exclude'],
            'user_add_id' => ['exclude'],
            'is_system_generated' => ['exclude'],

            // Frontend fields
            'parent_id' => [
                'nullable',
                'uuid',
                'exists:chart_of_accounts,id',
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
        ];
    }

    protected function updateRules(Request $request, Model $record): array
    {
        return [
            // Do not allow frontend to change synced/backend-owned fields
            'branch_id' => ['exclude'],
            'account_id' => ['exclude'],
            'currency_id' => ['exclude'],
            'code' => ['exclude'],
            'user_add_id' => ['exclude'],
            'is_system_generated' => ['exclude'],

            'parent_id' => [
                'sometimes',
                'nullable',
                'uuid',
                'exists:chart_of_accounts,id',
                function ($attribute, $value, $fail) use ($record) {
                    if ($value && (string) $value === (string) $record->getKey()) {
                        $fail('Parent chart account cannot be the same as this account.');
                    }
                },
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
        ];
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