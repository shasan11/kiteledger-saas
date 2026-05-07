<?php

namespace App\Observers;

use App\Models\PosShift;
use App\Services\DocumentNumberingService;
use App\Services\Pos\PosShiftService;

class PosShiftObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected PosShiftService $shiftService,
    ) {
    }

    public function creating(PosShift $shift): void
    {
        if (!$shift->shift_no) {
            $shift->shift_no = $this->numberingService->generate('pos_shift');
        }
    }

    public function updated(PosShift $shift): void
    {
        if ($shift->wasChanged(['closed_at', 'counted_cash', 'status'])) {
            $this->shiftService->recalculate($shift);
        }
    }
}
