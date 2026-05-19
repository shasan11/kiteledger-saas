<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Pos\Concerns\AuthorizesPosAccess;
use App\Http\Requests\Pos\CompletePosSaleRequest;
use App\Http\Requests\Pos\StorePosSaleRequest;
use App\Models\PosSale;
use App\Models\PosReturn;
use App\Models\PosShift;
use App\Models\PosTerminal;
use App\Models\Product;
use App\Models\TaxRate;
use App\Services\Pos\PosInventoryService;
use App\Services\Pos\PosSaleService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PosSaleController extends Controller
{
    use AuthorizesPosAccess;

    public function __construct(
        protected PosSaleService $saleService,
        protected PosInventoryService $inventoryService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePos('pos.sale.view');

        $query = PosSale::query()
            ->with([
                'branch',
                'posTerminal',
                'posShift.cashier',
                'contact',
                'invoice',
                'customerPayment',
                'approvedBy',
                'posSaleLines.taxRate',
                'posPayments',
            ])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->boolean('refundable'), fn ($q) => $q->whereIn('status', ['completed', 'part_refunded']))
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->where('pos_terminal_id', $request->string('pos_terminal_id')))
            ->when($request->filled('cashier_id'), fn ($q) => $q->whereHas('posShift', fn ($inner) => $inner->where('cashier_id', $request->integer('cashier_id'))))
            ->when($request->filled('shift_id'), fn ($q) => $q->where('pos_shift_id', $request->string('shift_id')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('sale_date', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('sale_date', '<=', $request->string('date_to')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->input('search'));
                $q->where(function ($inner) use ($search) {
                    $inner->where('sale_no', 'like', "%{$search}%")
                        ->orWhere('customer_name', 'like', "%{$search}%")
                        ->orWhere('customer_phone', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('sale_date');

        $this->applyBranchScope($query, $request);

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function store(StorePosSaleRequest $request): JsonResponse
    {
        $this->authorizePos('pos.sale.create');
        $terminal = PosTerminal::query()->findOrFail($request->validated('pos_terminal_id'));
        $this->assertTerminalAccess($request, $terminal);

        $sale = $this->saleService->createOrUpdateDraft(null, $request->validated());

        return response()->json($sale, 201);
    }

    public function show(PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.view');
        $this->assertBranchAccess(request(), $id->branch_id, 'You cannot view a POS sale from another branch.');

        return response()->json($id->load([
            'branch',
            'posTerminal',
            'posShift.cashier',
            'contact',
            'warehouse',
            'invoice',
            'customerPayment.customerPaymentLines.invoice',
            'salesReturn',
            'posSaleLines.product',
            'posSaleLines.taxRate',
            'posPayments.account',
            'posReturns',
            'approvedBy',
        ]));
    }

    public function update(StorePosSaleRequest $request, PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.update');
        $this->assertBranchAccess($request, $id->branch_id, 'You cannot update a POS sale from another branch.');

        $sale = $this->saleService->createOrUpdateDraft($id, $request->validated());

        return response()->json($sale);
    }

    public function hold(StorePosSaleRequest $request, PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.update');
        $this->assertBranchAccess($request, $id->branch_id, 'You cannot update a POS sale from another branch.');

        $sale = $this->saleService->holdSale($id, $request->validated());

        return response()->json($sale->fresh([
            'posSaleLines.product',
            'posSaleLines.taxRate',
            'posPayments.account',
            'contact',
            'posTerminal',
            'posShift',
        ]));
    }

    public function complete(CompletePosSaleRequest $request, PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.create');
        $this->assertBranchAccess($request, $id->branch_id, 'You cannot complete a POS sale from another branch.');

        $sale = $this->saleService->completeSale($id, $request->validated());

        return response()->json($sale);
    }

    public function cancel(PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.update');
        $this->assertBranchAccess(request(), $id->branch_id, 'You cannot cancel a POS sale from another branch.');

        return response()->json($this->saleService->cancel($id));
    }

    public function void(Request $request, PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.sale.void');
        $this->assertBranchAccess($request, $id->branch_id, 'You cannot void a POS sale from another branch.');

        $validated = $request->validate([
            'reason' => ['required', 'string'],
        ]);

        return response()->json($this->saleService->void($id, $validated['reason']));
    }

    public function productSearch(Request $request): JsonResponse
    {
        $this->authorizePos('pos.sale.create');

        $warehouseId = $request->string('warehouse_id')->toString() ?: null;
        $q = trim((string) $request->input('q'));
        $barcode = trim((string) $request->input('barcode'));

        $branchId = $request->string('branch_id')->toString() ?: null;
        $this->assertBranchAccess($request, $branchId, 'You cannot sell products from another branch.');

        $products = Product::query()
            ->with(['productUnit', 'taxClass'])
            ->where('active', true)
            ->where('allow_sale', true)
            ->whereIn('product_type', ['simple', 'variant'])
            ->when($branchId && $this->tableHasColumn('products', 'branch_id'), fn ($query) => $query->where(function ($inner) use ($branchId) {
                $inner->where('branch_id', $branchId)->orWhereNull('branch_id');
            }))
            ->when($barcode !== '', fn ($query) => $query->where('barcode', $barcode))
            ->when($q !== '', function ($query) use ($q) {
                $query->where(function ($inner) use ($q) {
                    $inner->where('name', 'like', "%{$q}%")
                        ->orWhere('code', 'like', "%{$q}%")
                        ->orWhere('sku', 'like', "%{$q}%")
                        ->orWhere('barcode', 'like', "%{$q}%");
                });
            })
            ->orderBy('name')
            ->limit((int) $request->input('limit', 30))
            ->get();

        $results = $products->map(function (Product $product) use ($warehouseId) {
            $taxRate = $product->tax_class_id
                ? TaxRate::query()->where('tax_class_id', $product->tax_class_id)->where('active', true)->orderBy('rate_percent')->first()
                : null;

            return [
                'id' => $product->id,
                'name' => $product->name,
                'code' => $product->code,
                'sku' => $product->sku,
                'barcode' => $product->barcode,
                'selling_price' => (float) $product->selling_price,
                'product_unit' => $product->productUnit,
                'tax_rate' => $taxRate,
                'available_stock' => $warehouseId ? $this->inventoryService->availableStock($product->id, $warehouseId) : null,
                'allow_sale' => (bool) $product->allow_sale,
                'track_inventory' => (bool) $product->track_inventory,
            ];
        })->values();

        return response()->json($results);
    }

    public function dashboard(): JsonResponse
    {
        $this->authorizePos('pos.sale.view');

        $today = Carbon::today();
        $request = request();
        $salesQuery = PosSale::query()
            ->with('posPayments')
            ->whereDate('sale_date', $today)
            ->whereIn('status', ['completed', 'part_refunded', 'refunded']);

        $this->applyBranchScope($salesQuery, $request);

        $sales = $salesQuery->get();

        $todaySales = round($sales->sum('grand_total'), 2);
        $returnQuery = PosReturn::query()
            ->whereDate('return_date', $today)
            ->where('status', 'completed');
        $this->applyBranchScope($returnQuery, $request);
        $todayRefunds = round($returnQuery->sum('refund_amount'), 2);
        $payments = $sales->flatMap->posPayments;
        $topProducts = Product::query()
            ->whereIn('id', function ($query) use ($salesQuery) {
                $query->select('product_id')
                    ->from('pos_sale_lines')
                    ->whereNotNull('product_id')
                    ->whereIn('pos_sale_id', (clone $salesQuery)->select('id'));
            })
            ->get()
            ->map(function ($product) use ($salesQuery) {
                $qty = \App\Models\PosSaleLine::query()
                    ->where('product_id', $product->id)
                    ->whereIn('pos_sale_id', (clone $salesQuery)->select('id'))
                    ->sum('qty');

                return ['product' => $product->name, 'qty' => (float) $qty];
            })
            ->sortByDesc('qty')
            ->take(5)
            ->values();

        $hourly = $sales
            ->groupBy(fn ($sale) => Carbon::parse($sale->sale_date)->format('H:00'))
            ->map(fn ($group, $hour) => ['hour' => $hour, 'total' => round($group->sum('grand_total'), 2)])
            ->values();

        return response()->json([
            'today_sales' => $todaySales,
            'today_cash_sales' => round($payments->where('payment_method', 'cash')->sum('amount'), 2),
            'today_card_sales' => round($payments->where('payment_method', 'card')->sum('amount'), 2),
            'today_online_sales' => round($payments->where('payment_method', 'online')->sum('amount'), 2),
            'today_refunds' => $todayRefunds,
            'open_shift_count' => tap(PosShift::query()->where('status', 'open'), fn ($query) => $this->applyBranchScope($query, $request))->count(),
            'active_terminal_count' => tap(PosTerminal::query()->where('active', true), fn ($query) => $this->applyBranchScope($query, $request))->count(),
            'top_selling_products' => $topProducts,
            'hourly_sales' => $hourly,
        ]);
    }

    public function refundable(PosSale $id): JsonResponse
    {
        $this->authorizePos('pos.return.create');
        $this->assertBranchAccess(request(), $id->branch_id, 'You cannot refund a sale from another branch.');

        return response()->json($id->load([
            'branch',
            'posTerminal',
            'posShift.cashier',
            'contact',
            'posSaleLines.product',
            'posSaleLines.taxRate',
            'posReturns',
        ]));
    }
}
