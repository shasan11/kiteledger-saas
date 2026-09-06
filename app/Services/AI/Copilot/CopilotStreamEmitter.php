<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

/**
 * Transport-agnostic sink for Copilot progress.
 *
 * The orchestrator emits stages and token deltas through this rather than
 * writing SSE frames itself, so the same execution path serves the streaming
 * endpoint and the plain JSON endpoint. The JSON path simply passes no emitter
 * and receives an identical CopilotOutcome.
 */
interface CopilotStreamEmitter
{
    /**
     * A human-readable milestone. Labels are user-facing and must never expose
     * infrastructure vocabulary (embeddings, vector search, LLM, tool names).
     */
    public function stage(string $stage, string $label): void;

    /** An incremental fragment of the answer text. */
    public function delta(string $text): void;
}
