<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AiAssistantUiContractTest extends TestCase
{
    public function test_assistant_uses_production_components_and_safe_runtime_contracts(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/AI/Assistant.jsx');

        $this->assertStringContainsString('<AiWelcome', $source);
        $this->assertStringContainsString('<AiThinkingIndicator', $source);
        $this->assertStringContainsString('health?.runtime_timeout_seconds', $source);
        $this->assertStringContainsString("'/api/ai/chat/stream'", $source);
        $this->assertStringContainsString('text/event-stream', $source);
        $this->assertStringContainsString('if (!streamError.allowFallback || controller.signal.aborted)', $source);
        $this->assertStringContainsString('Response display was stopped.', $source);
        $this->assertStringContainsString('Delete this conversation permanently?', $source);
        $this->assertStringContainsString('Conversation history could not be loaded.', $source);
        $this->assertStringContainsString('{activeContext}', $source);
        $this->assertStringContainsString('tenantContext.companyName', $source);
        $this->assertStringContainsString('branch.current_fiscal_year', $source);
        $this->assertStringContainsString('Date range:', $source);
        $this->assertStringContainsString('financialTools: Boolean(health?.financial_tools_available)', $source);
        $this->assertStringContainsString('writeProposals: Boolean(health?.write_proposals_available)', $source);
        $this->assertStringNotContainsString('broader assistant is paused', $source);
        $this->assertStringNotContainsString('Context · Auto', $source);
        $this->assertStringNotContainsString('timeout: 90000', $source);
        $this->assertStringNotContainsString('message.provider', $source);
        $this->assertStringNotContainsString('message.model', $source);
    }
}
