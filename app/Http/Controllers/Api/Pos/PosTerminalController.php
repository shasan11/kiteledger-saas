<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Controllers\Api\Pos\Concerns\AuthorizesPosAccess;
use App\Http\Requests\Pos\StorePosTerminalRequest;
use App\Http\Requests\Pos\UpdatePosTerminalRequest;
use App\Models\PosSale;
use App\Models\PosShift;
use App\Models\PosTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class PosTerminalController extends Controller
{
    use AuthorizesPosAccess;

    public function index(Request $request): JsonResponse
    {
        $this->authorizePos('pos.terminal.view');

        $query = PosTerminal::query()
            ->with(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer'])
            ->when($request->filled('active'), fn ($q) => $q->where('active', filter_var($request->input('active'), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE) ?? true))
            ->when($request->filled('floor_name'), fn ($q) => $q->where('floor_name', $request->string('floor_name')))
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->input('search'));
                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%");
                });
            })
            ->orderByDesc('is_default')
            ->orderBy('floor_name')
            ->orderBy('sort_order')
            ->orderBy('name');

        $this->applyBranchScope($query, $request);

        return response()->json($query->paginate((int) $request->input('page_size', 20)));
    }

    public function overview(Request $request): JsonResponse
    {
        $this->authorizePos('pos.terminal.view');

        $query = PosTerminal::query()
            ->with(['branch', 'warehouse'])
            ->where('active', true)
            ->when($request->filled('search'), function ($q) use ($request) {
                $search = trim((string) $request->input('search'));

                $q->where(function ($inner) use ($search) {
                    $inner->where('name', 'like', "%{$search}%")
                        ->orWhere('code', 'like', "%{$search}%")
                        ->orWhere('location', 'like', "%{$search}%")
                        ->orWhereHas('branch', fn ($branch) => $branch->where('name', 'like', "%{$search}%"))
                        ->orWhereHas('warehouse', fn ($warehouse) => $warehouse->where('name', 'like', "%{$search}%"));
                });
            })
            ->orderByDesc('is_default')
            ->orderBy('name');

        $this->applyBranchScope($query, $request);

        $terminals = $query->get();
        $terminalIds = $terminals->pluck('id')->all();

        $openShifts = PosShift::query()
            ->with(['cashier'])
            ->whereIn('pos_terminal_id', $terminalIds)
            ->where('status', 'open')
            ->latest('opened_at')
            ->get()
            ->keyBy('pos_terminal_id');

        $todaySales = PosSale::query()
            ->whereIn('pos_terminal_id', $terminalIds)
            ->whereDate('sale_date', Carbon::today())
            ->whereIn('status', ['completed', 'part_refunded', 'refunded'])
            ->selectRaw('pos_terminal_id, COALESCE(SUM(grand_total), 0) as total_sales, COUNT(*) as transaction_count')
            ->groupBy('pos_terminal_id')
            ->get()
            ->keyBy('pos_terminal_id');

        $terminals = $terminals->map(function (PosTerminal $terminal) use ($openShifts, $todaySales) {
            $shift = $openShifts->get($terminal->id);
            $sales = $todaySales->get($terminal->id);
            $status = 'closed';
            $statusLabel = 'No Shift';
            $statusColor = 'default';

            if ($shift) {
                $cashDifference = round((float) ($shift->cash_difference ?? 0), 2);
                $hoursOpen = $shift->opened_at ? $shift->opened_at->diffInHours(now()) : 0;

                if (abs($cashDifference) >= 0.01) {
                    $status = 'risk';
                    $statusLabel = 'Needs Review';
                    $statusColor = 'red';
                } elseif ($hoursOpen >= 12) {
                    $status = 'attention';
                    $statusLabel = 'Needs Attention';
                    $statusColor = 'gold';
                } else {
                    $status = 'open';
                    $statusLabel = 'Open Shift';
                    $statusColor = 'green';
                }
            }

            return [
                'id' => $terminal->id,
                'name' => $terminal->name,
                'code' => $terminal->code,
                'branch_id' => $terminal->branch_id,
                'warehouse_id' => $terminal->warehouse_id,
                'branch' => $terminal->branch ? [
                    'id' => $terminal->branch->id,
                    'name' => $terminal->branch->name,
                    'code' => $terminal->branch->code ?? null,
                ] : null,
                'warehouse' => $terminal->warehouse ? [
                    'id' => $terminal->warehouse->id,
                    'name' => $terminal->warehouse->name,
                    'code' => $terminal->warehouse->code ?? null,
                ] : null,
                'location' => $terminal->location,
                'floor_name' => $terminal->floor_name ?: 'Main Floor',
                'x_position' => (int) ($terminal->x_position ?? 24),
                'y_position' => (int) ($terminal->y_position ?? 24),
                'sort_order' => (int) ($terminal->sort_order ?? 0),
                'status' => $terminal->status ?: $status,
                'active' => (bool) $terminal->active,
                'is_default' => (bool) $terminal->is_default,
                'today_sales' => round((float) ($sales?->total_sales ?? 0), 2),
                'today_transaction_count' => (int) ($sales?->transaction_count ?? 0),
                'current_shift' => $shift ? [
                    'id' => $shift->id,
                    'shift_no' => $shift->shift_no,
                    'status' => $shift->status,
                    'cashier' => $shift->cashier ? [
                        'id' => $shift->cashier->id,
                        'name' => $shift->cashier->display_name ?? $shift->cashier->name ?? $shift->cashier->username,
                    ] : null,
                    'opened_at' => optional($shift->opened_at)->toJSON(),
                    'opening_cash' => (float) $shift->opening_cash,
                    'expected_cash' => (float) $shift->expected_cash,
                    'total_sales' => (float) $shift->total_sales,
                    'cash_sales' => (float) $shift->total_cash_sales,
                    'card_sales' => (float) $shift->total_card_sales,
                    'online_sales' => (float) $shift->total_online_sales,
                    'total_refunds' => (float) $shift->total_refunds,
                    'cash_difference' => (float) $shift->cash_difference,
                ] : null,
                'status' => $status,
                'status_label' => $statusLabel,
                'status_color' => $statusColor,
            ];
        })->values();

        return response()->json([
            'terminals' => $terminals,
        ]);
    }

    public function store(StorePosTerminalRequest $request): JsonResponse
    {
        $this->authorizePos('pos.terminal.create');

        $payload = $request->validated();
        $payload['branch_id'] = $this->resolveWritableBranchId($request, $payload['branch_id'] ?? null);
        $payload['code'] = trim((string) ($payload['code'] ?? '')) ?: $this->generateNextCode();

        $terminal = PosTerminal::create([
            ...$payload,
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
        $this->authorizePos('pos.terminal.view');
        $this->assertTerminalAccess(request(), $pos_terminal);

        return response()->json($pos_terminal->load(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer']));
    }

    public function update(UpdatePosTerminalRequest $request, PosTerminal $pos_terminal): JsonResponse
    {
        $this->authorizePos('pos.terminal.update');
        $this->assertTerminalAccess($request, $pos_terminal);

        $payload = $request->validated();

        if (!$this->canViewAllBranches($request)) {
            unset($payload['branch_id']);
        } elseif (array_key_exists('branch_id', $payload)) {
            $payload['branch_id'] = $this->resolveWritableBranchId($request, $payload['branch_id']);
        }

        if (array_key_exists('code', $payload) && trim((string) $payload['code']) === '') {
            unset($payload['code']);
        }

        $pos_terminal->update($payload);

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
        $this->authorizePos('pos.terminal.delete');
        $this->assertTerminalAccess(request(), $pos_terminal);

        abort_if($pos_terminal->posShifts()->exists() || $pos_terminal->posSales()->exists(), 422, 'Terminal cannot be deleted once used.');

        $pos_terminal->delete();

        return response()->json(['message' => 'Deleted successfully.']);
    }

    protected function generateNextCode(): string
    {
        $max = PosTerminal::query()
            ->where('code', 'like', 'POS-%')
            ->pluck('code')
            ->map(fn ($code) => (int) preg_replace('/\D+/', '', (string) $code))
            ->max() ?? 0;

        do {
            $code = 'POS-' . str_pad((string) (++$max), 4, '0', STR_PAD_LEFT);
        } while (PosTerminal::query()->where('code', $code)->exists());

        return $code;
    }

}
