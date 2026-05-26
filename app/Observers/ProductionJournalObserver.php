<?php

namespace App\Observers;

use App\Models\ProductionJournal;
use App\Services\Inventory\ProductionPostingService as InventoryProductionPostingService;
use Illuminate\Support\Facades\DB;

class ProductionJournalObserver
{
    private static bool $posting = false;

    private const TRIGGER_STATUSES = ['posted', 'approved'];

    public function updated(ProductionJournal $model): void
    {
        $approvedTrigger = $model->wasChanged('approved') && (bool) $model->approved === true;
        $statusTrigger   = $model->wasChanged('status') && in_array($model->status, self::TRIGGER_STATUSES, true);

        if (!$approvedTrigger && !$statusTrigger) {
            return;
        }

        if ($model->stock_posted || $model->void) {
            return;
        }

        // Defer until the outermost DB transaction commits so that:
        // - nested raw_materials/by_products lines are fully saved first
        // - any posting done by afterSave is already reflected in stock_posted
        DB::connection()->afterCommit(function () use ($model) {
            if (static::$posting) {
                return;
            }

            $fresh = $model->fresh();
            if (!$fresh || $fresh->stock_posted || $fresh->void) {
                return;
            }

            if (!$fresh->approved && !in_array($fresh->status, self::TRIGGER_STATUSES, true)) {
                return;
            }

            static::$posting = true;
            try {
                app(InventoryProductionPostingService::class)->post($fresh);
            } finally {
                static::$posting = false;
            }
        });
    }
}
