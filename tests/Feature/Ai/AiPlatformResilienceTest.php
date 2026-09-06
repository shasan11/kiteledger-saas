<?php

declare(strict_types=1);

namespace Tests\Feature\Ai;

use App\Models\AiUsageLog;
use App\Services\AI\AiProviderException;
use App\Services\AI\AiReadinessService;
use App\Services\AI\AiSettingsService;
use App\Services\AI\AiUsageLogger;
use App\Services\AI\Providers\AiFailureClass;
use App\Services\AI\Providers\AiProviderCapabilityRegistry;
use App\Services\AI\Providers\AiProviderFailover;
use Illuminate\Foundation\Testing\RefreshDatabase;
use RuntimeException;
use Tests\TestCase;

/**
 * Phase 5: one capability registry, controlled failover, structured telemetry
 * and an operator health view.
 */
class AiPlatformResilienceTest extends TestCase
{
    use RefreshDatabase;

    // ---------- Capability registry ----------

    public function test_capabilities_combine_the_provider_ceiling_and_the_model(): void
    {
        $registry = app(AiProviderCapabilityRegistry::class);

        $vision = $registry->for('openai', 'gpt-4o');
        $this->assertTrue($vision->chat);
        $this->assertTrue($vision->tools);
        $this->assertTrue($vision->canReadDocuments());

        // Same provider, a model that cannot see.
        $textOnly = $registry->for('openai', 'gpt-3.5-turbo');
        $this->assertTrue($textOnly->chat);
        $this->assertFalse($textOnly->visionImages);
        $this->assertFalse($textOnly->canReadDocuments());
    }

    public function test_an_embedding_model_is_never_reported_as_a_chat_model(): void
    {
        // Reporting both would let the settings screen accept a combination
        // that fails on the very first request.
        $capabilities = app(AiProviderCapabilityRegistry::class)
            ->for('openai', 'text-embedding-3-small');

        $this->assertFalse($capabilities->chat);
        $this->assertFalse($capabilities->tools);
        $this->assertFalse($capabilities->streaming);
    }

    public function test_a_provider_without_embeddings_is_reported_as_such(): void
    {
        $registry = app(AiProviderCapabilityRegistry::class);

        $this->assertFalse($registry->providerSupportsEmbeddings('anthropic'));
        $this->assertFalse($registry->providerSupportsEmbeddings('groq'));
        $this->assertTrue($registry->providerSupportsEmbeddings('openai'));
    }

    public function test_an_unknown_provider_gets_no_capabilities_rather_than_a_permissive_default(): void
    {
        // A capability the platform cannot vouch for must not enable a feature
        // that will fail at the first real request.
        $capabilities = app(AiProviderCapabilityRegistry::class)->for('some-new-vendor', 'their-model');

        $this->assertFalse($capabilities->chat);
        $this->assertFalse($capabilities->embeddings);
        $this->assertFalse($capabilities->canReadDocuments());
        $this->assertFalse(app(AiProviderCapabilityRegistry::class)->supports('some-new-vendor'));
    }

    public function test_settings_and_readiness_cannot_disagree_about_embeddings(): void
    {
        /*
         * The contradiction being closed: AiSettingsService kept its own list
         * of embedding-capable providers while AiReadinessService inferred
         * capabilities separately, so the settings screen could accept a
         * configuration readiness then refused.
         */
        $registry = app(AiProviderCapabilityRegistry::class);
        $settings = app(AiSettingsService::class);

        // Compared against the provider settings actually resolves, not against
        // a config key: embeddingProvider() prefers the stored platform setting,
        // so asserting on the config value alone would compare two different
        // providers and pass or fail for the wrong reason.
        $resolved = $settings->embeddingProvider();

        $this->assertSame(
            $registry->providerSupportsEmbeddings($resolved),
            $settings->supportsEmbeddings(),
            "Settings and the registry disagree about {$resolved}.",
        );

        $this->assertSame(
            $registry->providerSupportsBatchEmbeddings($resolved),
            $settings->supportsBatchEmbeddings(),
            "Batch support disagrees about {$resolved}.",
        );

        // And the registry itself must be internally consistent: a provider
        // that cannot embed cannot batch-embed either.
        foreach ($registry->providers() as $provider) {
            if (! $registry->providerSupportsEmbeddings($provider)) {
                $this->assertFalse(
                    $registry->providerSupportsBatchEmbeddings($provider),
                    "{$provider} claims batch embeddings without embeddings.",
                );
            }
        }
    }

