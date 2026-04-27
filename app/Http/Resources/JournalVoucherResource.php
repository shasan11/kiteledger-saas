<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalVoucherResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'branch_id' => $this->branch_id,
            'voucher_no' => $this->voucher_no,
            'voucher_date' => $this->voucher_date?->toDateString(),
            'currency_id' => $this->currency_id,
            'exchange_rate' => $this->exchange_rate,
            'reference' => $this->reference,
            'narration' => $this->narration,
            'status' => $this->status,
            'user_add_id' => $this->user_add_id,
            'active' => $this->active,
            'approved' => $this->approved,
            'voided' => $this->voided,
            'voided_reason' => $this->voided_reason,
            'voided_date' => $this->voided_date?->toDateString(),
            'voided_by_id' => $this->voided_by_id,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'chart_of_account_id' => $item->chart_of_account_id,
                        'description' => $item->description,
                        'debit' => $item->debit,
                        'credit' => $item->credit,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
