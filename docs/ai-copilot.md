# KiteLedger Copilot

KiteLedger Copilot is the tenant-scoped ERP and accounting assistant at
`/ai/assistant`. It combines deterministic financial tools, hybrid retrieval,
Neuron agent orchestration, conversation memory, citations, and a guarded
pending-action workflow. Exact and keyword retrieval remain available when an
embedding provider is unavailable.

## Architecture

The existing `/api/ai/*` contract remains the public boundary. The controller
classifies each question and chooses the safest complete path:

1. Verified financial questions use controlled query services. The model never
   calculates ledger totals.
2. Exact record and report questions use allowlisted resolvers.
3. Help and fuzzy business questions use exact, full-text/keyword, metadata,
   and optional semantic retrieval, followed by deterministic reranking.
4. General conversational requests use `KiteLedgerCopilotAgent`, orchestrated
   by Neuron and supplied only with tools the current user may invoke.
5. Supported write requests create an `AiPendingAction`; they never mutate ERP
   data during chat.

`CopilotContextFactory` derives tenant, connection, user, permitted branches,
fiscal year, permissions, locale, currency, and timezone from authenticated
server state. Request and model payloads cannot override those values.

Provider credentials and feature controls are central platform settings. Tenant
settings endpoints intentionally return `AI_SETTINGS_CENTRALLY_MANAGED`.

## Provider configuration

Run the central settings seeder after deploying this version, then open Central
Admin > Platform Settings > AI:

```bash
php artisan db:seed --class=PlatformSettingsSeeder --force
```

Configure AI provider, model, API key, base URL, and timeouts. Supported chat
adapters include OpenAI-compatible APIs, Gemini, Anthropic, OpenRouter, Groq,
and Ollama. Neuron is the default Copilot engine; the legacy Prism path remains
available as a rollback switch.

The API key is encrypted by the central settings model. Never place provider
credentials in tenant databases or frontend variables. Environment provider
keys are fallback values only.

## Embeddings and MySQL vector storage

Configure the embedding provider, model, and optional expected dimensions
separately from chat. Supported embedding adapters are OpenAI-compatible APIs,
Gemini, OpenRouter, and Ollama.

Embeddings are stored in the tenant database in `ai_embeddings.vector` as a
MySQL JSON array. Each row records provider, model, dimensions, content hash,
source, branch, and optional knowledge-chunk relation. The custom Neuron
`MySqlVectorStore`:

- rejects empty, non-numeric, non-finite, zero, and dimension-mismatched data;
- filters provider, model, source, branch, fiscal year, and permission scope;
- loads a bounded, recently updated candidate pool rather than the table;
- computes cosine similarity in PHP and returns only top-K results;
- logs malformed row identity and exception class without logging vectors.

This design targets ordinary MySQL/MariaDB hosting. For very large per-tenant
corpora, move similarity calculation to a dedicated vector service while
preserving the same context and source-authorization boundary.

## Indexing

Within an initialized tenant context:

```bash
php artisan ai:index-app
php artisan ai:index-business
php artisan ai:index-all
php artisan ai:index-all --no-embeddings
php artisan ai:index-status
php artisan ai:prune-index
```

From the central application:

```bash
php artisan ai:index-tenant TENANT_ID
php artisan ai:index-tenant TENANT_ID --no-embeddings
php artisan ai:index-tenants
php artisan ai:index-tenants --no-embeddings
php artisan ai:index-tenants --queue
php artisan ai:reembed-tenant TENANT_ID
php artisan ai:prune-index --tenant=TENANT_ID
php artisan ai:index-status --tenant=TENANT_ID
```

Central commands initialize each tenant before touching knowledge, end tenancy
in a `finally` block, and continue past tenant-specific failures. `--queue`
creates one tenancy-aware rebuild job per tenant.

Important searchable models dispatch single-record index or delete jobs after a
committed create, update, delete, or restore. Content hashes prevent unchanged
chunks from being embedded again. Deleting a source removes its chunk and
embeddings and increments the tenant data-version fingerprint so stale answer
caches are bypassed.

After changing embedding provider, model, or dimensions, run
`ai:reembed-tenant` for each tenant. Do not mix vectors produced by different
models; retrieval filters provider and model explicitly.

## Queues and scheduler

Incremental jobs use `ai-index`; embedding jobs use `ai-embedding`. Add both to
the production tenant-aware worker:

```bash
php artisan queue:work central --queue=ai-index,ai-embedding,ai-copilot,default --tries=3 --timeout=3600
```

Keep Laravel's scheduler cron running every minute. Schedule a periodic
`ai:index-tenants --queue` and `ai:prune-index --tenant=...` from the hosting
control panel if the business requires reconciliation beyond observer events.

## Permissions and plans

Run the tenant permission seeder after tenant migrations:

