<?php

declare(strict_types=1);

namespace App\Neuron\Agents\Tools;

use App\Models\AiConversation;
use App\Services\AI\AiSettingsService;
use App\Services\AI\Copilot\CopilotContext;
use App\Services\AI\Tools\AiToolRouter;
use Illuminate\Validation\ValidationException;
use NeuronAI\Tools\PropertyType;
use NeuronAI\Tools\Tool;
use NeuronAI\Tools\ToolProperty;

final class ProposeBusinessActionTool extends Tool
{
    public function __construct(private CopilotContext $context, private AiToolRouter $router, private AiSettingsService $settings)
    {
        parent::__construct('propose_business_action', 'Prepare a validated pending-action preview. This never writes an ERP record; a separate explicit user approval is always required.');
    }

    protected function properties(): array
    {
        return [new ToolProperty('instruction', PropertyType::STRING, 'Draft creation request. Never use for delete, approve, post, void, reverse, reconcile, permissions, credentials, SQL, or shell commands.', true)];
    }

    public function __invoke(string $instruction): string
    {
        if (! $this->settings->writeActionsEnabled()) {
            throw ValidationException::withMessages(['action' => 'Write proposals are disabled.']);
        }

        $classification = $this->router->classify($instruction);
        if (($classification['type'] ?? null) !== 'action' || ($classification['tool'] ?? null) === 'action.blocked') {
            throw ValidationException::withMessages(['action' => 'This action is prohibited or unsupported.']);
        }

        $conversation = AiConversation::query()
            ->whereKey($this->context->conversationId)
            ->where('user_id', $this->context->user->id)
            ->firstOrFail();
        $action = $this->router->proposeAction($this->context->request(), $conversation, $classification, $instruction);

        return json_encode([
            'pending_action_id' => $action->id,
            'status' => 'pending',
            'title' => $action->title,
            'summary' => $action->summary,
            'risk_level' => $action->risk_level,
            'requires_approval' => true,
            'completed' => false,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    }
}
