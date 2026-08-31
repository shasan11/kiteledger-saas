<?php

namespace App\Services\AI;

use App\Models\AiEmbedding;
use App\Models\AiKnowledgeChunk;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

/**
 * Operational AI readiness, kept separate from settings serialization.
 *
 * A credential is configuration, not proof. Provider verification is tied to
 * a fingerprint of the active provider/model/base URL/key, so changing any of
 * them immediately invalidates the previous successful connection test.
 */
class AiReadinessService
{
    private const VERIFICATION_CACHE_PREFIX = 'ai:provider-verification:';

    private const DOCUMENT_VERIFICATION_CACHE_PREFIX = 'ai:document-verification:';

    public function __construct(private readonly AiSettingsService $settings) {}

    /**
     * The AI provider is platform-wide config (AiSettingsService reads it off
     * the central connection via PlatformSettingsService), but the default
     * cache store gets a tenant-suffixed path/prefix the moment tenancy is
     * bootstrapped (see PrefixCacheTenancyBootstrapper). Left alone, a
     * connection test run from Central Settings (no tenant active) writes
     * into the central cache namespace, while every tenant reads its own,
     * tenant-suffixed namespace - so no tenant would ever see the platform's
     * connection as verified, and the Copilot composer stays disabled
     * everywhere. Running the cache read/write in the central context via
     * tenancy()->central() keeps this one flag in the same namespace the
     * shared setting itself lives in, regardless of which tenant is active
     * when it's checked.
     */
    private function rememberCentrally(string $key, mixed $value): void
    {
        tenancy()->central(fn () => Cache::forever($key, $value));
    }

    private function recallCentrally(string $key): mixed
    {
        return tenancy()->central(fn () => Cache::get($key));
    }

    public function recordProviderVerification(bool $success, ?string $code = null): void
    {
        $this->rememberCentrally($this->verificationKey(), [
            'success' => $success,
            'code' => $code,
            'verified_at' => now()->toISOString(),
        ]);
    }

    public function recordDocumentVerification(bool $success, ?string $code = null): void
    {
        $this->rememberCentrally($this->documentVerificationKey(), [
            'success' => $success,
            'code' => $code,
            'verified_at' => now()->toISOString(),
        ]);
    }

