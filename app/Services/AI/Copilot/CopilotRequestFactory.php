<?php

declare(strict_types=1);

namespace App\Services\AI\Copilot;

use App\Models\AiConversation;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

/**
 * Builds a trusted CopilotRequest from an HTTP request.
 *
 * This is the trust boundary. Only the message text and a whitelisted, tag- and
 * length-stripped context payload survive from the client; scope comes entirely
 * from CopilotContextFactory, which derives it server-side.
 */
final class CopilotRequestFactory
{
    /** Client-supplied payload keys that may influence a request. */
    private const ALLOWED_PAYLOAD_KEYS = [
        'module', 'url', 'record_type', 'record_number',
        'customer_reference', 'supplier_reference', 'date_from', 'date_to',
        'status', 'private', 'filters',
    ];

    public function __construct(
        private readonly CopilotContextFactory $contexts,
    ) {}

    /**
     * @param array<string, mixed> $validated
     */
    public function make(Request $request, array $validated, ?AiConversation $conversation): CopilotRequest
    {
        $payload = $this->sanitizePayload($validated['context_payload'] ?? []);
        $contextType = (string) ($validated['context_type'] ?? 'auto');

        if ($contextType === 'auto') {
            $contextType = 'general';
        }

        $context = $this->contexts->make($request, $conversation, $contextType);

        return new CopilotRequest(
            user: $context->user,
            message: trim((string) $validated['message']),
            conversation: $conversation,
            context: $context,
            contextType: $contextType,
            safeContextPayload: $payload,
            allowCache: (bool) ($validated['cache'] ?? true),
            requestId: (string) Str::uuid(),
        );
    }

    /**
     * @param mixed $payload
     * @return array<string, mixed>
     */
    private function sanitizePayload(mixed $payload): array
    {
        if (! is_array($payload)) {
            return [];
        }

        $payload = array_intersect_key($payload, array_flip(self::ALLOWED_PAYLOAD_KEYS));

        $clean = [];

        foreach ($payload as $key => $value) {
            if (is_string($value)) {
                $clean[$key] = mb_substr(strip_tags($value), 0, 500);
            } elseif (is_bool($value) || is_int($value) || is_float($value)) {
                $clean[$key] = $value;
            } elseif (is_array($value)) {
                $clean[$key] = array_slice(array_map(
                    static fn ($item) => is_string($item) ? mb_substr(strip_tags($item), 0, 200) : $item,
                    array_filter($value, static fn ($item) => is_scalar($item)),
                ), 0, 30);
            }
        }

        return $clean;
    }
}
