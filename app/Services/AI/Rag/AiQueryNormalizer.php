<?php

namespace App\Services\AI\Rag;

use Illuminate\Support\Str;

class AiQueryNormalizer
{
    public function normalize(string $query): array
    {
        $original = trim(preg_replace('/\s+/u', ' ', $query) ?? $query);
        $normalized = Str::lower(Str::ascii($original));
        $normalized = trim(preg_replace('/[^a-z0-9\-\/_\.\s]/', ' ', $normalized) ?? $normalized);
        $normalized = trim(preg_replace('/\s+/', ' ', $normalized) ?? $normalized);
        $stop = ['the', 'a', 'an', 'is', 'are', 'to', 'of', 'in', 'on', 'for', 'me', 'my', 'please', 'can', 'you'];
        $tokens = collect(explode(' ', $normalized))
            ->filter(fn ($token) => mb_strlen($token) > 1 && ! in_array($token, $stop, true))
            ->unique()->take(12)->values()->all();

        preg_match_all('/\b[A-Za-z]{1,8}[-\/]?[A-Za-z0-9]*\d[A-Za-z0-9\-\/]*\b/u', $original, $matches);

        return [
            'original' => $original,
            'normalized' => $normalized,
            'tokens' => $tokens,
            'identifiers' => array_values(array_unique($matches[0] ?? [])),
        ];
    }
}
