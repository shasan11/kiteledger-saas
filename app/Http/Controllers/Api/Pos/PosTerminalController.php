<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StorePosTerminalRequest;
use App\Http\Requests\Pos\UpdatePosTerminalRequest;
use App\Models\PosTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosTerminalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PosTerminal::query()
            ->with(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer'])
            ->when($request->filled('branch_id'), fn ($q) => $q->where('branch_id', $request->string('branch_id')))
            ->when($request->filled('active'), fn ($q) => $q->where('active', filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->input('search'));
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('is_default')
            ->orderBy('name');

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function store(StorePosTerminalRequest $request): JsonResponse
    {
        $terminal = PosTerminal::create([
            ...$request->validated(),
            'user_add_id' => auth()->id(),
        ]);

        if ($terminal->is_default) {
            PosTerminal::query()
                ->where('branch_id', $terminal->branch_id)
                ->whereKeyNot($terminal->id)
                ->update(['is_default' => false]);
        }

        return response()->json($terminal->load(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer']), 201);
    }

    public function show(PosTerminal $pos_terminal): JsonResponse
    {
        return response()->json($pos_terminal->load(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer']));
    }

    public function update(UpdatePosTerminalRequest $request, PosTerminal $pos_terminal): JsonResponse
    {
        $pos_terminal->update($request->validated());

        if ($pos_terminal->is_default) {
            PosTerminal::query()
                ->where('branch_id', $pos_terminal->branch_id)
                ->whereKeyNot($pos_terminal->id)
                ->update(['is_default' => false]);
        }

        return response()->json($pos_terminal->fresh(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer']));
    }

    public function destroy(PosTerminal $pos_terminal): JsonResponse
    {
        abort_if($pos_terminal->posShifts()->exists() || $pos_terminal->posSales()->exists(), 422, 'Terminal cannot be deleted once used.');

        $pos_terminal->delete();

        return response()->json(['message' => 'Deleted successfully.']);
    }
}
