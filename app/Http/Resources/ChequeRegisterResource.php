<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChequeRegisterResource extends JsonResource
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
            'cheque_no' => $this->cheque_no,
            'cheque_date' => $this->cheque_date?->toDateString(),
            'issued_date' => $this->issued_date?->toDateString(),
            'received_date' => $this->received_date?->toDateString(),
            'payee_name' => $this->payee_name,
            'cleared_date' => $this->cleared_date?->toDateString(),
            'direction' => $this->direction,
            'bank_account_id' => $this->bank_account_id,
            'account_id' => $this->account_id,
            'amount' => $this->amount,
            'status' => $this->status,
            'notes' => $this->notes,
            'active' => $this->active,
            'approved' => $this->approved,
            'voided' => $this->voided,
            'voided_reason' => $this->voided_reason,
            'voided_date' => $this->voided_date?->toDateString(),
            'voided_by_id' => $this->voided_by_id,
            'user_add_id' => $this->user_add_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