    /** @return array<string, mixed> */
    public function evaluate(): array
    {
        $masterEnabled = $this->settings->enabled();
        $copilotEnabled = $this->settings->copilotEnabled();
        $providerConfigured = $this->settings->provider() === 'ollama' || $this->settings->hasApiKey();
        $verification = $this->recallCentrally($this->verificationKey());
        $connectionVerified = $providerConfigured && (bool) ($verification['success'] ?? false);
        $capabilities = $this->modelCapabilities();
        $modelValid = $connectionVerified && trim($this->settings->model()) !== '';
        $chatAvailable = $masterEnabled && $copilotEnabled && $modelValid;

        $documentProvider = $this->settings->documentProvider();
        $documentModel = $this->settings->documentModel();
        $documentProviderConfigured = $this->settings->hasApiKeyFor($documentProvider);
        $documentCapabilities = $this->capabilitiesFor($documentProvider, $documentModel);
        $documentVerification = $this->recallCentrally($this->documentVerificationKey());
        $documentConnectionVerified = $documentProviderConfigured && (bool) ($documentVerification['success'] ?? false);
        $documentModelValid = $documentConnectionVerified && $documentModel !== '';

        $embeddingConfigured = $masterEnabled
            && $this->settings->supportsEmbeddings()
            && ($this->settings->embeddingProvider() === 'ollama' || filled($this->settings->embeddingApiKey()))
            && filled($this->settings->embeddingModel());

        $rag = $this->ragStatus($embeddingConfigured);
        $queue = $this->queueStatus();
        $documentEnabled = $this->settings->documentScanningEnabled();
        $documentAvailable = $masterEnabled
            && $documentEnabled
            && $documentModelValid
            && $documentCapabilities['document_vision']
            && $queue['configured']
            && $queue['retry_after_safe']
            && $queue['worker_healthy'];

        $financialTools = $chatAvailable && $capabilities['tool_calling'] && $this->settings->financialToolsEnabled();
        $writeProposals = $chatAvailable && $capabilities['tool_calling'] && $this->settings->writeActionsEnabled();
        $actionExecution = $writeProposals && $this->settings->actionExecutionEnabled();

        $issues = [];
        foreach ([
            ['AI_DISABLED', ! $masterEnabled, 'AI features are disabled by the platform administrator.'],
            ['AI_COPILOT_DISABLED', ! $copilotEnabled, 'KiteLedger Copilot is disabled.'],
            ['AI_PROVIDER_NOT_CONFIGURED', ! $providerConfigured, 'The shared AI provider is not configured.'],
            ['AI_PROVIDER_NOT_VERIFIED', $providerConfigured && ! $connectionVerified, 'The AI provider and selected model have not passed a connection test.'],
            ['AI_MODEL_CHAT_UNAVAILABLE', $connectionVerified && ! $capabilities['chat'], 'The selected model does not support chat.'],
            ['AI_EMBEDDINGS_NOT_CONFIGURED', $this->settings->ragEnabled() && ! $embeddingConfigured, 'RAG is enabled but its embedding provider is not configured.'],
            ['AI_RAG_INDEX_NOT_READY', $this->settings->ragEnabled() && $rag['checked'] && ! $rag['ready'], 'RAG is enabled but its knowledge index is empty or incomplete.'],
            ['AI_QUEUE_NOT_CONFIGURED', ! $queue['configured'], 'Document scanning requires a non-sync queue connection.'],
            ['AI_QUEUE_RETRY_WINDOW_UNSAFE', $queue['configured'] && ! $queue['retry_after_safe'], 'The queue retry-after window must be longer than the document job timeout.'],
            ['AI_QUEUE_WORKER_UNHEALTHY', $queue['configured'] && ! $queue['worker_healthy'], 'The queue worker heartbeat is missing or stale.'],
            ['AI_DOCUMENT_PROVIDER_NOT_CONFIGURED', $documentEnabled && ! $documentProviderConfigured, 'The document AI provider is not configured.'],
            ['AI_DOCUMENT_MODEL_NOT_VERIFIED', $documentEnabled && $documentProviderConfigured && ! $documentConnectionVerified, 'The document provider and model have not passed a capability test.'],
            ['AI_DOCUMENT_MODEL_UNSUPPORTED', $documentEnabled && ! $documentCapabilities['document_vision'], 'The selected document model is not known to support both PDF and image inputs.'],
        ] as [$code, $failed, $message]) {
            if ($failed) {
                $issues[] = compact('code', 'message');
            }
        }

        return [
            'master_ai_enabled' => $masterEnabled,
            'copilot_enabled' => $copilotEnabled,
            'copilot_v2_enabled' => $this->settings->copilotV2Enabled(),
            'streaming_available' => $this->settings->streamEnabled()
                && $this->settings->copilotV2Enabled()
                && (bool) config('ai.copilot.streaming_enabled', false),
            'provider_configured' => $providerConfigured,
            'provider_connection_verified' => $connectionVerified,
            'provider_verified_at' => $connectionVerified ? ($verification['verified_at'] ?? null) : null,
            'selected_model_valid' => $modelValid,
            'chat_capability_available' => $chatAvailable && $capabilities['chat'],
            'tool_calling_available' => $chatAvailable && $capabilities['tool_calling'],
            'document_provider_configured' => $documentProviderConfigured,
            'document_provider_connection_verified' => $documentConnectionVerified,
            'document_model_valid' => $documentModelValid,
            'document_vision_capability_available' => $documentModelValid && $documentCapabilities['document_vision'],
            'embedding_provider_configured' => $embeddingConfigured,
            'rag_index_ready' => $rag['ready'],
            'rag_index_checked' => $rag['checked'],
            'rag_index_scope' => 'tenant',
            'rag_last_indexed_at' => $rag['last_indexed_at'],
            'rag_chunks' => $rag['chunks'],
            'rag_embeddings' => $rag['embeddings'],
            'queue_configured' => $queue['configured'],
            'queue_connection' => $queue['connection'],
            'queue_worker_healthy' => $queue['worker_healthy'],
            'queue_retry_after_safe' => $queue['retry_after_safe'],
            'queue_retry_after_seconds' => $queue['retry_after_seconds'],
            'queue_worker_last_seen_at' => $queue['last_seen_at'],
            'document_scanning_available' => $documentAvailable,
            'financial_tools_available' => $financialTools,
            'write_proposals_available' => $writeProposals,
            'action_execution_available' => $actionExecution,
            'copilot_ready' => $chatAvailable && $capabilities['chat'],
            'operational_ready' => $issues === [],
            'issues' => $issues,
        ];
    }

    /** @return array{chat:bool,tool_calling:bool,document_vision:bool} */
    public function modelCapabilities(): array
    {
        return $this->capabilitiesFor($this->settings->provider(), $this->settings->model());
    }

