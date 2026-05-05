<?php

namespace App\Observers;

use App\Models\Lead;
use App\Services\DocumentNumberingService;

class LeadObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
    ) {
    }

    public function creating(Lead $lead): void
    {
        if (!$lead->lead_no) {
            $code = $this->numberingService->generate('lead');
            if ($code) {
                $lead->lead_no = $code;
            }
        }
    }
}
