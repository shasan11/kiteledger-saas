<?php

declare(strict_types=1);

namespace App\Services\Documents\Matching;

use App\Models\Contact;
use Illuminate\Support\Collection;

/**
 * Matches an extracted supplier/customer name to a tenant contact.
 *
 * Deliberately ordered strongest-evidence-first. A tax-number match is a fact;
 * a name similarity is a guess. Ranking them together on one blended score
 * would let a close-looking name outrank an exact identifier.
 *
 * Never creates a contact and never auto-selects a weak match: an invented
 * supplier on a purchase bill is a real accounting problem.
 */
final class PartyMatcher
{
    // Name normalization and similarity are shared with the product and
    // account matchers so all three agree on what "the same name" means.
    use MatchesNames;

    /**
     * @param array{name?: ?string, tax_number?: ?string, email?: ?string, phone?: ?string} $party
     * @param string|null $role 'supplier' or 'customer' when the schema knows it
     * @return MatchCandidate[] ranked, best first
     */
    public function match(array $party, ?string $role = null, int $limit = 5): array
    {
        $name = $this->cleanValue($party['name'] ?? null);
        $taxNumber = $this->cleanValue($party['tax_number'] ?? null);
        $email = $this->cleanValue($party['email'] ?? null);
        $phone = $this->digits($party['phone'] ?? null);

        if ($name === null && $taxNumber === null && $email === null && $phone === null) {
            return [];
        }

        $contacts = $this->candidatePool($role);
        $candidates = [];

        foreach ($contacts as $contact) {
            $candidate = $this->score($contact, $name, $taxNumber, $email, $phone);

            if ($candidate !== null) {
                $candidates[] = $candidate;
            }
        }

        usort($candidates, static fn (MatchCandidate $a, MatchCandidate $b) => $b->score <=> $a->score);

        return array_slice($candidates, 0, $limit);
    }

    /**
     * Best match only when it is strong enough to stand without review.
     * Returning null is the safe default — an unmatched party becomes a review
     * issue rather than a silently wrong link.
     */
    public function bestMatch(array $party, ?string $role = null): ?MatchCandidate
    {
        $best = $this->match($party, $role, 1)[0] ?? null;

        return $best?->isAutoSelectable() ? $best : null;
    }

    private function score(Contact $contact, ?string $name, ?string $tax, ?string $email, ?string $phone): ?MatchCandidate
    {
        $make = fn (string $reason, float $score) => new MatchCandidate(
            publicId: (string) $contact->id,
            displayName: (string) $contact->name,
            reason: $reason,
            score: $score,
            code: $contact->code,
            taxNumber: $contact->tax_registration_no,
        );

        // 1. Exact code — an operator typed it, so it is authoritative.
        if ($name !== null && $contact->code && strcasecmp(trim($contact->code), $name) === 0) {
            return $make('Matched by contact code', 1.0);
        }

        // 2. Exact tax number.
        if ($tax !== null && $this->codesMatch($tax, $contact->tax_registration_no)) {
            return $make('Matched by tax number', 0.99);
        }

        // 3. Exact email.
        if ($email !== null && $contact->email && strcasecmp(trim($contact->email), $email) === 0) {
            return $make('Matched by email address', 0.97);
        }

        // 4. Phone, compared on the subscriber portion so the same number
        // written with and without a country code still matches.
        if ($phone !== null && $contact->phone && $this->phonesMatch($this->digits($contact->phone), $phone)) {
            return $make('Matched by phone number', 0.96);
        }

        if ($name === null) {
            return null;
        }

        // 5. Exact normalized name.
        $normalizedInput = $this->normalizeName($name);
        $normalizedContact = $this->normalizeName((string) $contact->name);

        if ($normalizedInput !== '' && $normalizedInput === $normalizedContact) {
            return $make('Name matches exactly', 0.95);
        }

        // 6. Controlled fuzzy name similarity — a suggestion, never a decision.
        $similarity = $this->nameSimilarity($normalizedInput, $normalizedContact);

        if ($similarity >= MatchCandidate::suggestionThreshold()) {
            return $make(
                sprintf('Similar name (%d%% match)', (int) round($similarity * 100)),
                // Capped below the auto-select threshold: a fuzzy name match
                // must always be confirmed by a person.
                min($similarity, 0.90),
            );
        }

        return null;
    }

    /**
     * Contacts to compare against, narrowed by role where the schema knows it.
     * Bounded so a large tenant does not load its whole contact book.
     */
    private function candidatePool(?string $role): Collection
    {
        // Contacts use a UUID primary key, which already serves as the public
        // identifier — there is no separate public_id column to select.
        $query = Contact::query()->select([
            'id', 'name', 'code', 'tax_registration_no', 'email', 'phone', 'contact_type',
        ]);

        if ($role === 'supplier') {
            $query->whereIn('contact_type', ['supplier', 'both', 'vendor']);
        } elseif ($role === 'customer') {
            $query->whereIn('contact_type', ['customer', 'both']);
        }

        return $query->limit((int) config('documents.matching.candidate_pool', 2000))->get();
    }

    // normalizeName(), nameSimilarity(), cleanValue() and codesMatch() come
    // from the MatchesNames trait, shared with the product and account matchers.

    /**
     * Two numbers match when their last 9 digits agree.
     *
     * Country codes and trunk prefixes vary between how a supplier prints a
     * number and how it was entered in KiteLedger; the subscriber portion is
     * the stable part. 9 digits is long enough to avoid coincidental matches.
     */
    private function phonesMatch(?string $a, ?string $b): bool
    {
        if ($a === null || $b === null) {
            return false;
        }

        if ($a === $b) {
            return true;
        }

        $length = min(9, strlen($a), strlen($b));

        if ($length < 7) {
            return false;
        }

        return substr($a, -$length) === substr($b, -$length);
    }

    private function digits(?string $value): ?string
    {
        $digits = preg_replace('/\D/', '', (string) $value) ?? '';

        // Too few digits to be a meaningful identity match.
        return strlen($digits) >= 7 ? $digits : null;
    }

}
