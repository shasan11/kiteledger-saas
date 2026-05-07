<?php

namespace App\Observers;

use App\Models\PosCashMovement;
use App\Services\DocumentNumberingService;
use App\Services\Pos\PosShiftService;

class PosCashMovementObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected PosShiftService $shiftService,
    ) {
    }

    public function creating(PosCashMovement $movement): void
    {
        if (!$movement->movement_no) {
            $movement->movement_no = $this->numberingService->generate('pos_cash_movement');
        }
    }

    public function updated(PosCashMovement $movement): void
    {
        if ($movement->wasChanged('approved') && (bool) $movement->approved === true) {
            $this->shiftService->recalculate($movement->posShift);
        }
    }
}
