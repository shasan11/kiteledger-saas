<?php

namespace App\Enums\Ai;

enum AiRiskLevel: string
{
    case LOW      = 'low';
    case MEDIUM   = 'medium';
    case HIGH     = 'high';
    case CRITICAL = 'critical';

    public static function fromScore(int $score): self
    {
        return match (true) {
            $score >= 80 => self::CRITICAL,
            $score >= 60 => self::HIGH,
            $score >= 30 => self::MEDIUM,
            default      => self::LOW,
        };
    }

    public function label(): string
    {
        return match ($this) {
            self::LOW      => 'Low Risk',
            self::MEDIUM   => 'Medium Risk',
            self::HIGH     => 'High Risk',
            self::CRITICAL => 'Critical Risk',
        };
    }
}
