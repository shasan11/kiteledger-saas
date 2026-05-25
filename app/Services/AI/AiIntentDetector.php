<?php

namespace App\Services\AI;

use App\DTO\Ai\AiIntentData;
use App\Enums\Ai\AiIntentType;
use Throwable;

class AiIntentDetector
{
    public function __construct(protected AiProviderService $provider) {}

    /**
     * Detect intent. Uses cheap deterministic keyword pre-check, then falls back to LLM.
     */
    public function detect(string $message, array $pageContext = []): AiIntentData
    {
        $deterministic = $this->deterministicScan($message);
        if ($deterministic && $deterministic->intent !== AiIntentType::UNKNOWN) {
            return $deterministic;
        }

        return $this->llmDetect($message, $pageContext);
    }

    private function deterministicScan(string $message): ?AiIntentData
    {
        $m = strtolower($message);

        // PHP doesn't allow enum instances as array keys — use ->value strings.
        $rules = [
            AiIntentType::CREATE_INVOICE_DRAFT->value         => ['create invoice', 'make invoice', 'new invoice', 'invoice for', 'bill the customer'],
            AiIntentType::CREATE_QUOTATION_DRAFT->value       => ['quotation', 'quote for', 'prepare quote'],
            AiIntentType::CREATE_PURCHASE_BILL_DRAFT->value   => ['purchase bill', 'supplier bill', 'vendor bill'],
            AiIntentType::CREATE_EXPENSE_DRAFT->value         => ['record expense', 'log expense', 'expense of'],
            AiIntentType::CREATE_JOURNAL_VOUCHER_DRAFT->value => ['journal voucher', 'journal entry', 'jv for', 'create journal'],
            AiIntentType::EXPLAIN_ACCOUNTING_IMPACT->value    => ['accounting impact', 'explain this invoice', 'explain accounting', 'what entries'],
            AiIntentType::ASK_REPORT->value                   => ['why did', 'compared to last', 'this month', 'profit and loss', 'income statement', 'cash flow', 'report'],
            AiIntentType::RISK_REVIEW->value                  => ['risk review', 'review risk', 'is this safe', 'duplicate', 'fraud check'],
            AiIntentType::RECEIVABLE_COLLECTION->value        => ['overdue', 'collect', 'payment reminder', 'follow up customer'],
            AiIntentType::INVENTORY_ADVISOR->value            => ['dead stock', 'reorder', 'low stock', 'slow moving'],
            AiIntentType::TEMPLATE_GENERATION->value          => ['draft email', 'quotation terms', 'message template'],
            AiIntentType::GLOBAL_SEARCH->value                => ['find ', 'show ', 'list '],
        ];

        foreach ($rules as $intentValue => $keywords) {
            foreach ($keywords as $kw) {
                if (str_contains($m, $kw)) {
                    return new AiIntentData(
                        intent: AiIntentType::from($intentValue),
                        confidence: 0.6,
                        rationale: "Matched keyword: {$kw}",
                    );
                }
            }
        }

        return new AiIntentData(intent: AiIntentType::UNKNOWN, confidence: 0.0);
    }

    private function llmDetect(string $message, array $pageContext): AiIntentData
    {
        $allowed = array_map(fn(AiIntentType $i) => $i->value, AiIntentType::cases());
        $allowedList = implode(', ', $allowed);

        $system = "You are an intent classifier for an accounting/ERP assistant. "
            . "Classify user messages into one of the allowed intents. Return JSON only.";

        $user = "User message: \"" . str_replace('"', "'", $message) . "\"\n"
            . "Page context (route/module): " . json_encode($pageContext) . "\n"
            . "Allowed intents: {$allowedList}\n"
            . "Return JSON with keys: intent (one of allowed), module (string|null), confidence (0..1), extracted (object of fields), rationale (short).";

        try {
            $result = $this->provider->structured(
                module: 'global_command',
                systemPrompt: $system,
                userPrompt: $user,
            );
            $data = $result['data'] ?? [];

            return new AiIntentData(
                intent: AiIntentType::fromString($data['intent'] ?? null),
                module: $data['module'] ?? null,
                extracted: is_array($data['extracted'] ?? null) ? $data['extracted'] : [],
                confidence: (float) ($data['confidence'] ?? 0.5),
                rationale: $data['rationale'] ?? null,
            );
        } catch (Throwable) {
            return new AiIntentData(intent: AiIntentType::GENERAL_QUESTION, confidence: 0.2);
        }
    }
}
