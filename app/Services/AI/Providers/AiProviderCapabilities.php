<?php

declare(strict_types=1);

namespace App\Services\AI\Providers;

/**
 * What one provider/model pair can actually do.
 *
 * Every capability is stated rather than inferred at the call site, so the
 * settings screen, the readiness check and the runtime all answer the same
 * question the same way.
 */
final readonly class AiProviderCapabilities
{
    public function __construct(
        public bool $chat = false,
        public bool $tools = false,
        public bool $structuredOutput = false,
        public bool $embeddings = false,
        public bool $batchEmbeddings = false,
        public bool $streaming = false,
        public bool $visionImages = false,
        public bool $pdf = false,
    ) {}

    public static function none(): self
    {
        return new self;
    }

    /** Whether a document scan can run on this pair: it needs both inputs. */
    public function canReadDocuments(): bool
    {
        return $this->visionImages && $this->pdf;
    }

    /** @return array<string, bool> */
    public function toArray(): array
    {
        return [
            'chat' => $this->chat,
            'tools' => $this->tools,
            'structured_output' => $this->structuredOutput,
            'embeddings' => $this->embeddings,
            'batch_embeddings' => $this->batchEmbeddings,
            'streaming' => $this->streaming,
            'vision_images' => $this->visionImages,
            'pdf' => $this->pdf,
        ];
    }

    /**
     * User-facing explanation of what a selected model cannot do.
     *
     * Phrased as a consequence rather than a missing feature flag: an
     * administrator needs to know that document scanning will not work, not
     * that a boolean is false.
     *
     * @return string[]
     */
    public function limitations(): array
    {
        $limitations = [];

        if (! $this->chat) {
            $limitations[] = 'This model cannot answer questions, so the Copilot will not work.';
        }

        if ($this->chat && ! $this->tools) {
            $limitations[] = 'This model cannot use KiteLedger data tools, so the Copilot can explain how the app works but cannot report your figures.';
        }

        if ($this->chat && ! $this->streaming) {
            $limitations[] = 'This model does not stream, so answers appear all at once instead of as they are written.';
        }

        if (! $this->canReadDocuments()) {
            $limitations[] = 'This model cannot read uploaded documents, so document scanning is unavailable.';
        }

        return $limitations;
    }
}
