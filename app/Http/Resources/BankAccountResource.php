<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BankAccountResource extends JsonResource
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
            'type' => $this->type,
            'display_name' => $this->display_name,
            'code' => $this->code,
            'currency_id' => $this->currency_id,
            'description' => $this->description,
            'bank_name' => $this->bank_name,
            'account_name' => $this->account_name,
            'account_number' => $this->account_number,
            'account_type' => $this->account_type,
            'swift_code' => $this->swift_code,
            'account_id' => $this->account_id,
            'opening_balance' => $this->opening_balance,
            'active' => $this->active,
            'user_add_id' => $this->user_add_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
