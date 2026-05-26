<?php

namespace App\DTO\Ai;

use App\Enums\Ai\AiIntentType;

class AiIntentData
{
    public function __construct(
        public readonly AiIntentType $intent,
        public readonly ?string      $module = null,
        public readonly array        $extracted = [],
        public readonly float        $confidence = 0.0,
        public readonly ?string      $rationale = null,
    ) {}

    public function toArray(): array
    {
        return [
            'intent'     => $this->intent->value,
            'module'     => $this->module,
            'extracted'  => $this->extracted,
            'confidence' => $this->confidence,
            'rationale'  => $this->rationale,
        ];
    }
}
