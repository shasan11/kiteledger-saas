<?php

namespace App\DTO\Ai;

use App\Enums\Ai\AiRiskLevel;

class AiActionProposalData
{
    public function __construct(
        public readonly string      $actionType,
        public readonly string      $title,
        public readonly ?string     $summary,
        public readonly array       $payload,
        public readonly ?string     $module = null,
        public readonly AiRiskLevel $riskLevel = AiRiskLevel::LOW,
        public readonly array       $riskReasons = [],
        public readonly array       $missingFields = [],
        public readonly bool        $requiresApproval = true,
    ) {}

    public function toArray(): array
    {
        return [
            'action_type'       => $this->actionType,
            'title'             => $this->title,
            'summary'           => $this->summary,
            'payload'           => $this->payload,
            'module'            => $this->module,
            'risk_level'        => $this->riskLevel->value,
            'risk_reasons'      => $this->riskReasons,
            'missing_fields'    => $this->missingFields,
            'requires_approval' => $this->requiresApproval,
        ];
    }
}
