<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Models\PosPayment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosPaymentController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PosPayment::query()
            ->with(['posSale', 'account'])
            ->when($request->filled('pos_sale_id'), fn ($q) => $q->where('pos_sale_id', $request->string('pos_sale_id')))
            ->when($request->filled('payment_method'), fn ($q) => $q->where('payment_method', $request->string('payment_method')))
            ->orderByDesc('payment_date');

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function show(PosPayment $pos_payment): JsonResponse
    {
        return response()->json($pos_payment->load(['posSale', 'account']));
    }
}
