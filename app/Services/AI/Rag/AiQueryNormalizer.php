<?php

namespace App\Services\AI\Rag;

use Illuminate\Support\Str;

class AiQueryNormalizer
{
    /**
     * Words that carry no retrieval signal.
     *
     * Keeping interrogatives and auxiliaries as tokens is not merely untidy: the
     * keyword score is matches divided by token count, so every question word
     * left in the list lowers the score of the document that answers the
     * question. "Why is an invoice still showing as unpaid?" scored two matches
     * out of six tokens and fell under the evidence floor, so the correct help
     * article was retrieved, ranked, and then discarded — the user saw nothing
     * at all. A short keyword query was unaffected, which is why this survived
     * casual testing.
     *
     * Domain words are deliberately absent: "account", "balance" and "order"
     * look like filler in English and are exactly what a user is searching for
     * here.
     */
    private const STOP_WORDS = [
        // Articles, conjunctions, prepositions.
        'the', 'a', 'an', 'and', 'or', 'but', 'to', 'of', 'in', 'on', 'at', 'by',
        'for', 'from', 'with', 'about', 'into', 'over', 'as', 'than', 'then',
        // Pronouns and possessives.
        'me', 'my', 'mine', 'we', 'our', 'us', 'you', 'your', 'it', 'its',
        'they', 'them', 'their', 'this', 'that', 'these', 'those',
        // Interrogatives and politeness.
        'who', 'what', 'when', 'where', 'why', 'which', 'whose', 'please',
        // Auxiliaries and copulas.
        'is', 'are', 'was', 'were', 'be', 'been', 'being', 'am',
        'do', 'does', 'did', 'can', 'could', 'shall', 'should', 'will',
        'would', 'may', 'might', 'must', 'have', 'has', 'had', 'get', 'got',
        // Generic verbs and adverbs that appear in almost any phrasing.
        'need', 'want', 'show', 'showing', 'shows', 'see', 'still', 'just',
        'now', 'here', 'there', 'any', 'all', 'some', 'not', 'only', 'also',
        'again', 'very', 'much', 'many', 'more', 'most', 'such',
    ];

    public function normalize(string $query): array
    {
        $original = trim(preg_replace('/\s+/u', ' ', $query) ?? $query);
        $normalized = Str::lower(Str::ascii($original));
        $normalized = trim(preg_replace('/[^a-z0-9\-\/_\.\s]/', ' ', $normalized) ?? $normalized);
        $normalized = trim(preg_replace('/\s+/', ' ', $normalized) ?? $normalized);
        $tokens = collect(explode(' ', $normalized))
            ->filter(fn ($token) => mb_strlen($token) > 1 && ! in_array($token, self::STOP_WORDS, true))
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
