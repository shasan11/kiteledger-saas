<?php

declare(strict_types=1);

namespace App\Services\AI\Providers;

/**
 * The one place a provider's abilities are declared.
 *
 * Before this, the same question was answered in three places that could
 * disagree: AiReadinessService inferred chat/tools/vision from model-name
 * substrings, AiSettingsService kept its own list of providers that support
 * embeddings, and the settings UI offered feature combinations neither of them
 * would actually allow. An administrator could select a model, save it, and
 * only discover on the first document upload that it cannot read PDFs.
 *
 * Capabilities are matched at two levels: what the *provider* can do at all,
 * and what the *selected model* within it supports. Both must be true, because
 * OpenAI supports vision and `text-embedding-3-small` does not.
 */
final class AiProviderCapabilityRegistry
{
    /**
     * Provider-level ceilings. A model can never exceed its provider.
     *
     * @var array<string, array<string, bool>>
     */
    private const PROVIDERS = [
        'openai' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => true, 'batch_embeddings' => true, 'streaming' => true,
            'vision_images' => true, 'pdf' => true,
        ],
        'openrouter' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => true, 'batch_embeddings' => true, 'streaming' => true,
            'vision_images' => true, 'pdf' => true,
        ],
        'gemini' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => true, 'batch_embeddings' => true, 'streaming' => true,
            'vision_images' => true, 'pdf' => true,
        ],
        'anthropic' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            // Anthropic has no embeddings endpoint; a deployment using it for
            // chat needs a separate embedding provider for RAG.
            'embeddings' => false, 'batch_embeddings' => false, 'streaming' => true,
            'vision_images' => true, 'pdf' => true,
        ],
        'deepseek' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => false, 'batch_embeddings' => false, 'streaming' => true,
            'vision_images' => false, 'pdf' => false,
        ],
        'groq' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => false, 'batch_embeddings' => false, 'streaming' => true,
            'vision_images' => false, 'pdf' => false,
        ],
        'ollama' => [
            'chat' => true, 'tools' => true, 'structured_output' => true,
            'embeddings' => true, 'batch_embeddings' => true, 'streaming' => true,
            // Locally hosted vision models exist but cannot be assumed from the
            // provider alone; the model check below decides.
            'vision_images' => true, 'pdf' => false,
        ],
    ];

    /**
     * Model-name fragments that indicate a capability within a provider.
     *
     * Substring matching is a deliberate compromise: providers release models
     * constantly, and a closed list would refuse a newer model that works.
     * Being wrong here degrades a feature with a clear message rather than
     * failing silently, and a connection test still has the final say.
     *
     * @var array<string, string[]>
     */
    private const MODEL_TOOL_SUPPORT = [
        'openai' => ['gpt-4o', 'gpt-4.1', 'gpt-5', 'o3', 'o4'],
        'gemini' => ['gemini-1.5', 'gemini-2', 'gemini-3'],
        'groq' => ['llama-3.1', 'llama-3.3', 'qwen', 'mixtral'],
        'openrouter' => ['gpt-4o', 'gpt-4.1', 'gpt-5', 'gemini', 'claude-3', 'claude-4', 'llama-3.1', 'llama-3.3', 'qwen'],
        'ollama' => ['llama3.1', 'llama3.2', 'qwen2.5', 'qwen3', 'mistral-nemo'],
        'anthropic' => ['claude-3', 'claude-4', 'claude-sonnet', 'claude-opus', 'claude-haiku'],
        'deepseek' => ['deepseek-chat', 'deepseek-reasoner'],
    ];

    /** @var array<string, string[]> */
    private const MODEL_VISION_SUPPORT = [
        'openai' => ['gpt-4o', 'gpt-4.1', 'gpt-5'],
        'gemini' => ['gemini-1.5', 'gemini-2', 'gemini-3'],
        'openrouter' => ['gpt-4o', 'gpt-4.1', 'gpt-5', 'gemini', 'claude-3', 'claude-4', 'qwen-vl', 'pixtral'],
        'anthropic' => ['claude-3', 'claude-4', 'claude-sonnet', 'claude-opus'],
        'ollama' => ['llava', 'llama3.2-vision', 'qwen2.5vl', 'minicpm-v'],
    ];

    /** Models that only produce embeddings and cannot chat. */
    private const EMBEDDING_ONLY_FRAGMENTS = ['embedding', 'embed-', 'text-embedding', 'nomic-embed', 'mxbai-embed'];

    /** @return string[] */
    public function providers(): array
    {
        return array_keys(self::PROVIDERS);
    }

    public function supports(string $provider): bool
    {
        return isset(self::PROVIDERS[strtolower(trim($provider))]);
    }

    /**
     * Capabilities of a provider/model pair.
     *
     * An unknown provider gets nothing rather than a permissive default: a
     * capability the platform cannot vouch for must not enable a feature that
     * will fail at the first real request.
     */
    public function for(string $provider, string $model): AiProviderCapabilities
    {
        $provider = strtolower(trim($provider));
        $model = strtolower(trim($model));

        $ceiling = self::PROVIDERS[$provider] ?? null;

        if ($ceiling === null || $model === '') {
            return AiProviderCapabilities::none();
        }

        $embeddingOnly = $this->matches($model, self::EMBEDDING_ONLY_FRAGMENTS);

        // An embedding model cannot chat, and a chat model is not an embedding
        // model. Reporting both would let the settings screen offer a
        // combination that fails on first use.
        $chat = $ceiling['chat'] && ! $embeddingOnly;

        $tools = $chat
            && $ceiling['tools']
            && $this->matches($model, self::MODEL_TOOL_SUPPORT[$provider] ?? []);

        $vision = $chat
            && $ceiling['vision_images']
            && $this->matches($model, self::MODEL_VISION_SUPPORT[$provider] ?? []);

        return new AiProviderCapabilities(
            chat: $chat,
            tools: $tools,
            // Structured output rides on the same model generations as tools.
            structuredOutput: $tools && $ceiling['structured_output'],
            embeddings: $ceiling['embeddings'],
            batchEmbeddings: $ceiling['embeddings'] && $ceiling['batch_embeddings'],
            streaming: $chat && $ceiling['streaming'],
            visionImages: $vision,
            // PDFs are only accepted where the provider takes a document part
            // directly; elsewhere a PDF must be rasterized first, which
            // KiteLedger does not do on shared hosting.
            pdf: $vision && $ceiling['pdf'],
        );
    }

    /** Whether the provider offers embeddings at all, independent of model. */
    public function providerSupportsEmbeddings(string $provider): bool
    {
        return (bool) (self::PROVIDERS[strtolower(trim($provider))]['embeddings'] ?? false);
    }

    public function providerSupportsBatchEmbeddings(string $provider): bool
    {
        $provider = strtolower(trim($provider));

        return (bool) (self::PROVIDERS[$provider]['embeddings'] ?? false)
            && (bool) (self::PROVIDERS[$provider]['batch_embeddings'] ?? false);
    }

    /**
     * Every provider's declared ceiling, for the settings screen.
     *
     * @return array<string, array<string, bool>>
     */
    public function matrix(): array
    {
        return self::PROVIDERS;
    }

    /** @param string[] $fragments */
    private function matches(string $model, array $fragments): bool
    {
        foreach ($fragments as $fragment) {
            if (str_contains($model, $fragment)) {
                return true;
            }
        }

        return false;
    }
}
