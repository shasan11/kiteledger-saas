<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\CompletePosReturnRequest;
use App\Http\Requests\Pos\StorePosReturnRequest;
use App\Models\PosReturn;
use App\Services\Pos\PosReturnService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosReturnController extends Controller
{
    public function __construct(
        protected PosReturnService $returnService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = PosReturn::query()
            ->with(['branch', 'posSale.contact', 'posShift.cashier', 'salesReturn', 'approvedBy'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->whereHas('posSale', fn ($inner) => $inner->where('pos_terminal_id', $request->string('pos_terminal_id'))))
            ->when($request->filled('cashier_id'), fn ($q) => $q->whereHas('posShift', fn ($inner) => $inner->where('cashier_id', $request->integer('cashier_id'))))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('return_date', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('return_date', '<=', $request->string('date_to')))
            ->orderByDesc('return_date');

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function store(StorePosReturnRequest $request): JsonResponse
    {
        $return = $this->returnService->createDraft($request->validated());

        return response()->json($return, 201);
    }

    public function show(PosReturn $id): JsonResponse
    {
        return response()->json($id->load([
            'branch',
            'posSale.contact',
            'posShift.cashier',
            'salesReturn',
            'posReturnLines.posSaleLine.product',
            'approvedBy',
        ]));
    }

    public function complete(CompletePosReturnRequest $request, PosReturn $id): JsonResponse
    {
        return response()->json($this->returnService->complete($id, $request->validated()));
    }

    public function cancel(PosReturn $id): JsonResponse
    {
        return response()->json($this->returnService->cancel($id));
    }
}