    public function test_limitations_are_explained_as_consequences_not_feature_flags(): void
    {
        $limitations = app(AiProviderCapabilityRegistry::class)
            ->for('groq', 'llama-3.1-8b-instant')
            ->limitations();

        $this->assertNotEmpty($limitations);
        $this->assertStringContainsString('document scanning', implode(' ', $limitations));

        // An administrator needs the consequence, not a boolean name.
        $this->assertStringNotContainsString('vision_images', implode(' ', $limitations));
        $this->assertStringNotContainsString('false', implode(' ', $limitations));
    }

    // ---------- Failure classification ----------

    public function test_infrastructure_failures_are_retryable(): void
    {
        foreach (['AI_TIMEOUT', 'AI_RATE_LIMIT', 'AI_PROVIDER_OVERLOADED', 'AI_PROVIDER_UNAVAILABLE'] as $code) {
            $this->assertTrue(
                AiFailureClass::fromErrorCode($code)->shouldFailover(),
                "{$code} should fail over.",
            );
        }
    }

    public function test_configuration_failures_are_never_retried_on_another_provider(): void
    {
        // A bad key or an unsupported capability fails identically on the
        // fallback; retrying spends money and hides the real cause.
        foreach ([
            'AI_PROVIDER_AUTH_FAILED',
            'AI_API_KEY_MISSING',
            'AI_MODEL_INVALID',
            'AI_EMBEDDINGS_UNSUPPORTED',
            'AI_PERMISSION_DENIED',
        ] as $code) {
            $this->assertFalse(
                AiFailureClass::fromErrorCode($code)->shouldFailover(),
                "{$code} must not fail over.",
            );
        }
    }

    public function test_an_unrecognised_error_code_is_treated_as_permanent(): void
    {
        // Failing over on anything unknown turns every new vendor error into a
        // doubled bill and a doubled wait.
        $this->assertFalse(AiFailureClass::fromErrorCode('AI_SOMETHING_NEW')->shouldFailover());
    }

    public function test_an_auth_failure_is_not_misread_as_retryable_from_its_message(): void
    {
        // A 401 body can also mention "unavailable"; misreading it would send a
        // bad key to the fallback too.
        $this->assertSame(
            AiFailureClass::Permanent,
            AiFailureClass::fromMessage('HTTP 401: Incorrect API key provided. Service unavailable to you.'),
        );
    }

    public function test_a_status_code_is_matched_on_a_word_boundary(): void
    {
        // A bare needle for "500" also matches a currency amount in an error body.
        $this->assertSame(
            AiFailureClass::Permanent,
            AiFailureClass::fromMessage('Invalid request: amount 1500 exceeds the limit'),
        );

        $this->assertSame(
            AiFailureClass::Retryable,
            AiFailureClass::fromMessage('HTTP 503 Service Temporarily Unavailable'),
        );
    }

    // ---------- Failover behaviour ----------

    private function configureFallback(string $provider = 'gemini', string $model = 'gemini-2.5-flash'): void
    {
        config([
            'ai.fallback.provider' => $provider,
            'ai.fallback.model' => $model,
            'ai.providers.gemini.api_key' => 'fallback-key',
        ]);
    }

    public function test_a_retryable_failure_is_answered_by_the_fallback_provider(): void
    {
        $this->configureFallback();

        $result = app(AiProviderFailover::class)->run(
            primary: fn () => throw new AiProviderException('overloaded', 'AI_PROVIDER_OVERLOADED'),
            fallback: fn (string $provider, string $model) => ['text' => 'answered by spare', 'model' => $model],
        );

        $this->assertSame('answered by spare', $result['text']);
        $this->assertTrue($result['failover_used']);
        $this->assertSame('gemini', $result['provider_used']);
    }

