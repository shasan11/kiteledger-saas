<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class JournalVoucherLineResource extends JsonResource
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
            'journal_voucher_id' => $this->journal_voucher_id,
            'chart_of_account_id' => $this->chart_of_account_id,
            'description' => $this->description,
            'debit' => $this->debit,
            'credit' => $this->credit,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
