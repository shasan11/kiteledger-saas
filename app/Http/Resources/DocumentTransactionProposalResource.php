<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DocumentTransactionProposalResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'transaction_type' => $this->transaction_type,
            'status' => $this->status,
            'payload' => $this->payload ?? [],
            'missing_fields' => $this->missing_fields ?? [],
            'warnings' => $this->warnings ?? [],
            'confidence' => $this->confidence_score,
            'converted_at' => optional($this->converted_at)->toISOString(),
            'created_at' => optional($this->created_at)->toISOString(),
            'updated_at' => optional($this->updated_at)->toISOString(),
        ];
    }
}