    public function test_a_permanent_failure_is_surfaced_without_trying_the_fallback(): void
    {
        $this->configureFallback();
        $fallbackCalled = false;

        try {
            app(AiProviderFailover::class)->run(
                primary: fn () => throw new AiProviderException('bad key', 'AI_PROVIDER_AUTH_FAILED'),
                fallback: function () use (&$fallbackCalled) {
                    $fallbackCalled = true;

                    return ['text' => 'should not happen'];
                },
            );
            $this->fail('A permanent failure must propagate.');
        } catch (AiProviderException $e) {
            $this->assertSame('AI_PROVIDER_AUTH_FAILED', $e->getErrorCode());
        }

        $this->assertFalse($fallbackCalled, 'A bad API key must never reach the fallback provider.');
    }

    public function test_there_is_exactly_one_fallback_attempt(): void
    {
        // A chain that keeps trying turns a provider outage into a multiplied
        // bill and a request that never returns.
        $this->configureFallback();
        $attempts = 0;

        try {
            app(AiProviderFailover::class)->run(
                primary: fn () => throw new AiProviderException('timeout', 'AI_TIMEOUT'),
                fallback: function () use (&$attempts) {
                    $attempts++;

                    throw new AiProviderException('timeout', 'AI_TIMEOUT');
                },
            );
            $this->fail('Both providers failing must propagate.');
        } catch (AiProviderException) {
            // Expected.
        }

        $this->assertSame(1, $attempts);
    }

    public function test_the_primary_error_is_the_one_surfaced_when_both_fail(): void
    {
        // The primary's error describes the deployment's actual configuration;
        // the fallback's would send an administrator to the wrong provider.
        $this->configureFallback();

        try {
            app(AiProviderFailover::class)->run(
                primary: fn () => throw new AiProviderException('primary is down', 'AI_PROVIDER_UNAVAILABLE'),
                fallback: fn () => throw new AiProviderException('spare is down', 'AI_TIMEOUT'),
            );
            $this->fail('Expected an exception.');
        } catch (AiProviderException $e) {
            $this->assertSame('AI_PROVIDER_UNAVAILABLE', $e->getErrorCode());
        }
    }

    public function test_a_successful_primary_records_that_no_failover_happened(): void
    {
        $this->configureFallback();

        $result = app(AiProviderFailover::class)->run(
            primary: fn () => ['text' => 'fine'],
            fallback: fn () => ['text' => 'unused'],
        );

        $this->assertFalse($result['failover_used']);
        $this->assertNotEmpty($result['provider_used']);
    }

    public function test_failover_is_unconfigured_when_no_spare_provider_is_set(): void
    {
        config(['ai.fallback.provider' => '', 'ai.fallback.model' => '']);

        $this->assertFalse(app(AiProviderFailover::class)->isConfigured());

        // A retryable failure still propagates rather than hanging.
        $this->expectException(AiProviderException::class);

        app(AiProviderFailover::class)->run(
            primary: fn () => throw new AiProviderException('timeout', 'AI_TIMEOUT'),
            fallback: fn () => ['text' => 'unreachable'],
        );
    }

    public function test_a_fallback_without_credentials_is_reported_as_unconfigured(): void
    {
        // Reporting it as configured would promise resilience the deployment
        // does not have.
        config([
            'ai.fallback.provider' => 'anthropic',
            'ai.fallback.model' => 'claude-sonnet-4',
            'ai.providers.anthropic.api_key' => '',
        ]);

        $this->assertFalse(app(AiProviderFailover::class)->isConfigured());
    }

    public function test_a_fallback_equal_to_the_primary_is_not_a_fallback(): void
    {
        config([
            'ai.fallback.provider' => app(AiSettingsService::class)->provider(),
            'ai.fallback.model' => 'gpt-4o',
        ]);

        $this->assertFalse(app(AiProviderFailover::class)->isConfigured());
    }

