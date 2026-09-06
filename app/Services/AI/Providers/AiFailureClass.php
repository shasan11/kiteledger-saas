<?php

declare(strict_types=1);

namespace App\Services\AI\Providers;

/**
 * Why a provider call failed, and therefore what to do about it.
 *
 * The distinction is the whole point of controlled failover. Retrying an
 * overloaded provider on a spare one recovers a request that would otherwise
 * be lost. Retrying an invalid API key, an unsupported capability or a
 * malformed request just spends money and time to fail identically on the
 * second provider — and hides the real cause from the administrator who needs
 * to fix it.
 */
enum AiFailureClass: string
{
    /** Infrastructure trouble: the same request may well succeed elsewhere. */
    case Retryable = 'retryable';

    /** Configuration or input is wrong; another provider will fail too. */
    case Permanent = 'permanent';

    public function shouldFailover(): bool
    {
        return $this === self::Retryable;
    }

    /**
     * Classifies a provider error code.
     *
     * Unknown codes are treated as permanent. Failing over on anything
     * unrecognized would turn every new error the vendor invents into a
     * doubled bill and a doubled wait.
     */
    public static function fromErrorCode(string $code): self
    {
        return match (strtoupper(trim($code))) {
            'AI_TIMEOUT',
            'AI_RATE_LIMIT',
            'AI_PROVIDER_OVERLOADED',
            'AI_PROVIDER_UNAVAILABLE',
            'AI_RETRIEVAL_UNAVAILABLE',
            'AI_NETWORK_ERROR',
            'AI_SERVER_ERROR' => self::Retryable,
            default => self::Permanent,
        };
    }

    /**
     * Classifies from a raw error message when no code is available.
     *
     * Status codes are matched on word boundaries: a bare needle for "500"
     * also matches a currency amount such as 1500 inside an error body.
     */
    public static function fromMessage(string $message): self
    {
        $text = strtolower($message);
        $hasStatus = static fn (string $status): bool => (bool) preg_match('/\b'.$status.'\b/', $text);

        // Authentication and capability failures are checked first: a 401 body
        // can also mention "unavailable", and misreading it as retryable would
        // send a bad key to the fallback provider too.
        if ($hasStatus('401') || $hasStatus('403')
            || str_contains($text, 'invalid api key')
            || str_contains($text, 'incorrect api key')
            || str_contains($text, 'unauthorized')
            || str_contains($text, 'does not support')
            || str_contains($text, 'invalid model')
            || str_contains($text, 'model not found')) {
            return self::Permanent;
        }

        if ($hasStatus('429')
            || $hasStatus('500') || $hasStatus('502') || $hasStatus('503') || $hasStatus('504')
            || str_contains($text, 'rate limit')
            || str_contains($text, 'overloaded')
            || str_contains($text, 'timed out')
            || str_contains($text, 'timeout')
            || str_contains($text, 'temporarily unavailable')
            || str_contains($text, 'connection reset')
            || str_contains($text, 'could not resolve host')) {
            return self::Retryable;
        }

        return self::Permanent;
    }
}
