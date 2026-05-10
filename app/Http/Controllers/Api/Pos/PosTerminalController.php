<?php

namespace App\Http\Controllers\Api\Pos;

use App\Http\Controllers\Controller;
use App\Http\Requests\Pos\StorePosTerminalRequest;
use App\Http\Requests\Pos\UpdatePosTerminalRequest;
use App\Models\Branch;
use App\Models\PosTerminal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PosTerminalController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $query = PosTerminal::query()
            ->with(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer'])
            ->when(!$this->canViewAllBranches($request), fn ($q) => $q->whereIn('branch_id', $this->accessibleBranchIds($request)))
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
        return response()->json($pos_terminal->load(['branch', 'warehouse', 'cashAccount', 'cardAccount', 'onlineAccount', 'defaultCustomer']));
    }

    public function update(UpdatePosTerminalRequest $request, PosTerminal $pos_terminal): JsonResponse
    {
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

    protected function resolveWritableBranchId(Request $request, ?string $branchId): ?string
    {
        if ($this->canViewAllBranches($request) && $branchId) {
            return $branchId;
        }

        $user = $request->user();

        return $user?->current_branch_id
            ?? $user?->branch_id
            ?? Branch::query()->where('code', 'MAIN')->value('id')
            ?? Branch::query()->value('id');
    }

    protected function accessibleBranchIds(Request $request): array
    {
        $user = $request->user();
        $ids = array_filter([
            $user?->current_branch_id,
            $user?->branch_id,
        ]);

        if (empty($ids)) {
            $fallback = Branch::query()->where('code', 'MAIN')->value('id')
                ?? Branch::query()->value('id');

            if ($fallback) {
                $ids[] = $fallback;
            }
        }

        return array_values(array_unique(array_map('strval', $ids)));
    }

    protected function canViewAllBranches(Request $request): bool
    {
        $user = $request->user();

        if (!$user) {
            return false;
        }

        try {
            return $user->can('branch.view_all')
                || $user->can('branches.view-all')
                || $user->hasRole('super-admin')
                || $user->hasRole('admin');
        } catch (\Throwable) {
            return false;
        }
    }
}