```bash
php artisan tenants:run db:seed --option=class=Database\\Seeders\\AiPermissionSeeder --option=force=1
```

The catalog includes separate use, chat, search, financial, reports,
conversation, action, logs, debug, settings, and management permissions. Tools
also enforce their underlying domain permissions. `ai.chat` does not imply
access to every ERP module. Plan middleware and the plan's AI allowance still
apply to every API route.

Only `ai.debug.view`/management users receive provider, model, retrieval timing,
candidate scores, internal conversation identity, or token details. Ordinary
users receive sanitized, human-readable sources only.

## Feature controls

Defaults are in `.env.example`; central settings take precedence where exposed:

```dotenv
AI_COPILOT_ENABLED=true
AI_COPILOT_ENGINE=neuron
AI_COPILOT_READ_ONLY=false
AI_RAG_ENABLED=true
AI_FINANCIAL_TOOLS_ENABLED=true
AI_WRITE_ACTIONS_ENABLED=false
AI_ACTION_EXECUTION_ENABLED=false
AI_ACTION_TTL_MINUTES=30
AI_INCREMENTAL_INDEXING_ENABLED=true
```

Write proposal generation and action execution are deliberately separate and
disabled by default. Enable execution only after permissions, domain workflows,
backups, and audit review have been verified.

## Security model

- All API routes require tenant initialization, authentication, verified user,
  active tenant, subscription, quota, and feature middleware plus rate limits.
- Context payload keys and context types are allowlisted and bounded.
- Conversation IDs are encrypted opaque tokens and ownership is rechecked.
- Hybrid and vector candidates are branch/fiscal/permission filtered before
  context assembly. Retrieved text is marked untrusted and cannot issue tool
  instructions.
- Source cards omit raw vectors, internal IDs, connections, prompts, credentials,
  hidden routes, and raw scores. Operational documentation requires debug/admin
  permission.
- Arbitrary SQL, tables, model classes, shell commands, secret access, role and
  tenant changes, subscriptions, impersonation, and destructive accounting
  operations are not exposed as tools.
- Safe answer cache keys include tenant, user, branch, fiscal year, permission
  fingerprint, normalized question, relevant context, provider/model, and a
  tenant data-version fingerprint. Private and explicitly current/live requests
  bypass cache.

## Write approval workflow

Copilot extracts and validates a proposal, creates a time-limited pending action,
and returns a readable preview. A permitted user must approve or reject it.
Execution reloads the row with `FOR UPDATE`, checks expiry, status, permission,
branch, missing fields, current record state, fiscal lock, and the independent
execution feature flag. It then creates or updates only allowlisted draft fields
inside a transaction and writes an audit snapshot.

High-risk proposals require exact typed confirmation. Idempotency keys and row
locking prevent double execution. Posted/approved/voided/locked records and
prohibited actions remain unavailable through Copilot.

## Example questions

- Give me a financial overview for the current fiscal year.
- Which customer receivables need attention?
- Summarize supplier payables due this week.
- Show the largest expenses this month.
- Which products are low in stock?
- Find invoice INV-0001.
- Which report should I use for trial balance?
- How do I create and send an invoice?

## Troubleshooting

`AI_PROVIDER_NOT_CONFIGURED`: save a valid central chat provider key, model, and
base URL. `AI_EMBEDDING_PROVIDER_NOT_CONFIGURED`: configure embeddings or run
indexing with `--no-embeddings`; exact and keyword retrieval still work.

If results are stale, check the `ai-index` worker, failed jobs, and
`ai:index-status --tenant=...`, then run `ai:index-tenant`. If an embedding model
changed, run `ai:reembed-tenant`. If a tenant returns another branch's result,
disable Copilot immediately and verify branch assignments, selected context,
chunk metadata, and tenant migrations before re-enabling it.

## Deployment checklist

```bash
composer install --no-dev --optimize-autoloader
php artisan migrate --force
php artisan tenants:migrate --force
php artisan db:seed --class=PlatformSettingsSeeder --force
php artisan tenants:run db:seed --option=class=Database\\Seeders\\AiPermissionSeeder --option=force=1
npm ci
npm run build
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan ai:index-tenants --queue
```

Verify central settings, tenant health endpoint, tenant UI, a deterministic
financial answer, help retrieval without embeddings, source cards, conversation
ownership, branch restrictions, and a proposal/reject flow. Test action execution
in a disposable tenant before enabling it in production.

## Rollback

Set the central Copilot-enabled switch off for an immediate shutdown. To retain
the old chat engine while investigating Neuron, set the Copilot engine to
`legacy`. Leave write and execution flags off. Code rollback is safe because the
new tenant columns are additive; the embedding migration intentionally preserves
stored data on rollback. Restore application code and caches, but do not drop AI
tables until retention and audit requirements have been reviewed.
