<?php

declare(strict_types=1);

namespace App\Services\Documents\Contracts;

/**
 * Where on the document a value was found.
 *
 * Coordinates are optional and are never invented: when the provider returns no
 * bounding box, the box stays null and the UI shows a "source location
 * unavailable" state rather than highlighting an arbitrary region.
 */
final readonly class FieldEvidence
{
    /**
     * @param array{x: float, y: float, width: float, height: float}|null $boundingBox
     */
    public function __construct(
        public ?int $page = null,
        public ?string $text = null,
        public ?array $boundingBox = null,
    ) {}

    public static function fromArray(mixed $data): ?self
    {
        if (! is_array($data)) {
            return null;
        }

        $page = isset($data['page']) && is_numeric($data['page']) ? (int) $data['page'] : null;
        $text = isset($data['text']) && is_string($data['text'])
            ? mb_substr(trim($data['text']), 0, 300)
            : null;

        if ($page === null && $text === null) {
            return null;
        }

        return new self($page, $text, self::normalizeBox($data['bounding_box'] ?? null));
    }

    public function hasLocation(): bool
    {
        return $this->boundingBox !== null;
    }

    public function toArray(): array
    {
        return [
            'page' => $this->page,
            'text' => $this->text,
            'bounding_box' => $this->boundingBox,
        ];
    }

    /**
     * Accepts a box only when all four numbers are present and in the normalized
     * 0..1 range. A partially specified or out-of-range box is discarded rather
     * than coerced, since a wrong highlight is worse than none.
     */
    private static function normalizeBox(mixed $box): ?array
    {
        if (! is_array($box)) {
            return null;
        }

        $keys = ['x', 'y', 'width', 'height'];
        $normalized = [];

        foreach ($keys as $key) {
            if (! isset($box[$key]) || ! is_numeric($box[$key])) {
                return null;
            }

            $value = (float) $box[$key];

            if ($value < 0 || $value > 1) {
                return null;
            }

            $normalized[$key] = $value;
        }

        return $normalized;
    }
}