    /** @return array{chat:bool,tool_calling:bool,document_vision:bool} */
    private function capabilitiesFor(string $provider, string $model): array
    {
        $provider = strtolower($provider);
        $model = strtolower($model);
        $chat = $model !== '';

        $toolCalling = match ($provider) {
            'openai' => $this->contains($model, ['gpt-4o', 'gpt-4.1', 'gpt-5', 'o3', 'o4']),
            'gemini' => $this->contains($model, ['gemini-1.5', 'gemini-2', 'gemini-3']),
            'groq' => $this->contains($model, ['llama-3.1', 'llama-3.3', 'qwen', 'mixtral']),
            'openrouter' => $this->contains($model, ['gpt-4o', 'gpt-4.1', 'gpt-5', 'gemini', 'claude-3', 'llama-3.1', 'llama-3.3', 'qwen']),
            'ollama' => $this->contains($model, ['llama3.1', 'llama3.2', 'qwen2.5', 'qwen3', 'mistral-nemo']),
            default => false,
        };

        $vision = match ($provider) {
            'openai' => $this->contains($model, ['gpt-4o', 'gpt-4.1', 'gpt-5']),
            'gemini' => $this->contains($model, ['gemini-1.5', 'gemini-2', 'gemini-3']),
            'openrouter' => $this->contains($model, ['gpt-4o', 'gpt-4.1', 'gpt-5', 'gemini', 'claude-3', 'qwen-vl', 'pixtral']),
            default => false,
        };

        return ['chat' => $chat, 'tool_calling' => $toolCalling, 'document_vision' => $vision];
    }

    private function verificationKey(): string
    {
        return $this->verificationKeyFor($this->settings->provider(), $this->settings->model());
    }

    private function documentVerificationKey(): string
    {
        $provider = $this->settings->documentProvider();
        $model = $this->settings->documentModel();

        return self::DOCUMENT_VERIFICATION_CACHE_PREFIX.hash('sha256', implode('|', [
            $provider,
            $model,
            $this->settings->baseUrlFor($provider),
            hash('sha256', (string) $this->settings->apiKeyFor($provider)),
        ]));
    }

    private function verificationKeyFor(string $provider, string $model): string
    {
        return self::VERIFICATION_CACHE_PREFIX.hash('sha256', implode('|', [
            $provider,
            $model,
            $this->settings->baseUrlFor($provider),
            hash('sha256', (string) $this->settings->apiKeyFor($provider)),
        ]));
    }

    /** @return array{ready:bool,checked:bool,last_indexed_at:?string,chunks:int,embeddings:int} */
    private function ragStatus(bool $embeddingConfigured): array
    {
        try {
            $chunks = AiKnowledgeChunk::query()->count();
            $embeddings = AiEmbedding::query()->count();
            $last = AiEmbedding::query()->max('updated_at');

            return [
                'ready' => $embeddingConfigured && $chunks > 0 && $embeddings > 0,
                'checked' => true,
                'last_indexed_at' => $last ? (string) $last : null,
                'chunks' => $chunks,
                'embeddings' => $embeddings,
            ];
        } catch (Throwable) {
            return ['ready' => false, 'checked' => false, 'last_indexed_at' => null, 'chunks' => 0, 'embeddings' => 0];
        }
    }

    /** @return array{configured:bool,retry_after_safe:bool,retry_after_seconds:?int,worker_healthy:bool,connection:string,last_seen_at:?string} */
    private function queueStatus(): array
    {
        $connection = (string) config('documents.queue_connection', config('queue.default'));
        $driver = (string) config("queue.connections.{$connection}.driver", '');
        $configured = ! in_array($driver, ['', 'sync', 'null'], true);
        $retryAfter = config("queue.connections.{$connection}.retry_after");
        $jobTimeout = max(
            60,
            (int) config('documents.scan_timeout_seconds', 120),
            $this->settings->timeoutSeconds(),
        ) + 60;
        $retryAfterSafe = $configured && ($retryAfter === null || (int) $retryAfter > $jobTimeout);
        $lastSeen = null;
        $healthy = false;

        try {
            $central = (string) config('tenancy.database.central_connection');
            if ($configured && Schema::connection($central)->hasTable('saas_heartbeats')) {
                $lastSeen = DB::connection($central)->table('saas_heartbeats')->where('name', 'queue')->value('last_seen_at');
                $healthy = $lastSeen && now()->diffInMinutes($lastSeen, true) <= 5;
            }
        } catch (Throwable) {
            $healthy = false;
        }

        return [
            'configured' => $configured,
            'retry_after_safe' => $retryAfterSafe,
            'retry_after_seconds' => $retryAfter === null ? null : (int) $retryAfter,
            'worker_healthy' => (bool) $healthy,
            'connection' => $connection,
            'last_seen_at' => $lastSeen ? (string) $lastSeen : null,
        ];
    }

    /** @param array<int, string> $needles */
    private function contains(string $value, array $needles): bool
    {
        foreach ($needles as $needle) {
            if (str_contains($value, $needle)) {
                return true;
            }
        }

        return false;
    }
}
