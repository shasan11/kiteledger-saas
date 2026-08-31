<?php

declare(strict_types=1);

namespace App\Services\Documents\Pipeline;

/**
 * Parses and validates the model's extraction payload.
 *
 * The rule that matters: malformed output is never silently accepted. A partial
 * or unparseable response becomes an explicit failure the user is told about,
 * because a half-read invoice that looks complete is worse than an honest
 * "could not read this" — the user would approve a draft built from gaps.
 *
 * Exactly one structural repair pass is attempted, and only for damage that can
 * be fixed deterministically (fences, trailing commas, truncated tails). No
 * business value is ever invented during repair.
 */
final class StructuredOutputValidator
{
    /** Keys any usable extraction must be able to yield. */
    private const REQUIRED_ROOT_KEYS = ['document_type'];

    public function validate(string $rawText): StructuredOutputResult
    {
        $decoded = $this->decode($rawText);

        if ($decoded !== null) {
            return $this->check($decoded, repaired: false);
        }

        // One controlled repair pass.
        $repairedText = $this->repair($rawText);
        $decoded = $repairedText !== null ? $this->decode($repairedText) : null;

        if ($decoded === null) {
            return StructuredOutputResult::failed(
                DocumentErrorCode::ExtractionInvalid,
                'The response could not be parsed as structured data.',
            );
        }

        return $this->check($decoded, repaired: true);
    }

    /**
     * @param array<string, mixed> $decoded
     */
    private function check(array $decoded, bool $repaired): StructuredOutputResult
    {
        foreach (self::REQUIRED_ROOT_KEYS as $key) {
            if (! array_key_exists($key, $decoded)) {
                return StructuredOutputResult::failed(
                    DocumentErrorCode::ExtractionInvalid,
                    "The response was missing the '{$key}' field.",
                );
            }
        }

        // A response with no usable content at all is a failure, not an empty
        // but valid document.
        $hasContent = filled($decoded['document_number'] ?? null)
            || filled($decoded['document_date'] ?? null)
            || filled($decoded['party']['name'] ?? null)
            || ! empty($decoded['lines'])
            || ! empty($decoded['totals']);

        if (! $hasContent) {
            return StructuredOutputResult::failed(
                DocumentErrorCode::ExtractionInvalid,
                'No document details could be read from the response.',
            );
        }

        $partial = $this->looksPartial($decoded);

        return StructuredOutputResult::succeeded(
            data: $decoded,
            repaired: $repaired,
            partial: $partial,
        );
    }

    /**
     * Flags output that parsed but is visibly incomplete, so the user is warned
     * rather than shown a confident-looking half-extraction.
     */
    private function looksPartial(array $decoded): bool
    {
        if (! empty($decoded['truncated'])) {
            return true;
        }

        $lines = $decoded['lines'] ?? [];

        if (is_array($lines) && $lines !== []) {
            foreach ($lines as $line) {
                if (! is_array($line)) {
                    return true;
                }
            }
        }

        return false;
    }

    /** @return array<string, mixed>|null */
    private function decode(string $text): ?array
    {
        $text = trim($text);

        if ($text === '') {
            return null;
        }

        $decoded = json_decode($text, true);

        return is_array($decoded) ? $decoded : null;
    }

    /**
     * Deterministic structural repair only.
     *
     * Strips markdown fences, isolates the outermost JSON object, removes
     * trailing commas, and closes brackets left open by a truncated response.
     * It never adds a key or a value.
     */
    private function repair(string $text): ?string
    {
        $text = trim($text);

        if ($text === '') {
            return null;
        }

        // ```json ... ```
        if (str_starts_with($text, '```')) {
            $text = trim((string) preg_replace('/^```(?:json)?\s*|\s*```$/m', '', $text));
        }

        // Prose before or after the object.
        $start = strpos($text, '{');

        if ($start === false) {
            return null;
        }

        $end = strrpos($text, '}');
        $text = $end !== false && $end > $start
            ? substr($text, $start, $end - $start + 1)
            : substr($text, $start);

        // Trailing commas before a closing brace or bracket.
        $text = (string) preg_replace('/,\s*([}\]])/', '$1', $text);

        return $this->closeUnbalanced($text);
    }

    /**
     * Closes brackets left open by a response that was cut off mid-write.
     * Bracket depth is tracked outside string literals so braces inside values
     * are not miscounted.
     */
    private function closeUnbalanced(string $text): string
    {
        $stack = [];
        $inString = false;
        $escaped = false;

        foreach (str_split($text) as $char) {
            if ($escaped) {
                $escaped = false;
                continue;
            }

            if ($char === '\\') {
                $escaped = true;
                continue;
            }

            if ($char === '"') {
                $inString = ! $inString;
                continue;
            }

            if ($inString) {
                continue;
            }

            if ($char === '{' || $char === '[') {
                $stack[] = $char;
            } elseif ($char === '}' || $char === ']') {
                array_pop($stack);
            }
        }

        if ($inString) {
            $text .= '"';
        }

        // Drop a dangling key or comma the cut-off left behind.
        $text = (string) preg_replace('/,\s*$/', '', rtrim($text));
        $text = (string) preg_replace('/"[^"]*"\s*:\s*$/', '', rtrim($text));
        $text = (string) preg_replace('/,\s*$/', '', rtrim($text));

        foreach (array_reverse($stack) as $open) {
            $text .= $open === '{' ? '}' : ']';
        }

        return $text;
    }
}
