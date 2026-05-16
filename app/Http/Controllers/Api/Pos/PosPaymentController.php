<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Pos\Concerns\AuthorizesPosAccess;
use App\Models\PosPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosPaymentController extends Controller
{
    use AuthorizesPosAccess;

    public function index(Request $request): JsonResponse
    {
        $this->authorizePos('pos.sale.view');

        $query = PosPayment::query()
            ->with(['posSale', 'account'])
            ->when($request->filled('pos_sale_id'), fn ($q) => $q->where('pos_sale_id', $request->string('pos_sale_id')))
            ->when($request->filled('payment_method'), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->orderByDesc('payment_date');

        if (!$this->canViewAllBranches($request)) {
            $query->whereHas('posSale', fn ($saleQuery) => $saleQuery->whereIn('branch_id', $this->accessibleBranchIds($request)));
        } elseif ($request->filled('branch_id')) {
            $this->assertBranchAccess($request, (string) $request->input('branch_id'));
            $query->whereHas('posSale', fn ($saleQuery) => $saleQuery->where('branch_id', (string) $request->input('branch_id')));
        }

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function show(PosPayment $pos_payment): JsonResponse
    {
        $this->authorizePos('pos.sale.view');
        $this->assertBranchAccess(request(), $pos_payment->posSale?->branch_id, 'You cannot view a POS payment from another branch.');

        return response()->json($pos_payment->load(['posSale', 'account']));
    }
}
