# Retiring the legacy Copilot path

## Status

Copilot V2 is the **configuration default** (`ai.copilot.v2_enabled = true`), and it
owns routing, evidence policy, tool scoping, streaming and persistence.

The legacy cascade in `AiAgentChatController::chat()` is still reachable by setting
`AI_COPILOT_V2_ENABLED=false`, and the test suite still pins it that way in
`phpunit.xml`. **It cannot be deleted yet.** This document records why, so the
decision is not re-derived from scratch later.

## Why the flag is still pinned in tests

Flipping `AI_COPILOT_V2_ENABLED` to `true` in `phpunit.xml` fails 19 tests across
`AiToolAgentTest`, `AiAgentSafetyTest`, `AiRagRetrieverTest`, `AiSecurityHardeningTest`
and `AiAssistantApiTest`.

Those failures are **not** stale assertions. They are the suite correctly reporting
that V2 does not yet answer questions the legacy path answers deterministically.

## The actual gap

`AiToolRouter` resolves roughly 85 deterministic capability keys without any model
call. `CopilotMetricCatalog` — the V2 equivalent — covers receivables, payables,
sales, purchases, inventory value and a handful of related metrics.

Capabilities that exist in the legacy router with **no V2 metric equivalent**
include:

| Legacy capability | What a user asks |
| --- | --- |
| `product.cheapest` / `product.most_expensive` | "What is our cheapest product?" |
| `product.highest_selling_price` / `product.highest_purchase_price` | "Which product sells for the most?" |
| `product.without_price` / `product.without_cost` | "Which products have no price set?" |
| `bank_account.most_transactions` | "Which bank account is busiest?" |
| `bank_account.highest_net_movement` | "Which account moved the most money?" |
| `bank_account.recent_transactions` | "Show recent bank activity" |
| `inventory.dead_stock` / `inventory.fast_moving_products` | "What is not selling?" |
| `inventory.negative_stock` / `inventory.stock_adjustment_risks` | "Where is stock negative?" |
| `inventory.warehouse_wise_stock` | "Stock by warehouse" |
| `report.resolve` | "Open the trial balance" |
| `contact.search` | "Find customer ABC" |

On V2 these fall through to the tool-calling agent. That still produces an answer
from authorized tools, but it costs a model round trip, is less predictable, and
loses the sub-second deterministic path that made these questions feel instant.

## What retirement requires

1. Port the legacy deterministic capabilities into `CopilotMetricCatalog` (or a
   sibling catalog for non-financial lookups such as `report.resolve` and
   `contact.search`), so V2 can answer them without a model.
2. Extend `CopilotRouter` Layer B so the obvious phrasings resolve without Layer C,
   which is what keeps them fast.
3. Migrate the 19 tests to V2 semantics — each needs a fake Neuron provider so the
   structured router returns a deterministic classification, since V2 Layer C is a
   model call where the legacy path was pure keyword matching.
4. Flip the `phpunit.xml` pin to `true` and confirm the suite is green.
5. Only then delete `AiAgentChatController`'s legacy cascade, `AiToolRouter`,
   `AiAgentIntentService` and `AiQueryUnderstandingService`.

## What must not happen

Do not flip the pin and relax the failing assertions. Those tests describe
behaviour real users depend on; weakening them would retire the legacy path on
paper while silently removing capability from the product.
