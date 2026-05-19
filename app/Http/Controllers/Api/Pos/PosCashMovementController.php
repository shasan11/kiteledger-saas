<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Pos\Concerns\AuthorizesPosAccess;
use App\Http\Requests\Pos\StorePosCashMovementRequest;
use App\Models\PosCashMovement;
use App\Models\PosShift;
use App\Models\PosTerminal;
use App\Services\Pos\PosShiftService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosCashMovementController extends Controller
{
    use AuthorizesPosAccess;

    public function __construct(
        protected PosShiftService $shiftService,
    ) {
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizePos('pos.cash_movement.view');

        $query = PosCashMovement::query()
            ->with(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy'])
            ->when($request->filled('pos_shift_id'), fn ($q) => $q->where('pos_shift_id', $request->string('pos_shift_id')))
            ->when($request->filled('pos_terminal_id'), fn ($q) => $q->where('pos_terminal_id', $request->string('pos_terminal_id')))
            ->when($request->filled('type'), fn ($q) => $q->where('type', $request->string('type')))
            ->orderByDesc('movement_date');

        $this->applyBranchScope($query, $request);

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function store(StorePosCashMovementRequest $request): JsonResponse
    {
        $this->authorizePos('pos.cash_movement.create');

        $validated = $request->validated();
        $terminal = PosTerminal::query()->findOrFail($validated['pos_terminal_id']);
        $shift = PosShift::query()->findOrFail($validated['pos_shift_id']);
        $this->assertTerminalAccess($request, $terminal);
        $this->assertShiftAccess($request, $shift);
        abort_unless((string) $shift->pos_terminal_id === (string) $terminal->id, 422, 'The selected shift does not belong to the selected terminal.');
        abort_unless((string) $shift->branch_id === (string) $terminal->branch_id, 422, 'The selected shift does not belong to the selected terminal branch.');
        abort_unless($shift->status === 'open', 422, 'Cash movements can only be recorded on an open POS shift.');

        $movement = PosCashMovement::create([
            ...$validated,
            'branch_id' => $shift->branch_id,
            'movement_date' => $validated['movement_date'] ?? now(),
            'approved_at' => !empty($validated['approved']) ? now() : null,
            'approved_by_id' => !empty($validated['approved']) ? auth()->id() : null,
            'is_system_generated' => false,
            'user_add_id' => auth()->id(),
        ]);

        if ($movement->approved) {
            $this->shiftService->recalculate($movement->posShift);
        }

        return response()->json($movement->load(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']), 201);
    }

    public function show(PosCashMovement $pos_cash_movement): JsonResponse
    {
        $this->authorizePos('pos.cash_movement.view');
        $this->assertBranchAccess(request(), $pos_cash_movement->branch_id, 'You cannot view a POS cash movement from another branch.');

        return response()->json($pos_cash_movement->load(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']));
    }

    public function update(Request $request, PosCashMovement $pos_cash_movement): JsonResponse
    {
        $this->authorizePos('pos.cash_movement.update');
        $this->assertBranchAccess($request, $pos_cash_movement->branch_id, 'You cannot update a POS cash movement from another branch.');
        abort_if($pos_cash_movement->is_system_generated, 422, 'System generated POS cash movements cannot be edited.');

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

        $terminal = isset($validated['pos_terminal_id'])
            ? PosTerminal::query()->findOrFail($validated['pos_terminal_id'])
            : $pos_cash_movement->posTerminal;
        $shift = isset($validated['pos_shift_id'])
            ? PosShift::query()->findOrFail($validated['pos_shift_id'])
            : $pos_cash_movement->posShift;
        $this->assertTerminalAccess($request, $terminal);
        $this->assertShiftAccess($request, $shift);
        abort_unless((string) $shift->pos_terminal_id === (string) $terminal->id, 422, 'The selected shift does not belong to the selected terminal.');
        abort_unless((string) $shift->branch_id === (string) $terminal->branch_id, 422, 'The selected shift does not belong to the selected terminal branch.');
        abort_unless($shift->status === 'open', 422, 'Cash movements can only be edited on an open POS shift.');

        $pos_cash_movement->update([
            ...$validated,
            'branch_id' => $shift->branch_id,
            'approved_at' => !empty($validated['approved']) ? ($pos_cash_movement->approved_at ?? now()) : null,
            'approved_by_id' => !empty($validated['approved']) ? ($pos_cash_movement->approved_by_id ?? auth()->id()) : null,
        ]);

        if ($pos_cash_movement->approved) {
            $this->shiftService->recalculate($pos_cash_movement->posShift);
        }

        return response()->json($pos_cash_movement->fresh(['branch', 'posTerminal', 'posShift', 'account', 'approvedBy']));
    }
}
