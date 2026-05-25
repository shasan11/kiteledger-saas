<?php

namespace App\DTO\Ai;

use App\Enums\Ai\AiRiskLevel;

class AiRiskReviewData
{
    public function __construct(
        public readonly AiRiskLevel $riskLevel,
        public readonly int         $score,
        public readonly array       $reasons = [],
        public readonly array       $recommendations = [],
        public readonly ?string     $module = null,
        public readonly ?string     $targetType = null,
        public readonly ?string     $targetId = null,
    ) {}

    public function toArray(): array
    {
        return [
            'risk_level'      => $this->riskLevel->value,
            'score'           => $this->score,
            'reasons'         => $this->reasons,
            'recommendations' => $this->recommendations,
            'module'          => $this->module,
            'target_type'     => $this->targetType,
            'target_id'       => $this->targetId,
        ];
    }
}
