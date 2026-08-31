<?php

namespace Tests\Unit;

use PHPUnit\Framework\TestCase;

class CentralAiControlCenterContractTest extends TestCase
{
    public function test_central_ai_settings_exposes_live_readiness_and_safe_reindex_action(): void
    {
        $source = file_get_contents(dirname(__DIR__, 2).'/resources/js/Pages/Central/Settings/Index.jsx');
        $controller = file_get_contents(dirname(__DIR__, 2).'/app/Http/Controllers/Central/SettingsController.php');

        $this->assertStringContainsString('AI readiness control center', $source);
        $this->assertStringContainsString('Connection verified', $source);
        $this->assertStringContainsString('RAG index', $source);
        $this->assertStringContainsString('Queue worker', $source);
        $this->assertStringContainsString('Re-index tenant knowledge', $source);
        $this->assertStringContainsString("Artisan::call('ai:index-tenants', ['--queue' => true])", $controller);
        $this->assertStringContainsString("['queue_configured']", $controller);
        $this->assertStringContainsString("['queue_worker_healthy']", $controller);
    }
}