    public function test_a_non_provider_exception_is_classified_from_its_message(): void
    {
        $this->configureFallback();

        $result = app(AiProviderFailover::class)->run(
            primary: fn () => throw new RuntimeException('cURL error: Connection reset by peer'),
            fallback: fn (string $provider, string $model) => ['text' => 'recovered'],
        );

        $this->assertTrue($result['failover_used']);
    }

    // ---------- Telemetry ----------

    public function test_structured_telemetry_is_persisted(): void
    {
        app(AiUsageLogger::class)->log([
            'module' => 'general',
            'feature' => 'copilot',
            'request_id' => 'req-123',
            'status' => 'success',
            'provider' => 'openai',
            'fallback_provider' => 'gemini',
            'error_code' => null,
            'cache_hit' => true,
            'duration_ms' => 2400,
            'first_token_ms' => 850,
            'retrieval_ms' => 120,
            'retrieval_source_count' => 4,
            'document_page_count' => 12,
        ]);

        $log = AiUsageLog::query()->latest('id')->first();

        $this->assertSame('req-123', $log->request_id);
        $this->assertSame('copilot', $log->feature);
        $this->assertSame('gemini', $log->fallback_provider);
        $this->assertTrue($log->cache_hit);
        $this->assertSame(850, $log->first_token_ms);
        $this->assertSame(120, $log->retrieval_ms);
        $this->assertSame(4, $log->retrieval_source_count);
        $this->assertSame(12, $log->document_page_count);
    }

    public function test_existing_callers_keep_working_without_the_new_fields(): void
    {
        // Every telemetry field is optional; a null means "not measured here",
        // not a broken write.
        app(AiUsageLogger::class)->log(['module' => 'general', 'status' => 'success']);

        $log = AiUsageLog::query()->latest('id')->first();

        $this->assertNull($log->request_id);
        $this->assertNull($log->first_token_ms);
        $this->assertFalse($log->cache_hit);
    }

    public function test_telemetry_does_not_store_prompt_or_answer_text(): void
    {
        // This table is queried for operational patterns; storing the
        // accounting content of every question would make it a second ledger.
        $columns = (new AiUsageLog)->getFillable();

        foreach (['prompt', 'answer', 'response', 'content', 'messages', 'api_key'] as $forbidden) {
            $this->assertNotContains($forbidden, $columns);
        }
    }

    // ---------- Health dashboard ----------

    public function test_the_dashboard_names_every_capability_an_operator_asks_about(): void
    {
        $checks = app(AiReadinessService::class)->dashboard()['checks'];

        foreach ([
            'chat_provider', 'copilot', 'embeddings', 'knowledge_index',
            'document_scanning', 'queue_worker', 'streaming', 'fallback_provider',
        ] as $key) {
            $this->assertArrayHasKey($key, $checks);
            $this->assertArrayHasKey('ready', $checks[$key]);
            $this->assertArrayHasKey('detail', $checks[$key]);
        }
    }

    public function test_a_not_ready_check_states_the_action_that_fixes_it(): void
    {
        config(['ai.fallback.provider' => '', 'ai.fallback.model' => '']);

        $check = app(AiReadinessService::class)->dashboard()['checks']['fallback_provider'];

        $this->assertFalse($check['ready']);
        $this->assertArrayHasKey('action', $check);
        $this->assertNotEmpty($check['action']);
    }

    public function test_a_ready_check_carries_no_action(): void
    {
        $this->configureFallback();

        $check = app(AiReadinessService::class)->dashboard()['checks']['fallback_provider'];

        $this->assertTrue($check['ready']);
        $this->assertArrayNotHasKey('action', $check);
    }

    public function test_the_dashboard_never_exposes_a_credential(): void
    {
        config(['ai.providers.openai.api_key' => 'sk-super-secret-value']);

        $payload = json_encode(app(AiReadinessService::class)->dashboard());

        $this->assertStringNotContainsString('sk-super-secret-value', $payload);
    }
}
