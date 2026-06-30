<?php

namespace App\Services\AI\Rag;

use Illuminate\Support\Str;

class AiContextAssembler
{
    public function assemble(array $candidates, int $maxChars = 9000): array
    {
        $context = [];
        $used = 0;
        foreach ($candidates as $index => $candidate) {
            $text = Str::limit(trim((string) $candidate['content']), 1800);
            $entry = sprintf(
                "[%d] %s | Module: %s\n%s",
                $index + 1,
                $candidate['title'] ?? 'KiteLedger source',
                $candidate['module'] ?? 'General',
                $text,
            );
            if ($used + mb_strlen($entry) > $maxChars) {
                break;
            }
            $context[] = $entry;
            $used += mb_strlen($entry);
        }

        return ['text' => implode("\n\n", $context), 'source_count' => count($context), 'characters' => $used];
    }
}
