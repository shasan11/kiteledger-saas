<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\ClosePosShiftRequest;
use App\Http\Requests\Pos\OpenPosShiftRequest;
use App\Models\PosShift;
use App\Services\Pos\PosShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosShiftController extends Controller
{
    public function __construct(
        protected PosShiftService $shiftService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = PosShift::query()
            ->with(['branch', 'posTerminal', 'cashier', 'posCashMovements', 'posSales'])
            ->when($request->filled('status'), fn ($q) => $q->where('status', $request->string('status')))
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->where('pos_terminal_id', $request->string('pos_terminal_id')))
            ->when($request->filled('cashier_id'), fn ($q) => $q->where('cashier_id', $request->integer('cashier_id')))
            ->when($request->filled('date_from'), fn ($q) => $q->whereDate('opened_at', '>=', $request->string('date_from')))
            ->when($request->filled('date_to'), fn ($q) => $q->whereDate('opened_at', '<=', $request->string('date_to')))
            ->orderByDesc('opened_at');

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function open(OpenPosShiftRequest $request): JsonResponse
    {
        $shift = $this->shiftService->openShift($request->validated());

        return response()->json($shift->load(['branch', 'posTerminal', 'cashier']), 201);
    }

    public function close(ClosePosShiftRequest $request, PosShift $id): JsonResponse
    {
        $shift = $this->shiftService->closeShift($id, $request->validated());

        return response()->json($shift->load(['branch', 'posTerminal', 'cashier', 'posCashMovements', 'posSales']));
    }

    public function current(Request $request): JsonResponse
    {
        $shift = PosShift::query()
            ->with(['branch', 'posTerminal', 'cashier'])
            ->where('status', 'open')
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->where('pos_terminal_id', $request->string('pos_terminal_id')))
            ->when($request->filled('cashier_id'), fn ($q) => $q->where('cashier_id', $request->integer('cashier_id')))
            ->latest('opened_at')
            ->first();

        return response()->json($shift);
    }

    public function show(PosShift $id): JsonResponse
    {
        $shift = $id->load([
            'branch',
            'posTerminal',
            'cashier',
            'posSales.contact',
            'posCashMovements.account',
        ]);

        return response()->json($shift);
    }
}
