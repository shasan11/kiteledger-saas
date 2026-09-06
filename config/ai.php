<?php

return [

    /*
    |--------------------------------------------------------------------------
    | AI Enabled
    |--------------------------------------------------------------------------
    | Master switch. Database setting (ai_settings.enabled) overrides this.
    */
    'enabled' => env('AI_ENABLED', false),

    'copilot' => [
        'enabled' => env('AI_COPILOT_ENABLED', true),
        'engine' => env('AI_COPILOT_ENGINE', 'neuron'),

        /*
         * Copilot V2 orchestration — now the canonical path. The legacy
         * cascade in AiAgentChatController remains reachable by setting this
         * to false, so the flag stays a true kill switch in both directions,
         * but it is deprecated and scheduled for removal.
         */
        'v2_enabled' => env('AI_COPILOT_V2_ENABLED', true),
        'router' => env('AI_COPILOT_ROUTER', 'structured'),
        'router_confidence_threshold' => (float) env('AI_COPILOT_ROUTER_CONFIDENCE_THRESHOLD', 0.55),
        'knowledge_tool_enabled' => env('AI_COPILOT_KNOWLEDGE_TOOL_ENABLED', true),
        'conversation_state_enabled' => env('AI_COPILOT_CONVERSATION_STATE_ENABLED', true),
        'trace_enabled' => env('AI_COPILOT_TRACE_ENABLED', true),
        'streaming_enabled' => env('AI_COPILOT_STREAMING_ENABLED', true),

        'read_only' => env('AI_COPILOT_READ_ONLY', false),
        'rag_enabled' => env('AI_RAG_ENABLED', true),
        'financial_tools_enabled' => env('AI_FINANCIAL_TOOLS_ENABLED', true),
        'write_actions_enabled' => env('AI_WRITE_ACTIONS_ENABLED', false),
        'action_execution_enabled' => env('AI_ACTION_EXECUTION_ENABLED', false),
        'debug_enabled' => env('AI_DEBUG_ENABLED', false),
        'incremental_indexing_enabled' => env('AI_INCREMENTAL_INDEXING_ENABLED', true),
        'history_messages' => (int) env('AI_COPILOT_HISTORY_MESSAGES', 20),

        /*
         * Approximate token ceiling for replayed conversation history. A
         * message count alone is not a bound — twenty turns quoting reports can
         * exceed the context window and make the provider reject the whole
         * request. Oldest messages are dropped first; the newest is always kept.
         */
        'history_token_budget' => (int) env('AI_COPILOT_HISTORY_TOKEN_BUDGET', 3000),

        /*
         * Interactive latency budget, in seconds, for a Copilot chat turn.
         * Deliberately far below the shared `ai_timeout_seconds` (which also
         * governs document extraction and batch indexing): a person waiting at
         * a chat box must not be held for minutes. Queued document work keeps
         * the longer budget.
         */
        'interactive_timeout_seconds' => (int) env('AI_COPILOT_INTERACTIVE_TIMEOUT_SECONDS', 45),

        'action_ttl_minutes' => (int) env('AI_ACTION_TTL_MINUTES', 30),
    ],

    /*
    |--------------------------------------------------------------------------
    | Outbound TLS verification
    |--------------------------------------------------------------------------
    | These must be resolved through config, not env() at call time: once
    | `php artisan config:cache` runs, env() returns null and the CA bundle
    | would silently stop being applied — every provider call then fails with
    | "cURL error 60: unable to get local issuer certificate".
    |
    | ca_bundle: absolute path to a cacert.pem. Leave empty to use the system
    | store (php.ini curl.cainfo / openssl.cafile).
    | verify: never set false outside local debugging — it disables certificate
    | verification entirely and exposes provider traffic to interception.
    */
    'ssl' => [
        'ca_bundle' => env('AI_CA_BUNDLE'),
        'verify' => env('AI_SSL_VERIFY', true),
    ],

    'embedding' => [
        'provider' => env('AI_EMBEDDING_PROVIDER', env('AI_PROVIDER', 'openai')),
        'model' => env('AI_EMBEDDING_MODEL', 'text-embedding-3-small'),
        'dimensions' => env('AI_EMBEDDING_DIMENSIONS') !== null ? (int) env('AI_EMBEDDING_DIMENSIONS') : null,

        /*
         * Inputs per batched embedding request. Modest on purpose: a very large
         * batch is one request that fails wholesale, and providers cap total
         * tokens per call regardless of the item count. Lower this if a
         * provider starts rejecting requests as too large.
         */
        'batch_size' => (int) env('AI_EMBEDDING_BATCH_SIZE', 32),
    ],

    'rag' => [
        'top_k' => (int) env('AI_RAG_TOP_K', 8),
        'candidate_pool' => (int) env('AI_RAG_CANDIDATE_POOL', 800),
        'max_candidate_pool' => (int) env('AI_RAG_MAX_CANDIDATE_POOL', 2000),
        'min_vector_score' => (float) env('AI_RAG_MIN_VECTOR_SCORE', 0.05),
        'context_max_chars' => (int) env('AI_RAG_CONTEXT_MAX_CHARS', 12000),
    ],

    /*
    |--------------------------------------------------------------------------
    | Default Provider & Model
    |--------------------------------------------------------------------------
    */
    'default_provider' => env('AI_DEFAULT_PROVIDER', 'openai'),
    'default_model' => env('AI_DEFAULT_MODEL', 'gpt-4o-mini'),

    /*
    |--------------------------------------------------------------------------
    | Fallback provider
    |--------------------------------------------------------------------------
    | Used for ONE retry when the primary provider fails with an infrastructure
    | error — a timeout, a rate limit, an overload, a 5xx. Never used for an
    | invalid key, an unsupported capability, an unknown model or a malformed
    | request: those fail identically on any provider, and retrying only hides
    | the real cause.
    |
    | Both keys must be set, the provider must differ from the primary, and its
    | credentials must be present, or failover reports itself as unconfigured
    | rather than promising resilience the deployment does not have.
    */
    'fallback' => [
        'provider' => env('AI_FALLBACK_PROVIDER', ''),
        'model' => env('AI_FALLBACK_MODEL', ''),
    ],

    /*
    |--------------------------------------------------------------------------
    | Generation parameters
    |--------------------------------------------------------------------------
    */
    'temperature' => (float) env('AI_TEMPERATURE', 0.2),
    'max_tokens' => (int) env('AI_MAX_TOKENS', 1200),

    /*
    |--------------------------------------------------------------------------
    | Usage limits
    |--------------------------------------------------------------------------
    */
    'daily_request_limit' => env('AI_DAILY_REQUEST_LIMIT') ? (int) env('AI_DAILY_REQUEST_LIMIT') : null,
    'monthly_token_limit' => env('AI_MONTHLY_TOKEN_LIMIT') ? (int) env('AI_MONTHLY_TOKEN_LIMIT') : null,

    /*
    |--------------------------------------------------------------------------
    | Logging
    |--------------------------------------------------------------------------
    */
    'log_prompts' => env('AI_LOG_PROMPTS', true),
    'log_responses' => env('AI_LOG_RESPONSES', true),

    /*
    |--------------------------------------------------------------------------
    | Provider credentials (env fallbacks — DB keys take priority)
    |--------------------------------------------------------------------------
    */
    'providers' => [
        'openai' => [
            'api_key' => env('OPENAI_API_KEY', ''),
            'base_url' => env('OPENAI_URL', 'https://api.openai.com/v1'),
        ],
        'groq' => [
            'api_key' => env('GROQ_API_KEY', ''),
            'base_url' => env('GROQ_URL', 'https://api.groq.com/openai/v1'),
        ],
        'openrouter' => [
            'api_key' => env('OPENROUTER_API_KEY', ''),
            'base_url' => env('OPENROUTER_URL', 'https://openrouter.ai/api/v1'),
        ],
        'gemini' => [
            'api_key' => env('GEMINI_API_KEY', ''),
            'base_url' => null,
        ],
        'anthropic' => [
            'api_key' => env('ANTHROPIC_API_KEY', ''),
            'base_url' => null,
        ],
        'deepseek' => [
            'api_key' => env('DEEPSEEK_API_KEY', ''),
            'base_url' => env('DEEPSEEK_URL', 'https://api.deepseek.com/v1'),
        ],
        'ollama' => [
            'api_key' => null,
            'base_url' => env('OLLAMA_URL', 'http://localhost:11434'),
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Supported providers list (for validation)
    |--------------------------------------------------------------------------
    */
    'supported_providers' => ['openai', 'openrouter', 'gemini', 'anthropic', 'deepseek', 'ollama'],

    /*
    |--------------------------------------------------------------------------
    | Modules
    |--------------------------------------------------------------------------
    */
    'modules' => [
        'global_command',
        'transaction_review',
        'invoice_assistant',
        'report_explainer',
        'accounting_copilot',
        'crm_assistant',
        'payment_collection',
        'inventory_insights',
    ],

    /*
    |--------------------------------------------------------------------------
    | Default module state (all disabled by default)
    |--------------------------------------------------------------------------
    */
    'default_modules_enabled' => [
        'global_command' => false,
        'transaction_review' => false,
        'invoice_assistant' => false,
        'report_explainer' => false,
        'accounting_copilot' => false,
        'crm_assistant' => false,
        'payment_collection' => false,
        'inventory_insights' => false,
    ],

    /*
    |--------------------------------------------------------------------------
    | Unsafe actions that AI must never execute
    |--------------------------------------------------------------------------
    */
    'unsafe_actions' => [
        'approve',
        'bulkApprove',
        'void',
        'bulkVoid',
        'delete',
        'bulkDelete',
        'forceDelete',
        'postJournal',
        'changeBalance',
        'modifyApprovedTransaction',
        'modifyVoidedTransaction',
    ],
];
