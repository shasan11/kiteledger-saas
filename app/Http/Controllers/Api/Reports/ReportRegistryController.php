<?php

namespace App\Http\Controllers\Api\Reports;

use App\Http\Controllers\Controller;
use App\Models\Branch;
use App\Models\ChartOfAccount;
use App\Models\Contact;
use App\Models\Currency;
use App\Models\Department;
use App\Models\EmployeeProfile;
use App\Models\Product;
use App\Models\ProductCategory;
use App\Models\User;
use App\Models\Warehouse;
use App\Services\Reports\ReportRegistry;
use App\Services\Reports\ReportSoftQueryService;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ReportRegistryController extends Controller
{
    public function __construct(protected readonly ReportSoftQueryService $softQuery)
    {
    }

    public function registry(Request $request): JsonResponse
    {
        $user = $request->user();
        $permissions = $user
            ? $user->getAllPermissions()->pluck('name')->all()
            : [];

        return response()->json(ReportRegistry::publicRegistry($permissions));
    }

    public function softQueryEndpoint(Request $request): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);
        abort_unless(
            $user->can('reports.view')
                || $user->can('reports.financial.view')
                || $user->can('reports.sales.view')
                || $user->can('reports.purchase.view')
                || $user->can('reports.inventory.view')
                || $user->can('reports.tax.view')
                || $user->can('reports.hrm.view')
                || $user->can('reports.system.view')
                || $user->can('reports.analytics.view'),
            403,
        );

        $query = (string) $request->input('query', '');
        $result = $this->softQuery->resolve($query, $request);

        if (empty($result['matched'])) {
            return response()->json([
                'ok' => false,
                'matched' => false,
                'message' => $result['message'] ?? 'No matching report found.',
                'suggestions' => $result['suggestions'] ?? [],
            ]);
        }

        // Permission check on resolved report.
        $meta = ReportRegistry::resolve($result['category'], $result['report_key']);
        if ($meta && !($user->can('reports.view') || $user->can($meta['permission']))) {
            return response()->json([
                'ok' => false,
                'matched' => false,
                'message' => 'You do not have permission to view this report.',
                'suggestions' => [],
            ], 403);
        }

        return response()->json([
            'ok' => true,
            'matched' => true,
            'result' => $result,
        ]);
    }

    public function options(Request $request, string $type): JsonResponse
    {
        $user = $request->user();
        abort_unless($user, 401);

        $search = trim((string) $request->query('search', ''));
        $limit = max(1, min(50, (int) $request->query('limit', 30)));
        $selectedId = $request->query('selected_id');

        $items = match ($type) {
            'branches' => $this->branches($request, $search, $limit, $selectedId),
            'currencies' => $this->currencies($search, $limit, $selectedId),
            'customers' => $this->contacts($request, 'customer', $search, $limit, $selectedId),
            'suppliers' => $this->contacts($request, 'supplier', $search, $limit, $selectedId),
            'products' => $this->products($request, $search, $limit, $selectedId),
            'product-categories' => $this->productCategories($search, $limit, $selectedId),
            'warehouses' => $this->warehouses($request, $search, $limit, $selectedId),
            'chart-of-accounts' => $this->chartOfAccounts($search, $limit, $selectedId),
            'departments' => $this->departments($search, $limit, $selectedId),
            'users' => $this->users($search, $limit, $selectedId),
            'employees' => $this->employees($search, $limit, $selectedId),
            default => abort(404),
        };

        return response()->json(['items' => $items]);
    }

    protected function branches(Request $request, string $search, int $limit, $selectedId): array
    {
        $user = $request->user();
        $canAll = false;
        if ($user) {
            try { $canAll = $user->can('branch.view_all'); } catch (\Throwable) {}
        }

        $query = Branch::query()->where('active', true);
        if (!$canAll && $user) {
            $branchId = $user->current_branch_id ?? $user->branch_id;
            if ($branchId) {
                $query->where('id', $branchId);
            }
        }
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            });
        }

        return $this->finalise($query, $selectedId, $limit, fn ($b) => [
            'id' => $b->id,
            'label' => $b->code ? "{$b->code} - {$b->name}" : $b->name,
            'name' => $b->name,
            'code' => $b->code,
        ], ['id', 'name', 'code']);
    }

    protected function currencies(string $search, int $limit, $selectedId): array
    {
        $query = Currency::query();
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('code'), $selectedId, $limit, fn ($c) => [
            'id' => $c->id,
            'label' => "{$c->code} - {$c->name}",
            'name' => $c->name,
            'code' => $c->code,
        ], ['id', 'name', 'code', 'symbol']);
    }

    protected function contacts(Request $request, string $type, string $search, int $limit, $selectedId): array
    {
        $query = Contact::query()
            ->where('contact_type', $type)
            ->where('active', true);
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('pan', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($c) => [
            'id' => $c->id,
            'label' => $c->code ? "{$c->code} - {$c->name}" : $c->name,
            'name' => $c->name,
            'code' => $c->code,
        ], ['id', 'name', 'code', 'pan']);
    }

    protected function products(Request $request, string $search, int $limit, $selectedId): array
    {
        $query = Product::query()->where('active', true);
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('code', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%")
                    ->orWhere('barcode', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($p) => [
            'id' => $p->id,
            'label' => $p->code ? "{$p->code} - {$p->name}" : $p->name,
            'name' => $p->name,
            'code' => $p->code,
            'sku' => $p->sku,
        ], ['id', 'name', 'code', 'sku', 'barcode']);
    }

    protected function productCategories(string $search, int $limit, $selectedId): array
    {
        $query = ProductCategory::query();
        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($c) => [
            'id' => $c->id,
            'label' => $c->name,
            'name' => $c->name,
        ], ['id', 'name']);
    }

    protected function warehouses(Request $request, string $search, int $limit, $selectedId): array
    {
        $query = Warehouse::query()->where('active', true);
        $user = $request->user();
        $canAll = false;
        if ($user) {
            try { $canAll = $user->can('branch.view_all'); } catch (\Throwable) {}
        }
        if (!$canAll && $user) {
            $branchId = $user->current_branch_id ?? $user->branch_id;
            if ($branchId && \Illuminate\Support\Facades\Schema::hasColumn('warehouses', 'branch_id')) {
                $query->where('branch_id', $branchId);
            }
        }
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($w) => [
            'id' => $w->id,
            'label' => $w->code ? "{$w->code} - {$w->name}" : $w->name,
            'name' => $w->name,
            'code' => $w->code,
        ], ['id', 'name', 'code']);
    }

    protected function chartOfAccounts(string $search, int $limit, $selectedId): array
    {
        $query = ChartOfAccount::query();
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('code', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('code'), $selectedId, $limit, fn ($a) => [
            'id' => $a->id,
            'label' => $a->code ? "{$a->code} - {$a->name}" : $a->name,
            'name' => $a->name,
            'code' => $a->code,
            'type' => $a->type ?? null,
        ], ['id', 'name', 'code', 'type']);
    }

    protected function departments(string $search, int $limit, $selectedId): array
    {
        $query = Department::query();
        if ($search !== '') {
            $query->where('name', 'like', "%{$search}%");
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($d) => [
            'id' => $d->id,
            'label' => $d->name,
            'name' => $d->name,
        ], ['id', 'name']);
    }

    protected function users(string $search, int $limit, $selectedId): array
    {
        $query = User::query();
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('name', 'like', "%{$search}%")->orWhere('email', 'like', "%{$search}%");
            });
        }
        return $this->finalise($query->orderBy('name'), $selectedId, $limit, fn ($u) => [
            'id' => $u->id,
            'label' => $u->name,
            'name' => $u->name,
        ], ['id', 'name', 'email']);
    }

    protected function employees(string $search, int $limit, $selectedId): array
    {
        $query = EmployeeProfile::query()->with('user:id,name');
        if ($search !== '') {
            $query->where(function (Builder $q) use ($search) {
                $q->where('employee_id', 'like', "%{$search}%")
                    ->orWhereHas('user', fn ($u) => $u->where('name', 'like', "%{$search}%"));
            });
        }
        return $this->finalise($query, $selectedId, $limit, fn ($e) => [
            'id' => $e->id,
            'label' => $e->employee_id
                ? "{$e->employee_id} - " . ($e->user?->name ?? 'Unknown')
                : ($e->user?->name ?? (string) $e->id),
            'name' => $e->user?->name,
            'code' => $e->employee_id,
        ], ['id', 'user_id', 'employee_id', 'branch_id', 'department_id']);
    }

    /**
     * Apply limit, hydrate selected_id if missing, and project rows via the mapper.
     */
    protected function finalise(Builder $query, $selectedId, int $limit, \Closure $map, array $columns): array
    {
        $rows = (clone $query)->limit($limit)->get($columns);

        if ($selectedId && !$rows->contains('id', $selectedId)) {
            $extra = (clone $query)->newQuery()
                ->getModel()
                ->newQuery()
                ->whereKey($selectedId)
                ->first($columns);
            if ($extra) {
                $rows->prepend($extra);
            }
        }

        return $rows->map($map)->values()->all();
    }
}
