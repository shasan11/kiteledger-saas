<?php

declare(strict_types=1);

namespace App\Services\Documents\Matching;

use App\Models\Account;

/**
 * Matches an extracted account hint to a chart-of-accounts entry.
 *
 * Held to a stricter standard than other matchers: posting to the wrong ledger
 * account misstates the accounts rather than merely mislabelling a line. Only
 * an exact account code or an exact normalized name is ever auto-selectable —
 * a similar-sounding expense name is always offered for confirmation.
 */
final class AccountMatcher
{
    use MatchesNames;

    /** Words common to many account names that carry little identifying value. */
    private const ACCOUNT_NOISE = ['account', 'accounts', 'ac', 'a', 'general'];

    /**
     * @return MatchCandidate[] ranked, best first
     */
    public function match(?string $hint, int $limit = 5): array
    {
        $hint = $this->cleanValue($hint);

        if ($hint === null) {
            return [];
        }

        $accounts = Account::query()
            ->select(['id', 'name', 'code'])
            ->limit((int) config('documents.matching.candidate_pool', 2000))
            ->get();

        $candidates = [];

        foreach ($accounts as $account) {
            $candidate = $this->score($account, $hint);

            if ($candidate !== null) {
                $candidates[] = $candidate;
            }
        }

        usort($candidates, static fn (MatchCandidate $a, MatchCandidate $b) => $b->score <=> $a->score);

        return array_slice($candidates, 0, $limit);
    }

    public function bestMatch(?string $hint): ?MatchCandidate
    {
        $best = $this->match($hint, 1)[0] ?? null;

        return $best?->isAutoSelectable() ? $best : null;
    }

    private function score(Account $account, string $hint): ?MatchCandidate
    {
        $make = fn (string $reason, float $score) => new MatchCandidate(
            publicId: (string) $account->id,
            displayName: (string) $account->name,
            reason: $reason,
            score: $score,
            code: $account->code,
        );

        if ($this->codesMatch($hint, $account->code)) {
            return $make('Matched by account code', 1.0);
        }

        $normalizedHint = $this->normalizeName($hint, self::ACCOUNT_NOISE);
        $normalizedAccount = $this->normalizeName((string) $account->name, self::ACCOUNT_NOISE);

        if ($normalizedHint !== '' && $normalizedHint === $normalizedAccount) {
            return $make('Account name matches exactly', 0.96);
        }

        $similarity = $this->nameSimilarity($normalizedHint, $normalizedAccount);

        if ($similarity >= MatchCandidate::suggestionThreshold()) {
            return $make(
                sprintf('Similar account name (%d%% match)', (int) round($similarity * 100)),
                // Deliberately well below auto-select. Choosing a ledger account
                // is an accounting decision, not a text-matching one.
                min($similarity, 0.85),
            );
        }

        return null;
    }
}
