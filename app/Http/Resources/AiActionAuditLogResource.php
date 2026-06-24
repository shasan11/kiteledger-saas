<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AiActionAuditLogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'action_type' => $this->action_type,
            'module' => $this->module,
            'status' => $this->status,
            'before_values' => $this->before_values,
            'after_values' => $this->after_values,
            'created_at' => optional($this->created_at)->toIso8601String(),
        ];
    }
}
