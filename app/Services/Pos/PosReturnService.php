<?php

namespace App\Services\Pos;

use App\Models\Currency;
use App\Models\PosReturn;
use App\Models\PosReturnLine;
use App\Models\PosSale;
use App\Models\SalesReturn;
use App\Models\SalesReturnLine;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

class PosReturnService
{
    public function __construct(
        protected PosAccountingService $accountingService,
        protected PosShiftService $shiftService,
    ) {
    }

    public function createDraft(array $payload): PosReturn
    {
        return DB::transaction(function () use ($payload) {
            $sale = PosSale::query()->with('posSaleLines.product')->findOrFail($payload['pos_sale_id']);

            if (!in_array($sale->status, ['completed', 'part_refunded'], true)) {
                throw new InvalidArgumentException('Returns can only be created from completed sales.');
            }

            $return = PosReturn::create([
                'branch_id' => $payload['branch_id'] ?? $sale->branch_id,
                'pos_sale_id' => $sale->id,
                'pos_shift_id' => $payload['pos_shift_id'] ?? $sale->pos_shift_id,
                'return_date' => $payload['return_date'] ?? now(),
                'refund_method' => $payload['refund_method'],
                'reason' => $payload['reason'] ?? null,
                'notes' => $payload['notes'] ?? null,
                'status' => 'draft',
                'active' => true,
                'user_add_id' => auth()->id(),
            ]);

            $refundAmount = 0;

            foreach ($payload['items'] as $item) {
                $saleLine = $sale->posSaleLines->firstWhere('id', $item['pos_sale_line_id']);

                if (!$saleLine) {
                    throw new InvalidArgumentException('Return line does not belong to the selected sale.');
                }

                $qty = round((float) $item['qty'], 4);
                $availableQty = round((float) $saleLine->qty - (float) $saleLine->returned_qty, 4);

                if ($qty > $availableQty) {
                    throw new InvalidArgumentException("Cannot refund more than sold quantity for {$saleLine->product_name}.");
                }

                $unitTax = (float) $saleLine->qty > 0 ? round((float) $saleLine->tax_amount / (float) $saleLine->qty, 4) : 0;
                $taxAmount = round($unitTax * $qty, 2);
                $lineTotal = round(($qty * (float) $saleLine->unit_price) - (($qty / (float) $saleLine->qty) * (float) $saleLine->discount_amount) + $taxAmount, 2);

                PosReturnLine::create([
                    'pos_return_id' => $return->id,
                    'pos_sale_line_id' => $saleLine->id,
                    'product_id' => $saleLine->product_id,
                    'qty' => $qty,
                    'unit_price' => $saleLine->unit_price,
                    'tax_amount' => $taxAmount,
                    'line_total' => $lineTotal,
                    'remarks' => $item['remarks'] ?? null,
                ]);

                $refundAmount += $lineTotal;
            }

            $return->forceFill(['refund_amount' => round($refundAmount, 2)])->save();

            return $return->fresh(['posSale', 'posReturnLines.posSaleLine.product']);
        });
    }

    public function complete(PosReturn $return, array $payload): PosReturn
    {
        return DB::transaction(function () use ($return, $payload) {
            if ($return->status !== 'draft') {
                throw new InvalidArgumentException('Only draft returns can be completed.');
            }

            $return->forceFill([
                'approved' => (bool) ($payload['approved'] ?? true),
                'approved_at' => ($payload['approved'] ?? true) ? now() : null,
                'approved_by_id' => ($payload['approved'] ?? true) ? auth()->id() : null,
                'refund_method' => $payload['refund_method'] ?? $return->refund_method,
                'reason' => $payload['reason'] ?? $return->reason,
                'notes' => $payload['notes'] ?? $return->notes,
                'status' => 'completed',
            ])->save();

            $this->ensureSalesReturn($return->fresh(['posSale.contact', 'posSale.posSaleLines', 'posReturnLines.posSaleLine']));
            $this->updateSale($return);
            $this->accountingService->approveReturnArtifacts($return->fresh(['salesReturn']));
            $this->shiftService->recalculate($return->posShift);

            return $return->fresh(['posSale', 'salesReturn', 'posReturnLines.posSaleLine.product']);
        });
    }

    public function cancel(PosReturn $return): PosReturn
    {
        if ($return->status !== 'draft') {
            throw new InvalidArgumentException('Only draft returns can be cancelled.');
        }

        $return->forceFill(['status' => 'cancelled'])->save();

        return $return->refresh();
    }

    public function processCompletedReturn(PosReturn $return): PosReturn
    {
        if ($return->status !== 'completed') {
            return $return;
        }

        if (!$return->sales_return_id) {
            $this->ensureSalesReturn($return->fresh(['posSale.contact', 'posReturnLines.posSaleLine']));
        }

        $this->updateSale($return);

        if ($return->approved) {
            $this->accountingService->approveReturnArtifacts($return->fresh(['salesReturn']));
        }

        return $return->refresh();
    }

    private function ensureSalesReturn(PosReturn $return): void
    {
        if ($return->sales_return_id) {
            return;
        }

        $sale = $return->posSale;
        $salesReturn = SalesReturn::create([
            'branch_id' => $sale->branch_id,
            'sales_return_date' => optional($return->return_date)->toDateString() ?? now()->toDateString(),
            'contact_id' => $sale->contact_id,
            'warehouse_id' => $sale->warehouse_id,
            'currency_id' => Currency::query()->where('is_base', true)->value('id'),
            'reference' => $sale->sale_no,
            'notes' => $return->notes,
            'status' => 'posted',
            'approved' => $return->approved,
            'approved_at' => $return->approved ? ($return->approved_at ?? now()) : null,
            'approved_by_id' => $return->approved ? ($return->approved_by_id ?? auth()->id()) : null,
            'exchange_rate' => 1,
            'total' => $return->refund_amount,
            'user_add_id' => auth()->id(),
        ]);

        foreach ($return->posReturnLines as $line) {
            SalesReturnLine::create([
                'sales_return_id' => $salesReturn->id,
                'product_id' => $line->product_id,
                'qty' => $line->qty,
                'unit_price' => $line->unit_price,
                'tax_amount' => $line->tax_amount,
                'line_total' => $line->line_total,
                'description' => $line->remarks,
            ]);

            $line->posSaleLine->increment('returned_qty', (float) $line->qty);
        }

        $return->forceFill(['sales_return_id' => $salesReturn->id])->saveQuietly();
    }

    private function updateSale(PosReturn $return): void
    {
        $sale = $return->posSale()->with('posSaleLines')->first();

        $returnedQty = $sale->posSaleLines->sum('returned_qty');
        $soldQty = $sale->posSaleLines->sum('qty');

        $status = $returnedQty > 0 && $returnedQty + 0.0001 < $soldQty
            ? 'part_refunded'
            : 'refunded';

        $sale->forceFill([
            'status' => $status,
            'payment_status' => 'refunded',
            'sales_return_id' => $return->sales_return_id,
        ])->saveQuietly();
    }
}
