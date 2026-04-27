<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ContactResource extends JsonResource
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
            'contact_group_id' => $this->contact_group_id,
            'contact_type' => $this->contact_type,
            'name' => $this->name,
            'code' => $this->code,
            'address' => $this->address,
            'pan' => $this->pan,
            'phone' => $this->phone,
            'accept_purchase' => $this->accept_purchase,
            'email' => $this->email,
            'credit_term_id' => $this->credit_term_id,
            'credit_limit' => $this->credit_limit,
            'active' => $this->active,
            'user_add_id' => $this->user_add_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,
        ];
    }
}
