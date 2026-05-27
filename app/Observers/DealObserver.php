<?php

namespace App\Observers;

use App\Models\CrmDealStageHistory;
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

    /**
     * When a deal's status flips to won/lost without an accompanying stage
     * change (e.g. someone PATCH'd /api/deals/{id} with status=won, or used
     * an action button), record a status_change row so the timeline still
     * shows the transition.
     *
     * Stage moves already write their own stage_change history row in
     * DealController::moveStage/afterSave; those carry the new status too,
     * so we explicitly skip when the stage also changed.
     */
    public function updated(Deal $deal): void
    {
        if (!$deal->wasChanged('status')) {
            return;
        }

        if ($deal->wasChanged('deal_stage_id')) {
            return;
        }

        $newStatus = $deal->status;
        if (!in_array($newStatus, ['won', 'lost'], true)) {
            return;
        }

        CrmDealStageHistory::query()->create([
            'deal_id' => $deal->getKey(),
            'from_stage_id' => $deal->deal_stage_id,
            'to_stage_id' => $deal->deal_stage_id,
            'event_type' => 'status_change',
            'to_status' => $newStatus,
            'changed_by' => request()?->user()?->id,
            'changed_at' => now(),
            'days_in_previous_stage' => null,
            'remarks' => $newStatus === 'lost' ? $deal->lost_reason : null,
        ]);
    }
}
