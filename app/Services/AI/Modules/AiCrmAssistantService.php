<?php

namespace App\Services\AI\Modules;

use App\Services\AI\AiActionGuard;
use App\Services\AI\AiContextBuilder;
use App\Services\AI\AiPromptService;
use App\Services\AI\AiProviderService;

class AiCrmAssistantService
{
    protected const MODULE     = 'crm_assistant';
    protected const PERMISSION = 'ai.crm_assistant.use';

    protected array $modelMap = [
        'lead'    => \App\Models\Lead::class,
        'deal'    => \App\Models\Deal::class,
        'contact' => \App\Models\Contact::class,
    ];

    public function __construct(
        protected AiActionGuard     $guard,
        protected AiProviderService  $provider,
        protected AiContextBuilder  $contextBuilder,
        protected AiPromptService   $prompts,
    ) {}

    public function followUp(array $input): array
    {
        $this->guard->assertModuleEnabled(self::MODULE);
        $this->guard->assertUserCanUse(self::PERMISSION);

        $type    = $input['type']    ?? 'contact';
        $id      = $input['id']      ?? null;
        $tone    = $input['tone']    ?? 'professional';
        $channel = $input['channel'] ?? 'email';

        $modelClass = $this->modelMap[$type] ?? null;

        $record = null;
        $recordContext = [];

        if ($modelClass && $id && class_exists($modelClass)) {
            $record = $modelClass::find($id);
            if ($record) {
                $recordContext = $this->contextBuilder->crmContext($record);
            }
        }

        $userPrompt = "Generate a {$tone} follow-up {$channel} message for this CRM record.\n"
            . "Type: {$type}\n"
            . "Record data:\n" . json_encode($recordContext, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE)
            . "\n\nReturn JSON with: summary, score (0-100), next_action, message, subject.";

        $result = $this->provider->structured(
            module: self::MODULE,
            systemPrompt: $this->prompts->crmAssistantPrompt(),
            userPrompt: $userPrompt,
            context: $recordContext,
        );

        $data = $result['data'] ?? [];

        return array_merge([
            'summary'     => '',
            'score'       => 0,
            'next_action' => '',
            'message'     => '',
            'subject'     => '',
        ], $data);
    }
}
