<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;

class AiInvoiceAssistantService
{
    protected const MODULE     = 'invoice_assistant';
    protected const PERMISSION = 'ai.invoice_assistant.use';

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    /**
     * Generate draft invoice line items from a natural language instruction.
     * Does NOT save the invoice — returns draft data only.
     */
    public function draftLines(array $input): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $instruction = $input['instruction'] ?? '';
        $customerId  = $input['customer_id'] ?? null;

        $userPrompt = "Generate invoice line items from this instruction:\n\"{$instruction}\"\n\n"
            . "Customer ID (for reference only): " . ($customerId ?? 'not specified') . "\n\n"
            . "Return JSON with: items (array), notes (string), warnings (array of strings). "
            . "Each item: product_name, description, qty, unit_price, discount_percent (default 0), line_total_estimate.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->invoiceAssistantPrompt(),
            userPrompt: $userPrompt,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'items'    => [],
            'notes'    => '',
            'warnings' => [],
        ], $data);
    }

    /**
     * Explain an existing invoice in plain English.
     */
    public function explain(string $invoiceId): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $invoice = \App\Models\Invoice::with(['items', 'contact'])->findOrFail($invoiceId);

        $context = $this->contextBuilder->invoiceContext($invoice);

        $userPrompt = "Explain the following invoice in plain English for the business owner:\n\n"
            . json_encode($context, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, total_explanation, tax_explanation, payment_status, risk_warnings (array), collection_message_draft.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->systemPrompt(),
            userPrompt: $userPrompt,
            context: $context,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'                 => '',
            'total_explanation'       => '',
            'tax_explanation'         => '',
            'payment_status'          => '',
            'risk_warnings'           => [],
            'collection_message_draft' => '',
        ], $data);
    }
}
