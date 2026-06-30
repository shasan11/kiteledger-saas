<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class AiAssistantUiContractTest extends TestCase
{
    public function test_assistant_uses_production_empty_loading_and_placeholder_copy(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/App/AI/Assistant.jsx');

        $this->assertStringContainsString('Ask anything about your business data or how to use KiteLedger.', $source);
        $this->assertStringContainsString('Searching your data and preparing an answer...', $source);
        $this->assertStringContainsString('Ask about invoices, reports, customers, inventory, settings, or how to use KiteLedger...', $source);
        $this->assertStringNotContainsString('broader assistant is paused', $source);
        $this->assertStringNotContainsString('message.provider', $source);
        $this->assertStringNotContainsString('message.model', $source);
    }
}
