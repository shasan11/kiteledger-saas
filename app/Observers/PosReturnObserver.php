<?php

namespace App\Observers;

use App\Models\PosReturn;
use App\Services\DocumentNumberingService;

class PosReturnObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
    ) {
    }

    public function creating(PosReturn $return): void
    {
        if (!$return->return_no) {
            $return->return_no = $this->numberingService->generate('pos_return');
        }
    }
}
