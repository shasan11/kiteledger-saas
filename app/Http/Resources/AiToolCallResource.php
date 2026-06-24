<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiToolCallResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'tool_name' => $this->tool_name,
            'status' => $this->status,
            'duration_ms' => $this->duration_ms,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
