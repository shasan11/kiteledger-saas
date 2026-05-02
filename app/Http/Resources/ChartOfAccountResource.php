<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ChartOfAccountResource extends JsonResource
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
            'account_id' => $this->account_id,
            'code' => $this->code,
            'name' => $this->name,
            'parent_id' => $this->parent_id,
            'description' => $this->description,
            'currency_id' => $this->currency_id,
            'is_system_generated' => $this->is_system_generated,
            'active' => $this->active,
            'user_add_id' => $this->user_add_id,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at,

            'branch' => $this->whenLoaded('branch'),
            'account' => $this->whenLoaded('account'),
            'parent' => $this->whenLoaded('parent'),
        ];
    }
}
