<?php

namespace App\Observers;

use App\Models\PosReturn;
use App\Services\DocumentNumberingService;
use App\Services\Pos\PosReturnService;

class PosReturnObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected PosReturnService $returnService,
    ) {
    }

    public function creating(PosReturn $return): void
    {
        if (!$return->return_no) {
            $return->return_no = $this->numberingService->generate('pos_return');
        }
    }

    public function updated(PosReturn $return): void
    {
        if ($return->wasChanged('status') && $return->status === 'completed') {
            $this->returnService->processCompletedReturn($return);
        }

        if ($return->wasChanged('approved') && (bool) $return->approved === true && $return->status === 'completed') {
            $this->returnService->processCompletedReturn($return);
        }
    }
}
