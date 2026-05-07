<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StorePosCashMovementRequest;
use App\Models\PosCashMovement;
use App\Services\Pos\PosShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosCashMovementController extends Controller
{
    public function __construct(
        protected PosShiftService $shiftService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $query = PosCashMovement::query()
            ->with(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy'])
            ->when($request->filled('pos_shift_id'), fn ($q) => $q->where('pos_shift_id', $request->string('pos_shift_id')))
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->where('pos_terminal_id', $request->string('pos_terminal_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('movement_date');

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function store(StorePosCashMovementRequest $request): JsonResponse
    {
        $movement = PosCashMovement::create([
            ...$request->validated(),
            'movement_date' => $request->validated()['movement_date'] ?? now(),
            'approved_at' => !empty($request->validated()['approved']) ? now() : null,
            'approved_by_id' => !empty($request->validated()['approved']) ? auth()->id() : null,
            'user_add_id' => auth()->id(),
        ]);

        if ($movement->approved) {
            $this->shiftService->recalculate($movement->posShift);
        }

        return response()->json($movement->load(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']), 201);
    }

    public function show(PosCashMovement $pos_cash_movement): JsonResponse
    {
        return response()->json($pos_cash_movement->load(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']));
    }

    public function update(StorePosCashMovementRequest $request, PosCashMovement $pos_cash_movement): JsonResponse
    {
        $validated = $request->validate([
            'branch_id' => ['sometimes', 'nullable', 'uuid', 'exists:branches,id'],
            'pos_terminal_id' => ['sometimes', 'required', 'uuid', 'exists:pos_terminals,id'],
            'pos_shift_id' => ['sometimes', 'required', 'uuid', 'exists:pos_shifts,id'],
            'movement_date' => ['sometimes', 'nullable', 'date'],
            'type' => ['sometimes', 'required', 'in:cash_in,cash_out,expense,drop'],
            'amount' => ['sometimes', 'required', 'numeric', 'gt:0'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:180'],
            'notes' => ['sometimes', 'nullable', 'string'],
            'account_id' => ['sometimes', 'nullable', 'uuid', 'exists:accounts,id'],
            'approved' => ['sometimes', 'boolean'],
        ]);

        $pos_cash_movement->update([
            ...$validated,
            'approved_at' => !empty($validated['approved']) ? ($pos_cash_movement->approved_at ?? now()) : null,
            'approved_by_id' => !empty($validated['approved']) ? ($pos_cash_movement->approved_by_id ?? auth()->id()) : null,
        ]);

        if ($pos_cash_movement->approved) {
            $this->shiftService->recalculate($pos_cash_movement->posShift);
        }

        return response()->json($pos_cash_movement->fresh(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']));
    }
}
