<?php

namespace App\Observers;

use App\Models\Deal;
use App\Services\DocumentNumberingService;

class DealObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
    ) {
    }

    public function creating(Deal $deal): void
    {
        if (!$deal->deal_no) {
            $code = $this->numberingService->generate('deal');
            if ($code) {
                $deal->deal_no = $code;
            }
        }
    }
}
