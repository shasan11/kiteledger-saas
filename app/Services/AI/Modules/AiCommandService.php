<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;

class AiCommandService
{
    protected const MODULE     = 'global_command';
    protected const PERMISSION = 'ai.global_command.use';

    protected array $allowedIntents = [
        'search_records',
        'explain_report',
        'review_transaction',
        'draft_invoice',
        'draft_message',
        'explain_accounting',
        'collection_plan',
        'inventory_insight',
        'unsupported',
    ];

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiPromptService   $prompts,
    ) {}

    public function handle(array $input): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $message  = $input['message']   ?? '';
        $branchId = $input['branch_id'] ?? null;

        $userPrompt = "User command: \"{$message}\"\n\n"
            . "Classify the intent and return structured JSON. "
            . "Allowed intents: " . implode(', ', $this->allowedIntents) . ".\n"
            . "Allowed action types: navigate, show_results, draft_message, explain, suggest_filter, open_record.\n"
            . "Return JSON with: intent, module, filters, answer, actions (array of {label, type, url}).";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->commandCenterPrompt(),
            userPrompt: $userPrompt,
            branchId: $branchId,
        );

        $data = $result['data'] ?? [];

        // Validate intent
        $intent = $data['intent'] ?? 'unsupported';
        if (!in_array($intent, $this->allowedIntents, true)) {
            $data['intent'] = 'unsupported';
        }

        // Strip unsafe actions from the response
        $unsafeActionTypes = ['approve', 'void', 'delete', 'post', 'force_update'];
        if (!empty($data['actions']) && is_array($data['actions'])) {
            $data['actions'] = array_values(array_filter(
                $data['actions'],
                fn ($a) => !in_array($a['type'] ?? '', $unsafeActionTypes, true)
            ));
        }

        return array_merge([
            'intent'  => 'unsupported',
            'module'  => null,
            'filters' => [],
            'answer'  => '',
            'actions' => [],
        ], $data);
    }
}
