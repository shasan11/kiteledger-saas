<?php

namespace App\Observers;

use App\Models\PosSale;
use App\Services\DocumentNumberingService;
use App\Services\Pos\PosCartCalculatorService;

class PosSaleObserver
{
    public function __construct(
        protected DocumentNumberingService $numberingService,
        protected PosCartCalculatorService $calculator,
    ) {
    }

    public function creating(PosSale $sale): void
    {
        if (!$sale->sale_no) {
            $sale->sale_no = $this->numberingService->generate('pos_sale');
        }
    }

    public function saving(PosSale $sale): void
    {
        if ($sale->exists) {
            $items = $sale->relationLoaded('posSaleLines')
                ? $sale->posSaleLines->map->toArray()->all()
                : $sale->posSaleLines()->get()->map->toArray()->all();

            $payments = $sale->relationLoaded('posPayments')
                ? $sale->posPayments->map->toArray()->all()
                : $sale->posPayments()->get()->map->toArray()->all();

            if (count($items) > 0) {
                $totals = $this->calculator->calculate($items, $payments, (float) $sale->round_off);
                $sale->subtotal = $totals['subtotal'];
                $sale->discount_total = $totals['discount_total'];
                $sale->tax_total = $totals['tax_total'];
                $sale->grand_total = $totals['grand_total'];
                $sale->paid_total = $totals['paid_total'];
                $sale->balance_due = $totals['balance_due'];
                $sale->change_amount = $totals['change_amount'];
                $sale->payment_status = $totals['payment_status'];
            }
        }
    }
}
