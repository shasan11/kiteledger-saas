<?php

namespace App\Services\Pos;

use App\Models\PosCashMovement;
use App\Models\PosShift;
use App\Models\PosTerminal;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PosShiftService
{
    public function openShift(array $payload): PosShift
    {
        return DB::transaction(function () use ($payload) {
            $terminal = PosTerminal::query()->findOrFail($payload['pos_terminal_id']);
            $actorId = $this->currentUserId();
            $cashierId = $payload['cashier_id'] ?? $actorId;
            $branchId = $payload['branch_id'] ?? $terminal->branch_id;

            if (!$cashierId) {
                throw new InvalidArgumentException('Unable to determine the logged-in cashier for this shift.');
            }

            if (!$terminal->active) {
                throw new InvalidArgumentException('Cannot open a shift on an inactive POS terminal.');
            }

            if ($actorId && (int) $cashierId !== (int) $actorId) {
                $user = request()->user();

                if (!$user || !$user->can('pos.shift.update')) {
                    throw new InvalidArgumentException('You cannot open a shift for another cashier.');
                }
            }

            if ($branchId && $terminal->branch_id && (string) $branchId !== (string) $terminal->branch_id) {
                throw new InvalidArgumentException('The selected terminal does not belong to this branch.');
            }

            $this->validateOpenShift($terminal->id, $cashierId);

            $shift = PosShift::create([
                'branch_id' => $branchId,
                'pos_terminal_id' => $terminal->id,
                'cashier_id' => $cashierId,
                'opened_at' => $payload['opened_at'] ?? now(),
                'opening_cash' => round((float) ($payload['opening_cash'] ?? 0), 2),
                'notes' => $payload['notes'] ?? null,
                'status' => 'open',
                'active' => true,
                'user_add_id' => $actorId,
            ]);

            return $this->recalculate($shift->fresh());
        });
    }

    public function closeShift(PosShift $shift, array $payload): PosShift
    {
        if ($shift->status !== 'open') {
            throw new InvalidArgumentException('Cannot close an already closed shift.');
        }

        if ($shift->cashier_id && auth()->id() && (int) $shift->cashier_id !== (int) auth()->id()) {
            $user = request()->user();

            if (!$user || !$user->can('pos.shift.update')) {
                throw new InvalidArgumentException('You cannot close another cashier shift.');
            }
        }

        $shift->fill([
            'closed_at' => $payload['closed_at'] ?? now(),
            'counted_cash' => round((float) $payload['counted_cash'], 2),
            'closing_notes' => $payload['closing_notes'] ?? null,
            'status' => 'closed',
        ]);

        $shift->save();

        return $this->recalculate($shift->fresh());
    }

    public function validateOpenShift(string $terminalId, ?int $cashierId): void
    {
        $openTerminalShift = PosShift::query()
            ->where('pos_terminal_id', $terminalId)
            ->where('status', 'open')
            ->exists();

        if ($openTerminalShift) {
            throw new InvalidArgumentException('This terminal already has an open shift.');
        }

        if ($cashierId) {
            $openCashierShift = PosShift::query()
                ->where('pos_terminal_id', $terminalId)
                ->where('cashier_id', $cashierId)
                ->where('status', 'open')
                ->exists();

            if ($openCashierShift) {
                throw new InvalidArgumentException('This cashier already has an open shift on the selected terminal.');
            }
        }
    }

    public function recalculate(PosShift $shift): PosShift
    {
        $sales = $shift->posSales()->whereIn('status', ['completed', 'part_refunded', 'refunded'])->get();
        $payments = $sales->flatMap->posPayments;

        $cashMovementApproved = $shift->posCashMovements()
            ->where('approved', true)
            ->where(function ($query) {
                $query->where('is_system_generated', false)->orWhereNull('is_system_generated');
            })
            ->get();
        $cashIn = $cashMovementApproved->where('type', 'cash_in')->sum('amount');
        $cashOut = $cashMovementApproved->whereIn('type', ['cash_out', 'drop', 'expense'])->sum('amount');

        $totalSales = round($sales->sum('grand_total'), 2);
        $totalRefunds = round($shift->posReturns()->where('status', 'completed')->sum('refund_amount'), 2);
        $totalCashSales = round($payments->where('payment_method', 'cash')->sum('amount'), 2);
        $totalCardSales = round($payments->where('payment_method', 'card')->sum('amount'), 2);
        $totalOnlineSales = round($payments->where('payment_method', 'online')->sum('amount'), 2);
        $totalExpenses = round($cashMovementApproved->where('type', 'expense')->sum('amount'), 2);
        $expectedCash = round((float) $shift->opening_cash + $cashIn - $cashOut + $payments->where('payment_method', 'cash')->sum('amount') - $totalRefunds, 2);
        $countedCash = round((float) $shift->counted_cash, 2);

        $shift->forceFill([
            'total_sales' => $totalSales,
            'total_cash_sales' => $totalCashSales,
            'total_card_sales' => $totalCardSales,
            'total_online_sales' => $totalOnlineSales,
            'total_refunds' => $totalRefunds,
            'total_expenses' => $totalExpenses,
            'expected_cash' => $expectedCash,
            'cash_difference' => round($countedCash - $expectedCash, 2),
        ])->saveQuietly();

        return $shift->refresh();
    }

    private function currentUserId(): ?int
    {
        return request()->user()?->getAuthIdentifier()
            ?? auth('web')->id()
            ?? auth()->id();
    }
}
