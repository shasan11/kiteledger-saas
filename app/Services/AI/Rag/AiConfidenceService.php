<?php

namespace App\Services\AI\Rag;

class AiConfidenceService
{
    public function evaluate(array $candidates): array
    {
        $top = (float) ($candidates[0]['final_score'] ?? 0);
        $second = (float) ($candidates[1]['final_score'] ?? 0);
        $label = match (true) {
            $top >= .72 => 'high',
            $top >= .45 => 'medium',
            default => 'low',
        };

        return [
            'level' => $label,
            'label' => match ($label) {
                'high' => 'High confidence',
                'medium' => 'Medium confidence',
                default => 'Needs more context',
            },
            'score' => round($top, 4),
            'margin' => round(max(0, $top - $second), 4),
        ];
    }
}
