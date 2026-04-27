<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CashTransferResource extends JsonResource
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
            'transfer_no' => $this->transfer_no,
            'transfer_date' => $this->transfer_date?->toDateString(),
            'from_bank_account_id' => $this->from_bank_account_id,
            'reference' => $this->reference,
            'currency_id' => $this->currency_id,
            'total_amount' => $this->total_amount,
            'notes' => $this->notes,
            'status' => $this->status,
            'user_add_id' => $this->user_add_id,
            'active' => $this->active,
            'approved' => $this->approved,
            'exchange_rate' => $this->exchange_rate,
            'voided' => $this->voided,
            'voided_reason' => $this->voided_reason,
            'voided_date' => $this->voided_date?->toDateString(),
            'voided_by_id' => $this->voided_by_id,
            'items' => $this->whenLoaded('items', function () {
                return $this->items->map(function ($item) {
                    return [
                        'id' => $item->id,
                        'to_bank_account_id' => $item->to_bank_account_id,
                        'exchange_rate_to_default' => $item->exchange_rate_to_default,
                        'description' => $item->description,
                        'amount' => $item->amount,
                    ];
                });
            }),
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
