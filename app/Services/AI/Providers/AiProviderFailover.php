<?php

declare(strict_types=1);

namespace App\Services\AI\Providers;

use App\Services\AI\AiProviderException;
use App\Services\AI\AiSettingsService;
use Illuminate\Support\Facades\Log;
use Throwable;

/**
 * Runs a provider call, falling back to a spare provider once when — and only
 * when — the failure was an infrastructure problem.
 *
 * Three properties matter and are each enforced here rather than left to the
 * caller:
 *
 *  1. Failover happens for retryable infrastructure errors only. A bad API key
 *     or an unsupported capability fails immediately on the primary, because
 *     the fallback would fail identically and the administrator needs the real
 *     cause, not a second copy of it.
 *  2. There is exactly one fallback attempt. A chain that keeps trying turns a
 *     provider outage into a multiplied bill and a request that never returns.
 *  3. Which provider actually answered is recorded, so an unexplained change in
 *     answer quality or cost can be traced afterwards.
 */
final class AiProviderFailover
{
    public function __construct(
        private readonly AiSettingsService $settings,
        private readonly AiProviderCapabilityRegistry $capabilities,
    ) {}

    public function isConfigured(): bool
    {
        return $this->fallbackProvider() !== null;
    }

    /**
     * The configured fallback provider, or null when none is usable.
     *
     * A fallback that is not credentialed, or that is the primary under another
     * name, is treated as absent — reporting it as configured would promise a
     * resilience the deployment does not have.
     */
    public function fallbackProvider(): ?string
    {
        $provider = strtolower(trim((string) config('ai.fallback.provider', '')));

        if ($provider === '' || $provider === strtolower($this->settings->provider())) {
            return null;
        }

        if (! $this->capabilities->supports($provider)) {
            return null;
        }

        $needsKey = $provider !== 'ollama';

        return (! $needsKey || filled($this->settings->apiKeyFor($provider))) ? $provider : null;
    }

    public function fallbackModel(): ?string
    {
        $model = trim((string) config('ai.fallback.model', ''));

        return $model === '' ? null : $model;
    }

    /**
     * Runs $primary, and on a retryable failure runs $fallback once.
     *
     * $fallback receives the provider and model it should use. The returned
     * array is whatever the callable produced, with `provider_used` and
     * `failover_used` merged in so the caller can log which side answered
     * without inspecting the provider itself.
     *
     * @param  callable(): array<string, mixed>  $primary
     * @param  callable(string, string): array<string, mixed>  $fallback
     * @return array<string, mixed>
     */
    public function run(callable $primary, callable $fallback): array
    {
        $primaryProvider = $this->settings->provider();

        try {
            return array_merge($primary(), [
                'provider_used' => $primaryProvider,
                'failover_used' => false,
            ]);
        } catch (Throwable $e) {
            $class = $this->classify($e);
            $provider = $this->fallbackProvider();
            $model = $this->fallbackModel();

            if (! $class->shouldFailover() || $provider === null || $model === null) {
                throw $e;
            }

            // The primary's failure is recorded even when the fallback saves
            // the request: a provider failing repeatedly is an operational
            // signal that a successful answer would otherwise hide.
            Log::warning('AI provider failed over.', [
                'from' => $primaryProvider,
                'to' => $provider,
                'reason' => $this->safeReason($e),
            ]);

            try {
                return array_merge($fallback($provider, $model), [
                    'provider_used' => $provider,
                    'failover_used' => true,
                ]);
            } catch (Throwable $fallbackError) {
                // One attempt only. The primary's error is the one surfaced,
                // because it describes the deployment's actual configuration;
                // the fallback's is logged for diagnosis.
                Log::warning('AI fallback provider also failed.', [
                    'provider' => $provider,
                    'reason' => $this->safeReason($fallbackError),
                ]);

                throw $e;
            }
        }
    }

    private function classify(Throwable $e): AiFailureClass
    {
        if ($e instanceof AiProviderException) {
            return AiFailureClass::fromErrorCode($e->getErrorCode());
        }

        if (method_exists($e, 'getErrorCode')) {
            $code = (string) $e->getErrorCode();

            if ($code !== '') {
                return AiFailureClass::fromErrorCode($code);
            }
        }

        return AiFailureClass::fromMessage($e->getMessage());
    }

    /** Log text with any credential-shaped fragment removed. */
    private function safeReason(Throwable $e): string
    {
        $message = (string) preg_replace(
            ['/sk-[A-Za-z0-9_\-]{8,}/', '/Bearer\s+\S+/i', '/api[_-]?key["\'\s:=]+\S+/i'],
            '[redacted]',
            $e->getMessage(),
        );

        return mb_substr($message, 0, 300);
    }
}
