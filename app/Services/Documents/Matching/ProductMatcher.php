<?php

declare(strict_types=1);

namespace App\Services\Documents\Matching;

use App\Models\Product;

/**
 * Matches an extracted line item to a catalogue product.
 *
 * Ordered strongest-first: barcode and SKU are printed identifiers, a
 * description is prose. Line descriptions are frequently abbreviated or
 * reworded by the supplier, so a fuzzy description match is only ever a
 * suggestion — silently binding the wrong product would move stock and cost
 * against the wrong item.
 */
final class ProductMatcher
{
    use MatchesNames;

    /** Packaging words that appear on invoices but are not part of the name. */
    private const PRODUCT_NOISE = ['pcs', 'pc', 'unit', 'units', 'box', 'pack', 'set', 'nos', 'no'];

    /**
     * @param array{name?: ?string, code?: ?string, barcode?: ?string, description?: ?string} $line
     * @return MatchCandidate[] ranked, best first
     */
    public function match(array $line, int $limit = 5): array
    {
        $name = $this->cleanValue($line['name'] ?? $line['description'] ?? null);
        $code = $this->cleanValue($line['code'] ?? null);
        $barcode = $this->cleanValue($line['barcode'] ?? null);

        if ($name === null && $code === null && $barcode === null) {
            return [];
        }

        $products = Product::query()
            ->select(['id', 'name', 'code', 'sku', 'barcode'])
            ->limit((int) config('documents.matching.candidate_pool', 2000))
            ->get();

        $candidates = [];

        foreach ($products as $product) {
            $candidate = $this->score($product, $name, $code, $barcode);

            if ($candidate !== null) {
                $candidates[] = $candidate;
            }
        }

        usort($candidates, static fn (MatchCandidate $a, MatchCandidate $b) => $b->score <=> $a->score);

        return array_slice($candidates, 0, $limit);
    }

    /** Only an exact printed identifier is strong enough to bind without review. */
    public function bestMatch(array $line): ?MatchCandidate
    {
        $best = $this->match($line, 1)[0] ?? null;

        return $best?->isAutoSelectable() ? $best : null;
    }

    private function score(Product $product, ?string $name, ?string $code, ?string $barcode): ?MatchCandidate
    {
        $make = fn (string $reason, float $score) => new MatchCandidate(
            publicId: (string) $product->id,
            displayName: (string) $product->name,
            reason: $reason,
            score: $score,
            code: $product->code ?? $product->sku,
        );

        if ($this->codesMatch($barcode, $product->barcode)) {
            return $make('Matched by barcode', 1.0);
        }

        if ($this->codesMatch($code, $product->sku)) {
            return $make('Matched by SKU', 0.99);
        }

        if ($this->codesMatch($code, $product->code)) {
            return $make('Matched by product code', 0.98);
        }

        // A bare name that happens to equal a product code still identifies it.
        if ($this->codesMatch($name, $product->code) || $this->codesMatch($name, $product->sku)) {
            return $make('Matched by product code', 0.96);
        }

        if ($name === null) {
            return null;
        }

        $normalizedInput = $this->normalizeName($name, self::PRODUCT_NOISE);
        $normalizedProduct = $this->normalizeName((string) $product->name, self::PRODUCT_NOISE);

        if ($normalizedInput !== '' && $normalizedInput === $normalizedProduct) {
            return $make('Name matches exactly', 0.95);
        }

        $similarity = $this->nameSimilarity($normalizedInput, $normalizedProduct);

        if ($similarity >= MatchCandidate::suggestionThreshold()) {
            return $make(
                sprintf('Similar description (%d%% match)', (int) round($similarity * 100)),
                // Capped below auto-select: a description is not an identifier.
                min($similarity, 0.90),
            );
        }

        return null;
    }
}
